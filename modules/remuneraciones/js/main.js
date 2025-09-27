/**
 * Módulo de Remuneraciones - Lógica Principal
 * 
 * Este archivo contiene la lógica principal del módulo de remuneraciones,
 * incluyendo la navegación, gestión de vistas y comunicación con la API.
 */

// Configuración de la API
const API_BASE_URL = '/api/remuneraciones';
const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

// Estado global de la aplicación
const appState = {
    currentView: 'inicio',
    empleados: [],
    liquidaciones: [],
    conceptos: {
        haberes: [],
        descuentos: []
    },
    configuracion: {}
};

// Inicialización de la aplicación
// El manejador de eventos se ha movido al final del archivo para evitar duplicación

// Cargar datos iniciales necesarios
async function cargarDatosIniciales() {
    console.log('Cargando datos iniciales...');
    
    // Inicializar el estado de la aplicación si no existe
    if (!window.appState) {
        window.appState = {
            empleados: [],
            conceptos: [],
            configuracion: {}
        };
    }
    
    // Verificar si ya hay datos en localStorage
    const hayDatos = localStorage.getItem('empleados') && localStorage.getItem('conceptos');
    
    // Si no hay datos, cargar datos de ejemplo
    if (!hayDatos) {
        console.log('No se encontraron datos existentes. Cargando datos de ejemplo...');
        await inicializarDatosEjemplo();
    }
    
    // Inicializar la base de datos si no está lista
    if (!db) {
        try {
            await initDB();
        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            mostrarError('Error', 'No se pudo inicializar la base de datos local');
            return;
        }
    }
    
    // Cargar empleados desde localStorage
    try {
        const empleados = JSON.parse(localStorage.getItem('empleados') || '[]');
        console.log(`${empleados.length} empleados cargados`);
        appState.empleados = empleados;
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        appState.empleados = [];
    }
    
    // Cargar conceptos desde localStorage
    try {
        const conceptos = JSON.parse(localStorage.getItem('conceptos') || '[]');
        console.log(`${conceptos.length} conceptos cargados`);
        appState.conceptos = conceptos;
    } catch (error) {
        console.error('Error al cargar conceptos:', error);
        appState.conceptos = [];
    }
    
    // Cargar configuración desde IndexedDB
    try {
        const config = await obtenerConfiguracionDB('general');
        if (config) {
            console.log('Configuración cargada');
            appState.configuracion = config;
        } else {
            console.log('No hay configuración guardada');
            appState.configuracion = {};
        }
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        appState.configuracion = {};
    }
    
    console.log('Datos iniciales cargados correctamente');
    return appState;
}

// Verificar si el elemento main-content existe
function verificarEstructuraDOM() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Error crítico: No se encontró el elemento con ID "main-content" en el DOM');
        
        // Intentar mostrar un mensaje de error en el body
        document.body.innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Error en la estructura de la aplicación</h4>
                    <p>No se pudo encontrar el contenedor principal de la aplicación.</p>
                    <hr>
                    <p class="mb-0">Por favor, recarga la página o contacta al administrador.</p>
                </div>
            </div>
        `;
        
        return false;
    }
    return true;
}

// Manejar la navegación
function initNavigation() {
    console.log('[initNavigation] Inicializando navegación');
    
    // Verificar la estructura del DOM antes de continuar
    if (!verificarEstructuraDOM()) {
        return; // Detener la ejecución si hay un error en la estructura del DOM
    }
    
    // Manejar clics en enlaces de navegación
    document.addEventListener('click', async (e) => {
        const navLink = e.target.closest('[data-view]');
        if (navLink) {
            e.preventDefault();
            const viewName = navLink.getAttribute('data-view');
            
            if (viewName) {
                console.log(`[initNavigation] Navegando a vista: ${viewName}`);
                
                try {
                    // Actualizar clase activa en los enlaces de navegación
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.toggle('active', link === navLink);
                    });
                    
                    // Actualizar el título de la página
                    document.title = `Remuneraciones - ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;
                    
                    // Cargar la vista
                    await loadView(viewName);
                    console.log(`[initNavigation] Navegación a ${viewName} completada`);
                } catch (error) {
                    console.error('[initNavigation] Error al cargar la vista:', error);
                    mostrarError('Error', `No se pudo cargar la vista: ${viewName}`);
                }
            }
        }
    });
    
    // Manejar clic en el botón de inicio
    const homeButton = document.querySelector('.navbar-brand');
    if (homeButton) {
        homeButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[initNavigation] Botón de inicio clickeado');
            loadView('inicio').catch(error => {
                console.error('[initNavigation] Error al cargar la vista de inicio:', error);
            });
        });
    }
    
    console.log('[initNavigation] Navegación inicializada, cargando vista de inicio');
    
    // Cargar la vista inicial
    loadView('inicio').catch(error => {
        console.error('[initNavigation] Error al cargar la vista inicial:', error);
        
        // Mostrar un mensaje de error en el contenedor principal si es posible
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <h4 class="alert-heading">Error al cargar la aplicación</h4>
                    <p>No se pudo cargar la vista inicial.</p>
                    <hr>
                    <p class="mb-0">Por favor, recarga la página o contacta al administrador.</p>
                </div>
            `;
        }
    });
}

// Cargar la vista correspondiente
async function loadView(viewName) {
    try {
        console.log(`[loadView] Iniciando carga de vista: ${viewName}`);
        appState.currentView = viewName;
        
        // Obtener el contenedor principal
        const mainContent = document.getElementById('main-content');
        
        // Verificar si el elemento existe
        if (!mainContent) {
            const errorMsg = 'No se encontró el elemento con ID "main-content" en el DOM';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log('[loadView] Elemento main-content encontrado');
        
        // Mostrar indicador de carga
        try {
            mainContent.innerHTML = `
                <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <span class="ms-3">Cargando ${viewName}...</span>
                </div>
            `;
            console.log('[loadView] Indicador de carga mostrado');
        } catch (innerError) {
            console.error('[loadView] Error al mostrar indicador de carga:', innerError);
            throw innerError;
        }
        
        // Cargar el contenido de la vista
        console.log(`[loadView] Obteniendo contenido para la vista: ${viewName}`);
        const viewContent = await getViewContent(viewName);
        
        if (!viewContent) {
            throw new Error(`No se pudo cargar el contenido para la vista: ${viewName}`);
        }
        
        console.log('[loadView] Contenido de la vista obtenido, actualizando el DOM');
        mainContent.innerHTML = viewContent;
        
        // Inicializar componentes específicos de la vista
        console.log(`[loadView] Inicializando componentes para: ${viewName}`);
        await initViewComponents(viewName);
        
        console.log(`[loadView] Vista ${viewName} cargada exitosamente`);
        
    } catch (error) {
        const errorMsg = `Error al cargar la vista ${viewName}: ${error.message}`;
        console.error(`[loadView] ${errorMsg}`, error);
        
        // Mostrar mensaje de error en la interfaz si es posible
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <h4 class="alert-heading">Error al cargar la vista</h4>
                    <p>${error.message}</p>
                    <hr>
                    <p class="mb-0">Por favor, recarga la página o contacta al administrador.</p>
                </div>
            `;
        }
        
        // Lanzar el error nuevamente para que pueda ser manejado por el código que llamó a esta función
        throw error;
    }
}

// Manejador de acciones
function handleAction(action, element) {
    console.log(`Acción: ${action}`, element);
    
    switch (action) {
        case 'nuevo-empleado':
            mostrarFormularioEmpleado();
            break;
            
        case 'editar-empleado':
            const empleadoId = element.dataset.id;
            editarEmpleado(empleadoId);
            break;
            
        case 'eliminar-empleado':
            const idEliminar = element.dataset.id;
            confirmarEliminacion('empleado', idEliminar);
            break;
            
        case 'nueva-liquidacion':
            mostrarFormularioLiquidacion();
            break;
            
        // Agregar más acciones según sea necesario
    }
}


// Inicializar componentes específicos de cada vista
async function initViewComponents(viewName) {
    try {
        switch(viewName) {
            case 'empleados':
                await initVistaEmpleados();
                break;
                
            case 'liquidaciones':
                await initVistaLiquidaciones();
                break;
                
            case 'reportes':
                await initVistaReportes();
                break;
                
            case 'configuracion':
                await initVistaConfiguracion();
                break;
        }
        
        // Inicializar componentes comunes
        initComponentesComunes();
        
    } catch (error) {
        console.error(`Error al inicializar componentes de ${viewName}:`, error);
        throw error;
    }
}

// Inicializar componentes comunes
function initComponentesComunes() {
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Inicializar popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

// ====================================
// Gestión de Empleados
// ====================================

// Inicializar vista de empleados
async function initVistaEmpleados() {
    try {
        // Configurar DataTable para empleados
        if ($.fn.DataTable.isDataTable('#tablaEmpleados')) {
            $('#tablaEmpleados').DataTable().destroy();
        }
        
        const tablaEmpleados = $('#tablaEmpleados').DataTable({
            data: appState.empleados,
            columns: [
                { data: 'id' },
                { 
                    data: null,
                    render: function(data) {
                        return `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim();
                    }
                },
                { data: 'rut' },
                { data: 'cargo' },
                { data: 'departamento' },
                { 
                    data: 'estado',
                    render: function(data) {
                        const estados = {
                            'activo': 'success',
                            'inactivo': 'secondary',
                            'licencia': 'info',
                            'suspendido': 'warning'
                        };
                        return `<span class="badge bg-${estados[data] || 'secondary'}">${data.charAt(0).toUpperCase() + data.slice(1)}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    render: function(data) {
                        return `
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-sm btn-outline-primary" 
                                        data-action="editar-empleado" 
                                        data-id="${data.id}"
                                        data-bs-toggle="tooltip" 
                                        title="Editar empleado">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" 
                                        data-action="eliminar-empleado" 
                                        data-id="${data.id}"
                                        data-bs-toggle="tooltip" 
                                        title="Eliminar empleado">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            language: {
                url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json'
            },
            responsive: true,
            order: [[1, 'asc']]
        });
        
        // Configurar botón de nuevo empleado
        document.getElementById('nuevo-empleado')?.addEventListener('click', () => {
            mostrarFormularioEmpleado();
        });
        
    } catch (error) {
        console.error('Error al inicializar vista de empleados:', error);
        throw error;
    }
}

// Mostrar formulario de empleado
function mostrarFormularioEmpleado(empleadoId = null) {
    const mainContent = document.getElementById('main-content');
    const esNuevo = empleadoId === null;
    
    if (!mainContent) {
        console.error('No se encontró el contenedor principal');
        mostrarError('Error', 'No se pudo cargar el formulario');
        return;
    }
    
    // Mostrar indicador de carga
    mainContent.innerHTML = `
        <div class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando formulario de empleado...</p>
        </div>
    `;
    
    // Cargar plantilla del formulario
    fetch('/remus/views/empleados/formulario.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            mainContent.innerHTML = html;
            
            // Configurar título del formulario
            document.getElementById('form-titulo').textContent = 
                esNuevo ? 'Nuevo Empleado' : 'Editar Empleado';
            
            // Si es edición, cargar datos del empleado
            if (!esNuevo) {
                cargarDatosEmpleado(empleadoId);
            } else {
                // Configurar valores por defecto para nuevo empleado
                const hoy = new Date().toISOString().split('T')[0];
                document.getElementById('fecha-ingreso').value = hoy;
                document.getElementById('estado').value = 'Activo';
            }
            
            // Configurar eventos del formulario
            configurarEventosFormularioEmpleado();
            
            // Enfocar el primer campo
            const primerCampo = document.querySelector('form#form-empleado input:not([type="hidden"]), form#form-empleado select');
            if (primerCampo) primerCampo.focus();
            
        })
        .catch(error => {
            console.error('Error al cargar el formulario de empleado:', error);
            
            // Mostrar mensaje de error en la interfaz
            mainContent.innerHTML = `
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Error al cargar el formulario</h4>
                    <p>No se pudo cargar el formulario de empleado. Por favor, intente nuevamente.</p>
                    <hr>
                    <p class="mb-0">Detalles: ${error.message || 'Error desconocido'}</p>
                </div>
                <button class="btn btn-secondary mt-3" onclick="loadView('empleados')">
                    <i class="fas fa-arrow-left me-1"></i> Volver a la lista
                </button>
            `;
        });
}

// Cargar datos de un empleado en el formulario
async function cargarDatosEmpleado(empleadoId) {
    const form = document.getElementById('form-empleado');
    
    if (!form) {
        console.error('No se encontró el formulario de empleado');
        mostrarError('Error', 'No se pudo cargar la información del empleado');
        return;
    }
    
    try {
        // Mostrar indicador de carga
        const campos = form.querySelectorAll('input, select, textarea');
        campos.forEach(campo => {
            campo.disabled = true;
            campo.classList.add('bg-light');
        });
        
        // Obtener empleados de localStorage
        const empleadosData = localStorage.getItem('empleados');
        if (!empleadosData) {
            throw new Error('No se encontraron datos de empleados');
        }
        
        const empleados = JSON.parse(empleadosData);
        const empleado = empleados.find(e => e.id == empleadoId);
        
        if (!empleado) {
            throw new Error('No se encontró el empleado solicitado');
        }
        
        console.log('Datos del empleado cargados:', empleado);
        
        // Función para validar RUT chileno
function validarRut(rutCompleto) {
    if (!rutCompleto || typeof rutCompleto !== 'string') {
        return false;
    }
    
    // Limpiar y formatear RUT
    rutCompleto = rutCompleto.replace(/[^0-9kK-]/g, '');
    
    // Validar formato básico
    if (!/^\d{1,3}(?:\.?\d{3}){1,2}-[\dkK]$/i.test(rutCompleto)) {
        return false;
    }
    
    // Separar número y dígito verificador
    const [rut, dv] = rutCompleto.split('-');
    const rutLimpio = rut.replace(/\./g, '');
    
    // Validar que el RUT tenga entre 7 y 8 dígitos
    if (rutLimpio.length < 7 || rutLimpio.length > 8) {
        return false;
    }
    
    // Calcular dígito verificador esperado
    let suma = 0;
    let multiplicador = 2;
    
    // Recorrer el RUT de derecha a izquierda
    for (let i = rutLimpio.length - 1; i >= 0; i--) {
        suma += parseInt(rutLimpio.charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    let dvEsperado = 11 - resto;
    
    if (dvEsperado === 11) dvEsperado = '0';
    else if (dvEsperado === 10) dvEsperado = 'K';
    else dvEsperado = dvEsperado.toString();
    
    // Comparar con el dígito verificador ingresado
    return dv.toUpperCase() === dvEsperado;
}

// Función para formatear fechas (si es necesario)
const formatearFecha = (fecha) => {
            if (!fecha) return '';
            // Si la fecha ya está en formato YYYY-MM-DD, devolverla tal cual
            if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
            
            try {
                // Intentar convertir de formato de fecha a YYYY-MM-DD
                return new Date(fecha).toISOString().split('T')[0];
            } catch (e) {
                console.warn('No se pudo formatear la fecha:', fecha, e);
                return '';
            }
        };
        
        // Rellenar formulario con los datos del empleado
        document.getElementById('empleado-id').value = empleado.id || '';
        document.getElementById('rut').value = empleado.rut || '';
        document.getElementById('nombres').value = empleado.nombres || '';
        document.getElementById('apellidos').value = empleado.apellidos || '';
        document.getElementById('email').value = empleado.email || '';
        document.getElementById('fecha-nacimiento').value = formatearFecha(empleado.fechaNacimiento);
        document.getElementById('fecha-ingreso').value = formatearFecha(empleado.fechaIngreso);
        document.getElementById('direccion').value = empleado.direccion || '';
        document.getElementById('telefono').value = empleado.telefono || '';
        document.getElementById('genero').value = empleado.genero || '';
        document.getElementById('estado-civil').value = empleado.estadoCivil || '';
        document.getElementById('nacionalidad').value = empleado.nacionalidad || '';
        document.getElementById('cargo').value = empleado.cargo || '';
        document.getElementById('departamento').value = empleado.departamento || '';
        document.getElementById('tipo-contrato').value = empleado.tipoContrato || '';
        document.getElementById('sueldo-base').value = empleado.sueldoBase || '';
        document.getElementById('afp').value = empleado.afp || '';
        document.getElementById('salud').value = empleado.salud || '';
        document.getElementById('estado').value = empleado.estado || 'Activo';
        
        // Habilitar campos nuevamente
        campos.forEach(campo => {
            campo.disabled = false;
            campo.classList.remove('bg-light');
        });
        
        // Enfocar el primer campo
        const primerCampo = form.querySelector('input:not([type="hidden"]), select');
        if (primerCampo) primerCampo.focus();
        
    } catch (error) {
        console.error('Error al cargar datos del empleado:', error);
        
        // Mostrar mensaje de error y botón para volver
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Error al cargar el empleado</h4>
                    <p>${error.message || 'No se pudieron cargar los datos del empleado'}</p>
                    <hr>
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-secondary" onclick="mostrarFormularioEmpleado('${empleadoId}')">
                            <i class="fas fa-sync-alt me-1"></i> Reintentar
                        </button>
                        <button class="btn btn-outline-secondary" onclick="loadView('empleados')">
                            <i class="fas fa-arrow-left me-1"></i> Volver a la lista
                        </button>
                    </div>
                </div>
            `;
        } else {
            mostrarError('Error', 'No se pudieron cargar los datos del empleado');
        }
    }
}

// Configurar eventos del formulario de empleado
function configurarEventosFormularioEmpleado() {
    const form = document.getElementById('form-empleado');
    if (!form) {
        console.error('No se encontró el formulario de empleado');
        return;
    }
    
    // Configurar validación de RUT chileno
    const rutInput = form.querySelector('#rut');
    if (rutInput) {
        // Validar al perder el foco
        rutInput.addEventListener('blur', function() {
            validarRutCampo(this);
        });
        
        // Formatear automáticamente mientras se escribe
        rutInput.addEventListener('input', function(e) {
            // Obtener posición del cursor
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            // Limpiar y formatear RUT
            let rut = this.value.replace(/[^0-9kK]/g, '').toUpperCase();
            let rutFormateado = '';
            
            if (rut.length > 1) {
                const cuerpo = rut.slice(0, -1);
                const dv = rut.slice(-1);
                rutFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
            } else if (rut.length === 1) {
                rutFormateado = rut;
            }
            
            // Actualizar valor solo si cambió
            if (this.value !== rutFormateado) {
                this.value = rutFormateado;
                
                // Restaurar posición del cursor
                const desplazamiento = rutFormateado.length - this.value.length;
                this.setSelectionRange(start + desplazamiento, end + desplazamiento);
            }
        });
    }
    
    // Validar email
    const emailInput = form.querySelector('#email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            if (this.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) {
                this.setCustomValidity('Por favor ingresa un correo electrónico válido');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Validar fechas
    const fechaNacimiento = form.querySelector('#fecha-nacimiento');
    const fechaIngreso = form.querySelector('#fecha-ingreso');
    
    if (fechaNacimiento && fechaIngreso) {
        const validarFechas = () => {
            const fechaNac = new Date(fechaNacimiento.value);
            const fechaIng = new Date(fechaIngreso.value);
            
            if (fechaNac && fechaIng && fechaNac > fechaIng) {
                fechaNacimiento.setCustomValidity('La fecha de nacimiento debe ser anterior a la fecha de ingreso');
            } else {
                fechaNacimiento.setCustomValidity('');
            }
        };
        
        fechaNacimiento.addEventListener('change', validarFechas);
        fechaIngreso.addEventListener('change', validarFechas);
    }
    
    // Validar número de teléfono
    const telefonoInput = form.querySelector('#telefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9+\s-]/g, '');
        });
    }
    
    // Validar sueldo
    const sueldoInput = form.querySelector('#sueldo-base');
    if (sueldoInput) {
        sueldoInput.addEventListener('input', function() {
            // Permitir solo números y un punto decimal
            this.value = this.value.replace(/[^0-9.]/g, '')
                .replace(/(\..*)\./g, '$1')  // Solo un punto decimal
                .replace(/^(\d+\.\d{0,2}).*$/, '$1');  // Máximo 2 decimales
                
            // Validar que sea un número positivo
            if (this.value && parseFloat(this.value) < 0) {
                this.value = '';
            }
        });
    }
    
    // Manejar envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Validar RUT si está presente
        if (rutInput && rutInput.value) {
            validarRutCampo(rutInput);
        }
        
        if (this.checkValidity()) {
            // Deshabilitar botones para evitar múltiples envíos
            const submitButton = this.querySelector('button[type="submit"]');
            const cancelButton = this.querySelector('button[type="button"]');
            
            if (submitButton) submitButton.disabled = true;
            if (cancelButton) cancelButton.disabled = true;
            
            // Mostrar indicador de carga
            const originalSubmitText = submitButton ? submitButton.innerHTML : '';
            if (submitButton) {
                submitButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Procesando...
                `;
            }
            
            // Guardar empleado
            guardarEmpleado()
                .catch(error => {
                    console.error('Error al guardar empleado:', error);
                    
                    // Restaurar botones en caso de error
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalSubmitText;
                    }
                    if (cancelButton) cancelButton.disabled = false;
                });
        } else {
            // Mostrar mensajes de validación
            this.classList.add('was-validated');
            
            // Desplazarse al primer campo con error
            const primerError = this.querySelector(':invalid');
            if (primerError) {
                primerError.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                primerError.focus();
            }
        }
    });
    
    // Botón cancelar
    const btnCancelar = form.querySelector('button[type="button"]');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            if (!form.checkValidity() && 
                !confirm('¿Estás seguro de que deseas cancelar? Los cambios no guardados se perderán.')) {
                return;
            }
            
            // Volver a la lista de empleados
            loadView('empleados');
        });
    }
    
    // Función para validar RUT chileno
    function validarRutCampo(input) {
        if (!input || !input.value) {
            input.setCustomValidity('');
            return true;
        }
        
        const esValido = validarRut(input.value);
        input.setCustomValidity(esValido ? '' : 'El RUT ingresado no es válido');
        
        // Actualizar clases de validación visual
        if (esValido) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }
        
        return esValido;
    }
}

// Guardar empleado (crear o actualizar)
async function guardarEmpleado() {
    const form = document.getElementById('form-empleado');
    if (!form) {
        console.error('No se encontró el formulario de empleado');
        mostrarError('Error', 'No se pudo procesar la solicitud');
        return;
    }

    // Validar formulario
    if (!form.checkValidity()) {
        form.classList.add('was-validated');

        // Enfocar el primer campo con error
        const primerError = form.querySelector(':invalid');
        if (primerError) {
            primerError.focus();

            // Desplazarse suavemente al campo con error
            primerError.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }

        return;
    }

    const empleadoId = document.getElementById('empleado-id').value;
    const esNuevo = !empleadoId;
    const btnGuardar = form.querySelector('button[type="submit"]');

    // Mostrar indicador de carga
    const btnText = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        ${esNuevo ? 'Creando' : 'Actualizando'} empleado...
    `;

    try {
        // Obtener datos del formulario
        const formData = new FormData(form);
        const empleadoData = {
            id: empleadoId || Date.now().toString(), // Usar timestamp como ID
            rut: formData.get('rut') || '',
            nombres: formData.get('nombres') || '',
            apellidos: formData.get('apellidos') || '',
            email: formData.get('email') || '',
            fechaNacimiento: formData.get('fecha-nacimiento') || null,
            fechaIngreso: formData.get('fecha-ingreso') || new Date().toISOString().split('T')[0],
            direccion: formData.get('direccion') || '',
            telefono: formData.get('telefono') || '',
            genero: formData.get('genero') || '',
            estadoCivil: formData.get('estado-civil') || '',
            nacionalidad: formData.get('nacionalidad') || '',
            cargo: formData.get('cargo') || '',
            departamento: formData.get('departamento') || '',
            tipoContrato: formData.get('tipo-contrato') || '',
            sueldoBase: parseFloat(formData.get('sueldo-base')) || 0,
            afp: formData.get('afp') || '',
            salud: formData.get('salud') || '',
            estado: formData.get('estado') || 'Activo',
            fechaCreacion: esNuevo ? new Date().toISOString() : null,
            fechaActualizacion: new Date().toISOString()
        };

        console.log('Datos del empleado a guardar:', empleadoData);

        // Obtener empleados actuales
        const empleadosData = localStorage.getItem('empleados');
        let empleados = [];

        if (empleadosData) {
            try {
                empleados = JSON.parse(empleadosData);
                if (!Array.isArray(empleados)) {
                    throw new Error('Formato de datos inválido');
                }
            } catch (e) {
                console.error('Error al analizar datos de empleados:', e);
                empleados = [];
            }
        }

        // Actualizar o agregar el empleado
        if (esNuevo) {
            // Verificar si ya existe un empleado con el mismo RUT
            const rutExistente = empleados.some(e => 
                e.rut && e.rut === empleadoData.rut && e.id !== empleadoData.id
            );

            if (rutExistente) {
                throw new Error('Ya existe un empleado con el mismo RUT');
            }

            empleados.push(empleadoData);
        } else {
            const index = empleados.findIndex(e => e.id == empleadoId);
            if (index !== -1) {
                // Mantener la fecha de creación original
                empleadoData.fechaCreacion = empleados[index].fechaCreacion || new Date().toISOString();
                empleados[index] = empleadoData;
            } else {
                // Si no se encuentra, agregar como nuevo
                empleadoData.fechaCreacion = empleadoData.fechaCreacion || new Date().toISOString();
                empleados.push(empleadoData);
            }
        }

        // Guardar en localStorage
        localStorage.setItem('empleados', JSON.stringify(empleados));

        // Actualizar el estado de la aplicación
        if (window.appState) {
            window.appState.empleados = [...empleados];
        }

        console.log('Empleado guardado exitosamente:', empleadoData);

        // Mostrar mensaje de éxito
        mostrarMensaje(
            '¡Éxito!', 
            `Empleado ${esNuevo ? 'creado' : 'actualizado'} correctamente`,
            'success'
        );

        // Redirigir a la lista después de un breve retraso
        setTimeout(() => {
            loadView('empleados');
        }, 1500);

    } catch (error) {
        console.error('Error al guardar empleado:', error);

        // Mostrar mensaje de error con opción de reintentar
        Swal.fire({
            title: 'Error',
            text: `No se pudo ${esNuevo ? 'crear' : 'actualizar'} el empleado: ${error.message || 'Error desconocido'}`,
            icon: 'error',
            confirmButtonText: 'Reintentar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                // Reintentar guardar
                guardarEmpleado();
            }
        });
    } finally {
        // Restaurar botón
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = btnText;
        }
    }
}

// Función para obtener todos los empleados
function getEmpleados() {
    const datos = obtenerDatos();
    return datos ? datos.empleados || [] : [];
}

// Función para obtener un empleado por ID
function getEmpleadoPorId(id) {
    const empleados = getEmpleados();
    return empleados.find(e => e.id == id) || null;
}

// Confirmar eliminación de empleado
function confirmarEliminacion(tipo, id) {
    if (tipo !== 'empleado') return;
    
    Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarEmpleado(id);
        }
    });
}

// Eliminar un empleado
function eliminarEmpleado(id) {
    try {
        // Obtener empleados actuales
        const empleadosData = localStorage.getItem('empleados');
        const empleados = empleadosData ? JSON.parse(empleadosData) : [];
        
        // Filtrar el empleado a eliminar
        const empleadosActualizados = empleados.filter(e => e.id != id);
        
        if (empleadosActualizados.length === empleados.length) {
            throw new Error('Empleado no encontrado');
        }
        
        // Guardar los cambios
        localStorage.setItem('empleados', JSON.stringify(empleadosActualizados));
        
        // Actualizar el estado de la aplicación
        if (window.appState) {
            window.appState.empleados = [...empleadosActualizados];
        }
        
        // Mostrar mensaje de éxito
        mostrarMensaje('¡Eliminado!', 'El empleado ha sido eliminado correctamente', 'success');
        
        // Recargar la vista de empleados
        loadView('empleados');
        
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        mostrarError('Error', 'No se pudo eliminar el empleado: ' + (error.message || 'Error desconocido'));
    }
}

// Inicializar vista de empleados
function initVistaEmpleados() {
    console.log('Inicializando vista de empleados...');
    
    try {
        // Obtener contenedor de empleados
        const empleadosContainer = document.getElementById('empleados-container');
        if (!empleadosContainer) {
            console.error('No se encontró el contenedor de empleados');
            return;
        }
        
        // Mostrar indicador de carga
        empleadosContainer.innerHTML = `
            <div class="text-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando empleados...</p>
            </div>
        `;
        
        // Obtener empleados de localStorage
        let empleados = [];
        try {
            const empleadosData = localStorage.getItem('empleados');
            empleados = empleadosData ? JSON.parse(empleadosData) : [];
        } catch (error) {
            console.error('Error al leer empleados de localStorage:', error);
            throw new Error('No se pudieron cargar los datos de empleados');
        }
        
        // Pequeño retraso para mejor experiencia de usuario
        setTimeout(() => {
            try {
                if (!empleados || empleados.length === 0) {
                    empleadosContainer.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No hay empleados registrados. 
                            <a href="#" class="alert-link" onclick="mostrarFormularioEmpleado()">
                                Agregar empleado
                            </a>
                        </div>
                    `;
                    return;
                }
                
                // Generar tabla de empleados
                let tablaHTML = `
                    <div class="card shadow mb-4">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">Listado de Empleados</h6>
                            <button class="btn btn-primary btn-sm" onclick="mostrarFormularioEmpleado()">
                                <i class="fas fa-plus me-1"></i> Nuevo Empleado
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="tabla-empleados" width="100%" cellspacing="0">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre</th>
                                            <th>RUT</th>
                                            <th>Email</th>
                                            <th>Cargo</th>
                                            <th>Sueldo Base</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;
                
                // Agregar filas de empleados
                empleados.forEach(empleado => {
                    // Asegurarse de que el empleado tenga un ID
                    if (!empleado.id) {
                        console.warn('Empleado sin ID encontrado:', empleado);
                        return;
                    }
                    
                    const sueldoBase = empleado.sueldoBase ? 
                        formatCurrency(parseInt(empleado.sueldoBase)) : 
                        formatCurrency(0);
                        
                    // Escapar comillas en los datos para evitar problemas con HTML
                    const escapeHtml = (str) => {
                        if (!str) return '-';
                        return String(str)
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                    };
                    
                    const nombre = escapeHtml(empleado.nombre);
                    const rut = escapeHtml(empleado.rut);
                    const email = escapeHtml(empleado.email);
                    const cargo = escapeHtml(empleado.cargo);
                    const estado = escapeHtml(empleado.estado || 'Inactivo');
                    
                    tablaHTML += `
                        <tr>
                            <td>${empleado.id}</td>
                            <td>${nombre}</td>
                            <td>${rut}</td>
                            <td>${email}</td>
                            <td>${cargo}</td>
                            <td class="text-end">${sueldoBase}</td>
                            <td>
                                <span class="badge ${estado === 'Activo' ? 'bg-success' : 'bg-secondary'}">
                                    ${estado}
                                </span>
                            </td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-primary" title="Editar" 
                                    onclick="mostrarFormularioEmpleado('${empleado.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" title="Eliminar"
                                    onclick="confirmarEliminacion('empleado', '${empleado.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                tablaHTML += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                
                empleadosContainer.innerHTML = tablaHTML;
                
                // Inicializar DataTable si está disponible
                if (typeof $.fn.DataTable !== 'undefined') {
                    if ($.fn.DataTable.isDataTable('#tabla-empleados')) {
                        $('#tabla-empleados').DataTable().destroy();
                    }
                    
                    const dataTable = $('#tabla-empleados').DataTable({
                        language: {
                            url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
                        },
                        order: [[0, 'desc']],
                        responsive: true,
                        initComplete: function() {
                            // Agregar clase a los inputs de búsqueda
                            $('.dataTables_filter input')
                                .addClass('form-control form-control-sm')
                                .attr('placeholder', 'Buscar...');
                                
                            // Agregar clases a los select de paginación
                            $('.dataTables_length select')
                                .addClass('form-select form-select-sm');
                        }
                    });
                    
                    // Asegurarse de que la tabla se redimensione correctamente
                    $(window).on('resize', function() {
                        dataTable.columns.adjust().responsive.recalc();
                    });
                }
                
            } catch (error) {
                console.error('Error al cargar empleados:', error);
                const errorMessage = error && error.message ? error.message : 'Error desconocido';
                empleadosContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error al cargar la lista de empleados: ${errorMessage}
                    </div>
                `;
            }
        }, 300); // Reducido el tiempo de espera
        
        document.getElementById('nueva-liquidacion')?.addEventListener('click', () => {
            mostrarFormularioLiquidacion();
        });
        
        // Manejar clics en los botones de acción
        $('#tablaLiquidaciones tbody').on('click', '[data-action]', function() {
            const action = this.dataset.action;
            const id = parseInt(this.dataset.id);
            
            if (action === 'editar-liquidacion') {
                mostrarFormularioLiquidacion(id);
            } else if (action === 'eliminar-liquidacion') {
                confirmarEliminacionLiquidacion(id);
            } else if (action === 'ver-liquidacion') {
                verDetalleLiquidacion(id);
            }
        });
        
        // Inicializar tooltips
        $('[title]').tooltip();
        
    } catch (error) {
        console.error('Error al inicializar vista de liquidaciones:', error);
        mostrarError('Error', 'No se pudo cargar el listado de liquidaciones');
    }
}

// Mostrar formulario de liquidación
async function mostrarFormularioLiquidacion(id = null) {
    try {
        const mainContent = document.getElementById('main-content');
        const response = await fetch('/remus/views/liquidaciones/formulario.html');
        const html = await response.text();
        mainContent.innerHTML = html;
        
        // Configurar fecha actual como valor por defecto
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fecha-pago').value = hoy;
        
        // Configurar mes actual como período por defecto
        const mesActual = new Date().toISOString().slice(0, 7);
        document.getElementById('periodo').value = mesActual;
        
        // Configurar eventos del formulario
        document.getElementById('form-liquidacion').addEventListener('submit', (e) => {
            e.preventDefault();
            guardarLiquidacion(id);
        });
        
        // Botón cancelar
        document.getElementById('cancelar-liquidacion').addEventListener('click', () => {
            loadView('liquidaciones');
        });
        
        // Si es edición, cargar datos
        if (id) {
            await cargarDatosLiquidacion(id);
        }
        
    } catch (error) {
        console.error('Error al cargar el formulario de liquidación:', error);
        mostrarError('Error', 'No se pudo cargar el formulario de liquidación');
    }
}

// Obtener una liquidación por ID desde IndexedDB
async function obtenerLiquidacionDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['liquidaciones'], 'readonly');
        const store = transaction.objectStore('liquidaciones');
        const request = store.get(parseInt(id));
        
        request.onsuccess = () => {
            if (!request.result) {
                reject(new Error('Liquidación no encontrada'));
                return;
            }
            resolve(request.result);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Cargar datos de una liquidación
async function cargarDatosLiquidacion(id) {
    try {
        const liquidacion = await obtenerLiquidacionDB(id);
        
        console.log('Datos de la liquidación cargados:', liquidacion);
        
        // Si no se encontró la liquidación, lanzar error
        if (!liquidacion) {
            throw new Error('No se encontró la liquidación solicitada');
        }
        
        // Cargar datos en el formulario
        document.getElementById('empleado').value = liquidacion.empleado || '';
        document.getElementById('periodo').value = liquidacion.periodo || '';
        document.getElementById('fecha-pago').value = liquidacion.fechaPago || '';
        document.getElementById('dias-trabajados').value = liquidacion.diasTrabajados || '';
        document.getElementById('estado').value = liquidacion.estado || 'borrador';
        
        // Actualizar tablas de detalle
        actualizarTablaDetalle('haberes', liquidacion.haberes || []);
        actualizarTablaDetalle('descuentos', liquidacion.descuentos || []);
        
        // Actualizar totales
        const totalHaberes = liquidacion.totalHaberes || 0;
        const totalDescuentos = liquidacion.totalDescuentos || 0;
        const liquido = liquidacion.liquido || 0;
        
        // Actualizar totales en la interfaz
        document.getElementById('total-haberes').textContent = formatCurrency(totalHaberes);
        document.getElementById('total-descuentos').textContent = formatCurrency(totalDescuentos);
        document.getElementById('liquido').textContent = formatCurrency(liquido);
        
        return liquidacion;
        
    } catch (error) {
        console.error('Error al cargar la liquidación:', error);
        mostrarError('Error', `No se pudieron cargar los datos de la liquidación: ${error.message}`);
        throw error;
    }
}

// Actualizar tabla de detalle (haberes o descuentos)
function actualizarTablaDetalle(tipo, items) {
    const tbody = document.querySelector(`#tabla-${tipo} tbody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" class="text-center">No hay ${tipo} registrados</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.concepto}</td>
            <td class="text-end">${formatCurrency(item.monto)}</td>
            <td class="text-center">
                <span class="badge bg-${item.tipo === 'imponible' || item.tipo === 'previsional' ? 'info' : 'secondary'}">
                    ${item.tipo}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Guardar liquidación
async function guardarLiquidacion(id = null) {
    const form = document.getElementById('form-liquidacion');
    const esNueva = id === null;
    let btnGuardar;
    let btnText;
    
    try {
        // Validar formulario
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        // Mostrar indicador de carga
        btnGuardar = document.getElementById('guardar-liquidacion');
        btnText = btnGuardar.innerHTML;
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Guardando...';
        
        // Obtener datos del formulario
        const liquidacionData = {
            id: id || undefined, // Si es nuevo, no incluir ID
            empleado: document.getElementById('empleado').value,
            periodo: document.getElementById('periodo').value,
            fechaPago: document.getElementById('fecha-pago').value,
            diasTrabajados: parseInt(document.getElementById('dias-trabajados').value),
            estado: document.getElementById('estado').value,
            haberes: [], // Agregaremos los haberes aquí
            descuentos: [], // Agregaremos los descuentos aquí
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString()
        };
        
        // Obtener haberes y descuentos del formulario
        // Nota: Asumiendo que tienes tablas con IDs 'tabla-haberes' y 'tabla-descuentos'
        // Deberás ajustar esto según tu implementación real
        const haberes = [];
        const descuentos = [];
        
        // Ejemplo de cómo podrías obtener los ítems de las tablas
        // document.querySelectorAll('#tabla-haberes tbody tr').forEach(row => {
        //     haberes.push({
        //         concepto: row.cells[0].textContent,
        //         monto: parseFloat(row.cells[1].textContent.replace(/[^0-9.-]+/g,"")),
        //         tipo: 'IMPOSIBLE' // o 'NO_IMPOSIBLE'
        //     });
        // });
        
        // document.querySelectorAll('#tabla-descuentos tbody tr').forEach(row => {
        //     descuentos.push({
        //         concepto: row.cells[0].textContent,
        //         monto: parseFloat(row.cells[1].textContent.replace(/[^0-9.-]+/g,"")),
        //         tipo: 'PREVISIONAL' // o 'NO_PREVISIONAL'
        //     });
        // });
        
        liquidacionData.haberes = haberes;
        liquidacionData.descuentos = descuentos;
        
        // Calcular totales
        liquidacionData.totalHaberes = haberes.reduce((sum, item) => sum + item.monto, 0);
        liquidacionData.totalDescuentos = descuentos.reduce((sum, item) => sum + item.monto, 0);
        liquidacionData.liquido = liquidacionData.totalHaberes - liquidacionData.totalDescuentos;
        
        // Guardar en IndexedDB
        const liquidacionId = await guardarLiquidacionDB(liquidacionData);
        
        mostrarMensaje('¡Éxito!', `Liquidación ${esNueva ? 'creada' : 'actualizada'} correctamente`, 'success');
        loadView('liquidaciones');
        
    } catch (error) {
        console.error('Error al guardar la liquidación:', error);
        mostrarError('Error', `No se pudo guardar la liquidación: ${error.message}`);
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = btnText;
        }
    }
}

// Confirmar eliminación de liquidación
function confirmarEliminacionLiquidacion(id) {
    // Usar SweetAlert2 para confirmación
    Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // En producción, esto haría una petición al servidor
                // const response = await fetch(`${API_BASE_URL}/liquidaciones/${id}`, {
                //     method: 'DELETE'
                // });
                // 
                // if (!response.ok) {
                //     throw new Error('Error al eliminar la liquidación');
                // }
                
                // Simular eliminación exitosa
                mostrarMensaje('¡Eliminada!', 'La liquidación ha sido eliminada', 'success');
                
                // Recargar la tabla
                initVistaLiquidaciones();
                
            } catch (error) {
                console.error('Error al eliminar la liquidación:', error);
                mostrarError('Error', 'No se pudo eliminar la liquidación');
            }
        }
    });
}

// Ver detalle de liquidación
function verDetalleLiquidacion(id) {
    // Por ahora, simplemente abrimos el formulario en modo solo lectura
    mostrarFormularioLiquidacion(id);
    
    // Deshabilitar todos los campos del formulario
    const form = document.getElementById('form-liquidacion');
    if (form) {
        const inputs = form.querySelectorAll('input, select, button, textarea');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        // Cambiar texto del botón guardar
        const btnGuardar = document.getElementById('guardar-liquidacion');
        if (btnGuardar) {
            btnGuardar.textContent = 'Volver';
            btnGuardar.disabled = false;
            btnGuardar.onclick = () => loadView('liquidaciones');
        }
    }
}

// La función mostrarFormularioLiquidacion está definida arriba (línea 677)

// ====================================
// IndexedDB - Base de Datos en el Navegador
// ====================================

const DB_NAME = 'remuneracionesDB';
const DB_VERSION = 1;
let db = null;

// Datos de ejemplo para poblar la base de datos
const datosEjemplo = {
    empleados: [
        {
            id: 1,
            rut: '12345678-9',
            nombre: 'Juan Pérez',
            email: 'juan.perez@empresa.com',
            cargo: 'Desarrollador',
            fechaIngreso: '2023-01-15',
            sueldoBase: 1500000,
            afp: 'Habitat',
            salud: 'Fonasa',
            tipoContrato: 'Indefinido',
            activo: true
        },
        {
            id: 2,
            rut: '18765432-1',
            nombre: 'María González',
            email: 'maria.gonzalez@empresa.com',
            cargo: 'Diseñadora UX',
            fechaIngreso: '2023-03-10',
            sueldoBase: 1600000,
            afp: 'Modelo',
            salud: 'Isapre Banmédica',
            tipoContrato: 'Plazo fijo',
            activo: true
        }
    ],
    conceptos: [
        { id: 1, codigo: 'HAB001', nombre: 'Sueldo Base', tipo: 'haber', imponible: true, tributable: true, valor: 0 },
        { id: 2, codigo: 'HAB002', nombre: 'Horas Extras', tipo: 'haber', imponible: true, tributable: true, valor: 0 },
        { id: 3, codigo: 'HAB003', nombre: 'Bono Asistencia', tipo: 'haber', imponible: true, tributable: true, valor: 50000 },
        { id: 4, codigo: 'DES001', nombre: 'AFP', tipo: 'descuento', imponible: false, tributable: false, valor: 0.1 },
        { id: 5, codigo: 'DES002', nombre: 'Salud', tipo: 'descuento', imponible: false, tributable: false, valor: 0.07 },
        { id: 6, codigo: 'DES003', nombre: 'Préstamo', tipo: 'descuento', imponible: false, tributable: false, valor: 100000 }
    ],
    configuracion: {
        tipo: 'general',
        empresa: {
            nombre: 'Mi Empresa S.A.',
            rut: '76.543.210-1',
            direccion: 'Av. Principal 1234, Santiago',
            telefono: '+56 2 2345 6789',
            email: 'contacto@miempresa.cl',
            actividad: 'Desarrollo de Software',
            fechaInicioActividades: '2020-01-01'
        },
        parametros: {
            afp: 0.1,
            salud: 0.07,
            seguroCesantia: 0.03,
            topeAfp: 85.0,
            uf: 35000,
            utm: 65000,
            sueldoMinimo: 500000
        }
    }
};

// Función para obtener los datos de la aplicación
function getDatos() {
    return {
        empleados: JSON.parse(localStorage.getItem('empleados') || '[]'),
        conceptos: JSON.parse(localStorage.getItem('conceptos') || '{"haberes": [], "descuentos": []}'),
        configuracion: JSON.parse(localStorage.getItem('configuracion') || JSON.stringify(datosEjemplo.configuracion))
    };
}

// Inicializar datos de ejemplo
function inicializarDatosEjemplo() {
    try {
        // Solo inicializar si no hay datos existentes
        if (!localStorage.getItem('empleados')) {
            localStorage.setItem('empleados', JSON.stringify(datosEjemplo.empleados));
        }
        
        if (!localStorage.getItem('conceptos')) {
            localStorage.setItem('conceptos', JSON.stringify(datosEjemplo.conceptos));
        }
        
        if (!localStorage.getItem('configuracion')) {
            localStorage.setItem('configuracion', JSON.stringify(datosEjemplo.configuracion));
        }
        
        console.log('Datos de ejemplo inicializados correctamente');
        return true;
    } catch (error) {
        console.error('Error al inicializar datos de ejemplo:', error);
        return false;
    }
}

// Función para guardar configuración
function guardarConfiguracion(config) {
    try {
        localStorage.setItem('configuracion', JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        return false;
    }
}

// Función para obtener configuración
function obtenerConfiguracion() {
    try {
        return JSON.parse(localStorage.getItem('configuracion')) || datosEjemplo.configuracion;
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        return datosEjemplo.configuracion;
    }
}

// Función para guardar liquidaciones
function guardarLiquidaciones(liquidaciones) {
    try {
        localStorage.setItem('liquidaciones', JSON.stringify(liquidaciones));
        return true;
    } catch (error) {
        console.error('Error al guardar liquidaciones:', error);
        return false;
    }
}

// Función para obtener liquidaciones
function obtenerLiquidaciones() {
    try {
        return JSON.parse(localStorage.getItem('liquidaciones')) || [];
    } catch (error) {
        console.error('Error al obtener liquidaciones:', error);
        return [];
    }
}

// Guardar o actualizar una liquidación en IndexedDB
async function guardarLiquidacionDB(liquidacion) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['liquidaciones'], 'readwrite');
        const store = transaction.objectStore('liquidaciones');
        
        const request = liquidacion.id ? 
            store.put(liquidacion) : 
            store.add(liquidacion);
            
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener configuración por tipo
async function obtenerConfiguracionDB(tipo) {
    if (!db) {
        console.error('La base de datos no está inicializada');
        return null;
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['configuracion'], 'readonly');
            const store = transaction.objectStore('configuracion');
            const request = store.get(tipo);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => {
                console.error('Error en la transacción:', e);
                reject(e);
            };
        } catch (error) {
            console.error('Error al acceder a IndexedDB:', error);
            reject(error);
        }
    });
}

// Guardar configuración
async function guardarConfiguracionDB(config) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['configuracion'], 'readwrite');
        const store = transaction.objectStore('configuracion');
        const request = store.put(config);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener todas las liquidaciones
async function obtenerLiquidacionesDB(filtros = {}) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['liquidaciones'], 'readonly');
        const store = transaction.objectStore('liquidaciones');
        
        let request;
        if (filtros.periodo) {
            const index = store.index('periodo');
            request = index.getAll(IDBKeyRange.only(filtros.periodo));
        } else if (filtros.estado) {
            const index = store.index('estado');
            request = index.getAll(IDBKeyRange.only(filtros.estado));
        } else {
            request = store.getAll();
        }
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar los datos de ejemplo si es necesario
        inicializarDatosEjemplo();
        
        // Cargar datos en el estado de la aplicación
        const datos = getDatos();
        Object.assign(appState, {
            empleados: datos.empleados,
            conceptos: datos.conceptos,
            configuracion: datos.configuracion,
            liquidaciones: obtenerLiquidaciones()
        });
        
        // Inicializar componentes comunes
        initComponentesComunes();
        
        // Cargar la vista inicial
        loadView('inicio');
        
        console.log('Módulo de Remuneraciones cargado correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('Error', 'No se pudo inicializar la aplicación. Por favor, recarga la página.');
    }
});

// ====================================
// Configuración de Empresa
// ====================================

// Cargar configuración de la empresa
async function cargarConfiguracionEmpresa() {
    try {
        const config = await obtenerConfiguracionDB('empresa');
        if (config) {
            // Actualizar los campos del formulario
            document.getElementById('empresa-nombre').value = config.nombre || '';
            document.getElementById('empresa-rut').value = config.rut || '';
            document.getElementById('empresa-direccion').value = config.direccion || '';
            document.getElementById('empresa-telefono').value = config.telefono || '';
            document.getElementById('empresa-email').value = config.email || '';
            // Nota: El manejo de la imagen del logo sería adicional
        }
    } catch (error) {
        console.error('Error al cargar configuración de la empresa:', error);
    }
}

// Guardar configuración de la empresa
async function guardarConfiguracionEmpresa(event) {
    event.preventDefault();
    
    try {
        const configuracion = {
            tipo: 'empresa',
            nombre: document.getElementById('empresa-nombre').value,
            rut: document.getElementById('empresa-rut').value,
            direccion: document.getElementById('empresa-direccion').value,
            telefono: document.getElementById('empresa-telefono').value,
            email: document.getElementById('empresa-email').value,
            // Nota: El manejo de la imagen del logo sería adicional
            actualizado: new Date().toISOString()
        };

        await guardarConfiguracionDB(configuracion);
        mostrarMensaje('¡Configuración guardada!', 'Los datos de la empresa se han guardado correctamente.');
    } catch (error) {
        console.error('Error al guardar configuración de la empresa:', error);
        mostrarError('Error', 'No se pudo guardar la configuración de la empresa');
    }
}

// ====================================
// Utilidades
// ====================================

// Mostrar mensaje de error
function mostrarError(titulo, mensaje) {
    // Implementar lógica para mostrar mensajes de error
    console.error(`${titulo}: ${mensaje}`);
    // Ejemplo con SweetAlert2:
    // Swal.fire({
    //     icon: 'error',
    //     title: titulo,
    //     text: mensaje,
    //     confirmButtonText: 'Aceptar'
    // });
}

// Mostrar mensaje de éxito
function mostrarMensaje(titulo, mensaje, tipo = 'success') {
    // Implementar lógica para mostrar mensajes
    console.log(`${tipo.toUpperCase()}: ${titulo} - ${mensaje}`);
    // Ejemplo con SweetAlert2:
    // Swal.fire({
    //     icon: tipo,
    //     title: titulo,
    //     text: mensaje,
    //     showConfirmButton: false,
    //     timer: 3000
    // });
}

// Formatear moneda
function formatCurrency(amount, decimals = 0) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(amount);
}

/**
 * Obtiene el contenido de una vista específica.
 * Primero intenta cargar una vista específica (ej: views/empleados/lista.html),
 * luego intenta con una vista por defecto (ej: views/empleados.html),
 * y finalmente muestra un mensaje de error si no se encuentra ninguna vista.
 * 
 * @param {string} viewName - Nombre de la vista a cargar
 * @returns {Promise<string>} Contenido HTML de la vista o un mensaje de error
 */
async function getViewContent(viewName) {
    console.log(`[getViewContent] Solicitando contenido para la vista: ${viewName}`);
    
    // Vista de inicio - Contenido embebido
    if (viewName === 'inicio' || !viewName) {
        console.log('[getViewContent] Generando contenido para la vista de inicio');
        return `
            <div class="welcome-message">
                <h2>Bienvenido al Módulo de Remuneraciones</h2>
                <p class="lead">Seleccione una opción del menú para comenzar.</p>
                
                <div class="row mt-4">
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body text-center">
                                <i class="fas fa-users fa-3x mb-3 text-primary"></i>
                                <h5 class="card-title">Empleados</h5>
                                <p class="card-text text-muted">Gestione la información de los empleados y sus contratos.</p>
                                <button class="btn btn-outline-primary btn-sm" onclick="window.remuneraciones.loadView('empleados')">
                                    <i class="fas fa-users me-2"></i>Ver Empleados
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body text-center">
                                <i class="fas fa-file-invoice-dollar fa-3x mb-3 text-success"></i>
                                <h5 class="card-title">Liquidaciones</h5>
                                <p class="card-text text-muted">Genere y gestione las liquidaciones de sueldos.</p>
                                <button class="btn btn-outline-success btn-sm" onclick="window.remuneraciones.loadView('liquidaciones')">
                                    <i class="fas fa-file-invoice-dollar me-2"></i>Ver Liquidaciones
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body text-center">
                                <i class="fas fa-chart-bar fa-3x mb-3 text-info"></i>
                                <h5 class="card-title">Reportes</h5>
                                <p class="card-text text-muted">Genere reportes y estadísticas de sueldos.</p>
                                <button class="btn btn-outline-info btn-sm" onclick="window.remuneraciones.loadView('reportes')">
                                    <i class="fas fa-chart-bar me-2"></i>Ver Reportes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Para otras vistas, intentar cargar desde archivos HTML
    try {
        // Primero intentar cargar la vista específica si existe (ej: liquidaciones/lista.html)
        const viewPath = `views/${viewName}/lista.html`;
        console.log(`[getViewContent] Intentando cargar vista desde: ${viewPath}`);
        
        const response = await fetch(viewPath);
        if (response.ok) {
            const content = await response.text();
            if (!content.trim()) {
                throw new Error(`La vista está vacía: ${viewPath}`);
            }
            console.log(`[getViewContent] Vista cargada exitosamente desde: ${viewPath}`);
            return content;
        } else if (response.status !== 404) {
            // Si el error no es 404, lanzar error
            throw new Error(`Error HTTP ${response.status} al cargar ${viewPath}`);
        }
        
        // Si no se encuentra, intentar cargar una vista por defecto
        const defaultViewPath = `views/${viewName}.html`;
        console.log(`[getViewContent] Vista no encontrada en ${viewPath}, intentando: ${defaultViewPath}`);
        
        const defaultResponse = await fetch(defaultViewPath);
        if (defaultResponse.ok) {
            const content = await defaultResponse.text();
            if (!content.trim()) {
                throw new Error(`La vista está vacía: ${defaultViewPath}`);
            }
            console.log(`[getViewContent] Vista cargada exitosamente desde: ${defaultViewPath}`);
            return content;
        } else if (defaultResponse.status !== 404) {
            throw new Error(`Error HTTP ${defaultResponse.status} al cargar ${defaultViewPath}`);
        }
        
        // Si llegamos aquí, ninguna vista fue encontrada
        throw new Error(`No se encontró la vista en ninguna de las ubicaciones probadas`);
        
    } catch (error) {
        console.error(`[getViewContent] Error al cargar la vista ${viewName}:`, error);
        
        // Mostrar mensaje de error detallado en desarrollo
        const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const errorDetails = isDevMode ? 
            `<div class="alert alert-warning mt-3">
                <strong>Detalles del error:</strong><br>
                <code>${error.message}</code>
            </div>` : '';
        
        return `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar la vista</h4>
                    <p>No se pudo cargar la vista solicitada: <strong>${viewName}</strong>.</p>
                    <p>Por favor, verifique que la vista exista o contacte al administrador del sistema.</p>
                    ${errorDetails}
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="window.remuneraciones.loadView('inicio')">
                            <i class="fas fa-home me-2"></i>Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// La función initViewComponents principal se encuentra en la línea 299

// Exportar funciones para uso en otros módulos
window.remuneraciones = {
    loadView,
    formatCurrency,
    mostrarError,
    mostrarMensaje,
    guardarConfiguracionEmpresa
};
