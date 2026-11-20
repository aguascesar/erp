// Variables globales
let pesajesData = [];
let vehiculosRecientes = [];
let currentPage = 1;
const itemsPerPage = 15;

// Elementos del DOM
const tblPesajesBody = document.getElementById('tblPesajesBody');
const btnNuevoPesaje = document.getElementById('btnNuevoPesaje');
const modalNuevoPesaje = document.getElementById('modalNuevoPesaje');
const modalVerPesaje = document.getElementById('modalVerPesaje');
const closeButtons = document.querySelectorAll('.close');
const btnCancelarPesaje = document.getElementById('btnCancelarPesaje');
const formNuevoPesaje = document.getElementById('formNuevoPesaje');
const fechaInicio = document.getElementById('fechaInicio');
const fechaFin = document.getElementById('fechaFin');
const filtroEstado = document.getElementById('filtroEstado');
const btnFiltrar = document.getElementById('btnFiltrar');
const btnAnterior = document.getElementById('btnAnterior');
const btnSiguiente = document.getElementById('btnSiguiente');
const paginacionInfo = document.getElementById('paginacionInfo');
const buscarPesaje = document.getElementById('buscarPesaje');
const btnImprimir = document.getElementById('btnImprimir');
const btnSubirJSON = document.getElementById('btnSubirJSON');
const inputJSON = document.getElementById('inputJSON');
const btnToggleTheme = document.getElementById('btnToggleTheme');
const btnExportarExcel = document.getElementById('btnExportarExcel');
const modalExportarExcel = document.getElementById('modalExportarExcel');
const exportFechaInicio = document.getElementById('exportFechaInicio');
const exportFechaFin = document.getElementById('exportFechaFin');
const exportUsarFiltrosActuales = document.getElementById('exportUsarFiltrosActuales');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Configurar fechas por defecto (rango amplio para mostrar todos los datos)
    fechaInicio.value = '2025-01-01';
    fechaFin.value = '2025-12-31';

    // Configurar fecha/hora actual en el formulario
    const now = new Date();
    const fechaHoraActual = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('fechaPesaje').value = fechaHoraActual;

    // Cargar productos en el combo
    cargarProductos();

    // Cargar clientes en el combo
    cargarClientes();

    // Cargar datos iniciales
    cargarPesajes();
    cargarVehiculosRecientes();

    // Configurar eventos
    configurarEventos();
});

// Cargar productos en el combo
function cargarProductos() {
    const productoSelect = document.getElementById('producto');
    
    // Limpiar opciones existentes (excepto la primera)
    productoSelect.innerHTML = '<option value="">Seleccione un producto</option>';
    
    // Cargar productos desde el archivo JS
    if (typeof productosLista !== 'undefined' && productosLista.length > 0) {
        productosLista.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.nombre;
            option.textContent = producto.nombre;
            productoSelect.appendChild(option);
        });
        console.log(`Cargados ${productosLista.length} productos`);
    } else {
        console.warn('No se encontraron productos en productosLista');
    }
}

// Cargar clientes en el combo
function cargarClientes() {
    const proveedorSelect = document.getElementById('proveedor');
    
    // Limpiar opciones existentes (excepto la primera)
    proveedorSelect.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    // Cargar clientes desde el archivo JS
    if (typeof clientesLista !== 'undefined' && clientesLista.length > 0) {
        clientesLista.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.rSocial;
            option.textContent = `${cliente.rSocial} - ${cliente.rut}`;
            proveedorSelect.appendChild(option);
        });
        console.log(`Cargados ${clientesLista.length} clientes`);
    } else {
        console.warn('No se encontraron clientes en clientesLista');
    }
}

// Configuración de eventos
function configurarEventos() {
    // Modal de nuevo pesaje
    btnNuevoPesaje.addEventListener('click', abrirModalNuevoPesaje);
    
    // Cerrar modales
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modalNuevoPesaje.style.display = 'none';
            modalVerPesaje.style.display = 'none';
        });
    });
    
    btnCancelarPesaje.addEventListener('click', () => {
        modalNuevoPesaje.style.display = 'none';
        formNuevoPesaje.reset();
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modalNuevoPesaje || e.target === modalVerPesaje) {
            modalNuevoPesaje.style.display = 'none';
            modalVerPesaje.style.display = 'none';
            formNuevoPesaje.reset();
        }
    });
    
    // Envío del formulario
    formNuevoPesaje.addEventListener('submit', guardarPesaje);
    
    // Filtros
    btnFiltrar.addEventListener('click', () => {
        currentPage = 1;
        cargarPesajes();
    });

    // Aplicar filtros automáticamente al cambiar fechas
    fechaInicio.addEventListener('change', () => {
        currentPage = 1;
        cargarPesajes();
    });

    fechaFin.addEventListener('change', () => {
        currentPage = 1;
        cargarPesajes();
    });

    // Aplicar filtros automáticamente al cambiar estado
    filtroEstado.addEventListener('change', () => {
        currentPage = 1;
        cargarPesajes();
    });

    // Aplicar filtros automáticamente al buscar (con debounce)
    let debounceTimer;
    buscarPesaje.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentPage = 1;
            cargarPesajes();
        }, 500);
    });
    
    // Búsqueda
    buscarPesaje.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            cargarPesajes();
        }
    });
    
    // Paginación
    btnAnterior.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            actualizarTablaPesajes();
        }
    });
    
    btnSiguiente.addEventListener('click', () => {
        const totalPages = Math.ceil(pesajesData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            actualizarTablaPesajes();
        }
    });
    
    // Cálculo automático de peso neto
    const pesoBrutoInput = document.getElementById('pesoBruto');
    const pesoTaraInput = document.getElementById('pesoTara');
    const pesoNetoInput = document.getElementById('pesoNeto');
    
    [pesoBrutoInput, pesoTaraInput].forEach(input => {
        input.addEventListener('input', () => {
            const bruto = parseFloat(pesoBrutoInput.value) || 0;
            const tara = parseFloat(pesoTaraInput.value) || 0;
            const neto = Math.max(0, bruto - tara);
            pesoNetoInput.value = neto.toFixed(2);
        });
    });
    
    // Botón de impresión
    btnImprimir.addEventListener('click', imprimirPesaje);

    // Botón para subir JSON
    btnSubirJSON.addEventListener('click', () => {
        inputJSON.click();
    });

    // Input para subir JSON
    inputJSON.addEventListener('change', procesarArchivoJSON);

    // Botón para cambiar tema
    btnToggleTheme.addEventListener('click', toggleTheme);

    // Botón para exportar a Excel
    btnExportarExcel.addEventListener('click', exportarAExcel);
}

// Cargar lista de pesajes
async function cargarPesajes() {
    try {
        // Mostrar carga
        tblPesajesBody.innerHTML = '<tr><td colspan="12" class="text-center">Cargando...</td></tr>';

        // Cargar datos iniciales si existen
        if (typeof pesajesDatosIniciales !== 'undefined' && pesajesDatosIniciales.length > 0) {
            pesajesData = [...pesajesDatosIniciales];
        } else {
            // Datos de ejemplo si no hay datos iniciales
            pesajesData = generarDatosEjemplo();
        }

        // Aplicar filtros
        pesajesData = pesajesData.filter(pesaje => {
            const fechaPesaje = pesaje.fechaHora.split('T')[0];
            const fechaInicioVal = fechaInicio.value;
            const fechaFinVal = fechaFin.value;

            const fechaValida = fechaPesaje >= fechaInicioVal && fechaPesaje <= fechaFinVal;
            const estadoValido = filtroEstado.value === '' || pesaje.estado === filtroEstado.value;
            const busquedaValida = buscarPesaje.value === '' ||
                                   pesaje.patente.toLowerCase().includes(buscarPesaje.value.toLowerCase()) ||
                                   pesaje.conductor.toLowerCase().includes(buscarPesaje.value.toLowerCase());

            return fechaValida && estadoValido && busquedaValida;
        });

        console.log(`Registros cargados: ${pesajesData.length}`);
        console.log(`Filtro fechas: ${fechaInicio.value} a ${fechaFin.value}`);

        // Actualizar la tabla
        actualizarTablaPesajes();
        actualizarResumen();

    } catch (error) {
        console.error('Error al cargar los pesajes:', error);
        mostrarAlerta('Error al cargar los registros de pesaje', 'error');
        tblPesajesBody.innerHTML = '<tr><td colspan="12" class="text-center text-danger">Error al cargar los datos</td></tr>';
    }
}

// Generar datos de ejemplo para la tabla
function generarDatosEjemplo() {
    const estados = ['pendiente', 'completado', 'anulado'];
    const productos = ['Trigo', 'Maíz', 'Soja', 'Arroz', 'Cebada'];
    const proveedores = ['Agropecuaria S.A.', 'Granos del Sur', 'Cereales del Este', 'Campo Fértil', 'Agroindustria Norte'];
    const patentes = ['AB123CD', 'EF456GH', 'IJ789KL', 'MN012OP', 'QR345ST', 'UV678WX', 'YZ901AB'];
    const conductores = ['Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez', 'Pedro Sánchez'];
    
    const hoy = new Date();
    const pesajes = [];
    
    // Generar 50 pesajes de ejemplo
    for (let i = 1; i <= 50; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 días
        
        const hora = Math.floor(Math.random() * 24);
        const minuto = Math.floor(Math.random() * 60);
        
        const fechaHora = new Date(fecha);
        fechaHora.setHours(hora, minuto);
        
        const patente = patentes[Math.floor(Math.random() * patentes.length)];
        const conductor = conductores[Math.floor(Math.random() * conductores.length)];
        const producto = productos[Math.floor(Math.random() * productos.length)];
        const proveedor = proveedores[Math.floor(Math.random() * proveedores.length)];
        const estado = estados[Math.floor(Math.random() * estados.length)];
        
        const pesoBruto = 10000 + Math.random() * 20000; // Entre 10,000 y 30,000 kg
        const pesoTara = 5000 + Math.random() * 10000; // Entre 5,000 y 15,000 kg
        const pesoNeto = Math.max(0, pesoBruto - pesoTara);
        
        pesajes.push({
            id: i,
            fechaHora: fechaHora.toISOString(),
            patente,
            conductor,
            producto,
            proveedor,
            documento: `FAC-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
            pesoBruto: parseFloat(pesoBruto.toFixed(2)),
            pesoTara: parseFloat(pesoTara.toFixed(2)),
            pesoNeto: parseFloat(pesoNeto.toFixed(2)),
            estado,
            observaciones: i % 3 === 0 ? 'Pesaje realizado sin novedades' : '',
            esExportacion: Math.random() > 0.7,
            fechaHoraBruto: new Date(fechaHora.getTime() - (30 + Math.random() * 60) * 60000).toISOString(),
            fechaHoraTara: new Date(fechaHora.getTime() + (30 + Math.random() * 60) * 60000).toISOString()
        });
    }
    
    // Filtrar por fechas seleccionadas
    return pesajes.filter(pesaje => {
        const fechaPesaje = pesaje.fechaHora.split('T')[0];
        return fechaPesaje >= fechaInicio.value && 
               fechaPesaje <= fechaFin.value &&
               (filtroEstado.value === '' || pesaje.estado === filtroEstado.value) &&
               (buscarPesaje.value === '' || 
                pesaje.patente.toLowerCase().includes(buscarPesaje.value.toLowerCase()) ||
                pesaje.conductor.toLowerCase().includes(buscarPesaje.value.toLowerCase()));
    });
}

// Actualizar la tabla con los datos
function actualizarTablaPesajes() {
    if (pesajesData.length === 0) {
        tblPesajesBody.innerHTML = '<tr><td colspan="12" class="text-center">No se encontraron registros</td></tr>';
        return;
    }
    
    // Ordenar por fecha y hora (más recientes primero)
    const datosOrdenados = [...pesajesData].sort((a, b) => {
        return new Date(b.fechaHora) - new Date(a.fechaHora);
    });
    
    // Paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = datosOrdenados.slice(startIndex, endIndex);
    
    // Generar filas de la tabla
    tblPesajesBody.innerHTML = '';
    
    paginatedData.forEach(pesaje => {
        const tr = document.createElement('tr');
        
        // Determinar clase según el estado
        let estadoClase = '';
        let estadoTexto = '';
        
        switch(pesaje.estado) {
            case 'completado':
                estadoClase = 'badge-success';
                estadoTexto = 'Completado';
                break;
            case 'pendiente':
                estadoClase = 'badge-warning';
                estadoTexto = 'Pendiente';
                break;
            case 'anulado':
                estadoClase = 'badge-danger';
                estadoTexto = 'Anulado';
                break;
        }
        
        const fechaHora = new Date(pesaje.fechaHora);
        const fechaStr = fechaHora.toLocaleDateString('es-CL');
        const horaStr = fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        
        tr.innerHTML = `
            <td>${pesaje.id}</td>
            <td>${fechaStr} ${horaStr}</td>
            <td>${pesaje.patente}</td>
            <td>${pesaje.conductor}</td>
            <td>${pesaje.producto}</td>
            <td>${pesaje.proveedor}</td>
            <td>${pesaje.documento}</td>
            <td class="text-right">${pesaje.pesoBruto.toLocaleString('es-CL')} kg</td>
            <td class="text-right">${pesaje.pesoTara.toLocaleString('es-CL')} kg</td>
            <td class="text-right font-weight-bold">${pesaje.pesoNeto.toLocaleString('es-CL')} kg</td>
            <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
            <td class="text-center">
                <button class="btn-action view" onclick="verPesaje(${pesaje.id})" title="Ver">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action edit" onclick="editarPesaje(${pesaje.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="eliminarPesaje(${pesaje.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tblPesajesBody.appendChild(tr);
    });
    
    // Actualizar controles de paginación
    actualizarControlesPaginacion();
}

// Actualizar controles de paginación
function actualizarControlesPaginacion() {
    const totalPages = Math.ceil(pesajesData.length / itemsPerPage);
    
    // Actualizar información de paginación
    paginacionInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    
    // Habilitar/deshabilitar botones
    btnAnterior.disabled = currentPage === 1;
    btnSiguiente.disabled = currentPage >= totalPages || totalPages === 0;
}

// Cargar vehículos recientes
async function cargarVehiculosRecientes() {
    try {
        // Simulación de carga de vehículos recientes
        // En un entorno real, esto haría una llamada a tu API
        vehiculosRecientes = [
            { patente: 'AB123CD', ultimoPesaje: 'Hoy, 10:30', producto: 'Trigo', peso: '12,450.50 kg' },
            { patente: 'EF456GH', ultimoPesaje: 'Ayer, 15:45', producto: 'Maíz', peso: '15,780.25 kg' },
            { patente: 'IJ789KL', ultimoPesaje: 'Ayer, 09:15', producto: 'Soja', peso: '14,230.75 kg' },
            { patente: 'MN012OP', ultimoPesaje: '20/10/2023', producto: 'Arroz', peso: '10,550.00 kg' },
            { patente: 'QR345ST', ultimoPesaje: '19/10/2023', producto: 'Cebada', peso: '13,120.30 kg' }
        ];
        
        actualizarVehiculosRecientes();
    } catch (error) {
        console.error('Error al cargar vehículos recientes:', error);
    }
}

// Actualizar la lista de vehículos recientes
function actualizarVehiculosRecientes() {
    const container = document.getElementById('vehiculosRecientes');
    
    if (vehiculosRecientes.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> No hay vehículos recientes.</div>';
        return;
    }
    
    let html = '<ul class="vehiculos-list">';
    
    vehiculosRecientes.forEach(vehiculo => {
        html += `
            <li class="vehiculo-item">
                <div class="vehiculo-header">
                    <span class="vehiculo-patente">${vehiculo.patente}</span>
                    <span class="vehiculo-fecha">${vehiculo.ultimoPesaje}</span>
                </div>
                <div class="vehiculo-details">
                    <span class="vehiculo-producto">${vehiculo.producto}</span>
                    <span class="vehiculo-peso">${vehiculo.peso}</span>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

// Actualizar el resumen
function actualizarResumen() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaResumen').textContent = formatearFecha(hoy);
    
    // Calcular totales
    const totalPesajes = pesajesData.length;
    const pesoTotal = pesajesData.reduce((sum, p) => sum + p.pesoNeto, 0);
    const pendientes = pesajesData.filter(p => p.estado === 'pendiente').length;
    const anulados = pesajesData.filter(p => p.estado === 'anulado').length;
    
    // Actualizar la interfaz
    document.getElementById('totalPesajes').textContent = totalPesajes.toLocaleString('es-CL');
    document.getElementById('pesoTotal').textContent = pesoTotal.toLocaleString('es-CL') + ' kg';
    document.getElementById('pendientes').textContent = pendientes.toLocaleString('es-CL');
    document.getElementById('anulados').textContent = anulados.toLocaleString('es-CL');
}

// Abrir modal de nuevo pesaje
function abrirModalNuevoPesaje() {
    // Restablecer el formulario
    formNuevoPesaje.reset();
    
    // Establecer fecha y hora actual
    const now = new Date();
    const fechaHoraActual = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('fechaPesaje').value = fechaHoraActual;
    
    // Mostrar el modal
    modalNuevoPesaje.style.display = 'flex';
}

// Guardar nuevo pesaje
async function guardarPesaje(e) {
    e.preventDefault();
    
    const formData = new FormData(formNuevoPesaje);
    const tipoPesaje = formData.get('tipoPesaje');
    const patente = formData.get('patente').toUpperCase();
    const fechaHora = formData.get('fechaPesaje');
    const conductor = formData.get('conductor');
    const pesoBruto = parseFloat(formData.get('pesoBruto')) || 0;
    const pesoTara = parseFloat(formData.get('pesoTara')) || 0;
    const pesoNeto = parseFloat(document.getElementById('pesoNeto').value) || 0;
    const producto = formData.get('producto');
    const proveedor = formData.get('proveedor');
    const documento = formData.get('documento');
    const observaciones = formData.get('observaciones');
    const esExportacion = formData.get('esExportacion') === 'on';
    
    // Validaciones básicas
    if (!patente) {
        mostrarAlerta('Debe ingresar la patente del vehículo', 'error');
        return;
    }
    
    if (tipoPesaje === 'completo' && (pesoBruto <= 0 || pesoTara <= 0)) {
        mostrarAlerta('Para un pesaje completo, debe ingresar tanto el peso bruto como la tara', 'error');
        return;
    }
    
    try {
        // En un entorno real, aquí iría la llamada a la API para guardar el pesaje
        // const response = await fetch('/api/pesajes', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         tipoPesaje,
        //         patente,
        //         fechaHora,
        //         conductor,
        //         pesoBruto,
        //         pesoTara,
        //         pesoNeto,
        //         producto,
        //         proveedor,
        //         documento,
        //         observaciones,
        //         esExportacion
        //     })
        // });
        
        // Simulación de éxito
        mostrarAlerta('Pesaje registrado correctamente', 'success');
        
        // Cerrar el modal y limpiar el formulario
        modalNuevoPesaje.style.display = 'none';
        formNuevoPesaje.reset();
        
        // Recargar datos
        cargarPesajes();
        cargarVehiculosRecientes();
        
    } catch (error) {
        console.error('Error al guardar el pesaje:', error);
        mostrarAlerta('Error al guardar el pesaje', 'error');
    }
}

// Ver detalle de un pesaje
function verPesaje(id) {
    const pesaje = pesajesData.find(p => p.id === id);
    if (!pesaje) return;
    
    // Formatear fechas
    const fechaHora = new Date(pesaje.fechaHora);
    const fechaHoraBruto = new Date(pesaje.fechaHoraBruto);
    const fechaHoraTara = new Date(pesaje.fechaHoraTara);
    
    // Actualizar el modal con los datos del pesaje
    document.getElementById('pesajeId').textContent = `#${pesaje.id}`;
    document.getElementById('detallePatente').textContent = pesaje.patente;
    document.getElementById('detalleFecha').textContent = `${formatearFechaHora(fechaHora)}`;
    document.getElementById('detalleEstado').textContent = pesaje.estado.charAt(0).toUpperCase() + pesaje.estado.slice(1);
    document.getElementById('detalleConductor').textContent = pesaje.conductor || 'No especificado';
    document.getElementById('detalleProducto').textContent = pesaje.producto || 'No especificado';
    document.getElementById('detalleProveedor').textContent = pesaje.proveedor || 'No especificado';
    document.getElementById('detalleDocumento').textContent = pesaje.documento || 'No especificado';
    
    // Actualizar pesos
    document.getElementById('detallePesoBruto').textContent = `${pesaje.pesoBruto.toLocaleString('es-CL')} kg`;
    document.getElementById('detallePesoTara').textContent = `${pesaje.pesoTara.toLocaleString('es-CL')} kg`;
    document.getElementById('detallePesoNeto').textContent = `${pesaje.pesoNeto.toLocaleString('es-CL')} kg`;
    
    // Actualizar fechas de pesaje
    document.getElementById('detalleHoraBruto').textContent = formatearFechaHora(fechaHoraBruto);
    document.getElementById('detalleHoraTara').textContent = formatearFechaHora(fechaHoraTara);
    
    // Actualizar observaciones
    document.getElementById('detalleObservaciones').textContent = 
        pesaje.observaciones || 'Sin observaciones';
    
    // Actualizar código QR con el ID del pesaje
    const qrImg = document.querySelector('#modalVerPesaje .qr-code img');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=pesaje-${pesaje.id}`;
    }
    
    // Mostrar el modal
    modalVerPesaje.style.display = 'flex';
}

// Editar pesaje
function editarPesaje(id) {
    const pesaje = pesajesData.find(p => p.id === id);
    if (!pesaje) return;
    
    // Llenar el formulario con los datos del pesaje
    const form = document.getElementById('formNuevoPesaje');
    form.elements['tipoPesaje'].value = 'completo'; // O determinar según los datos
    form.elements['patente'].value = pesaje.patente;
    
    // Formatear fecha para el input datetime-local
    const fechaHora = new Date(pesaje.fechaHora);
    const fechaHoraLocal = new Date(fechaHora.getTime() - (fechaHora.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    form.elements['fechaPesaje'].value = fechaHoraLocal;
    
    form.elements['conductor'].value = pesaje.conductor || '';
    form.elements['pesoBruto'].value = pesaje.pesoBruto || '';
    form.elements['pesoTara'].value = pesaje.pesoTara || '';
    document.getElementById('pesoNeto').value = pesaje.pesoNeto || '';
    form.elements['producto'].value = pesaje.producto || '';
    form.elements['proveedor'].value = pesaje.proveedor || '';
    form.elements['documento'].value = pesaje.documento || '';
    form.elements['observaciones'].value = pesaje.observaciones || '';
    form.elements['esExportacion'].checked = pesaje.esExportacion || false;
    
    // Cambiar el texto del botón
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Actualizar Pesaje';
    
    // Guardar el ID del pesaje que se está editando
    form.dataset.editId = id;
    
    // Abrir el modal
    abrirModalNuevoPesaje();
}

// Eliminar pesaje
async function eliminarPesaje(id) {
    if (!confirm('¿Está seguro de eliminar este registro de pesaje? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        // En un entorno real, aquí iría la llamada a la API para eliminar el pesaje
        // await fetch(`/api/pesajes/${id}`, { method: 'DELETE' });
        
        // Simulación de éxito
        mostrarAlerta('Registro de pesaje eliminado correctamente', 'success');
        
        // Recargar datos
        cargarPesajes();
        
    } catch (error) {
        console.error('Error al eliminar el pesaje:', error);
        mostrarAlerta('Error al eliminar el registro de pesaje', 'error');
    }
}

// Imprimir pesaje
function imprimirPesaje() {
    // Aquí iría la lógica para imprimir el comprobante de pesaje
    // Por ahora, simplemente mostramos un mensaje
    const ventana = window.open('', '_blank');
    const contenido = `
        <html>
            <head>
                <title>Comprobante de Pesaje #${document.getElementById('pesajeId').textContent}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                    .subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }
                    .section { margin-bottom: 15px; }
                    .section-title { font-weight: bold; border-bottom: 1px solid #ddd; margin-bottom: 5px; }
                    .row { display: flex; margin-bottom: 5px; }
                    .label { font-weight: bold; width: 150px; }
                    .value { flex: 1; }
                    .pesajes { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .pesajes th, .pesajes td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .pesajes th { background-color: #f5f5f5; }
                    .total { font-weight: bold; text-align: right; }
                    .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #666; }
                    .signature { margin-top: 50px; text-align: right; }
                    .signature-line { border-top: 1px solid #000; width: 200px; margin-left: auto; margin-top: 40px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">COMPROBANTE DE PESAJE</div>
                    <div class="subtitle">${document.getElementById('detalleFecha').textContent}</div>
                </div>
                
                <div class="section">
                    <div class="section-title">Datos del Vehículo</div>
                    <div class="row">
                        <div class="label">Patente:</div>
                        <div class="value">${document.getElementById('detallePatente').textContent}</div>
                    </div>
                    <div class="row">
                        <div class="label">Conductor:</div>
                        <div class="value">${document.getElementById('detalleConductor').textContent}</div>
                    </div>
                    <div class="row">
                        <div class="label">Producto:</div>
                        <div class="value">${document.getElementById('detalleProducto').textContent}</div>
                    </div>
                    <div class="row">
                        <div class="label">Proveedor/Cliente:</div>
                        <div class="value">${document.getElementById('detalleProveedor').textContent}</div>
                    </div>
                    <div class="row">
                        <div class="label">Documento:</div>
                        <div class="value">${document.getElementById('detalleDocumento').textContent}</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Detalle de Pesajes</div>
                    <table class="pesajes">
                        <tr>
                            <th>Concepto</th>
                            <th>Peso (kg)</th>
                            <th>Fecha/Hora</th>
                        </tr>
                        <tr>
                            <td>Peso Entrada</td>
                            <td>${document.getElementById('detallePesoBruto').textContent}</td>
                            <td>${document.getElementById('detalleHoraBruto').textContent}</td>
                        </tr>
                        <tr>
                            <td>Peso Salida</td>
                            <td>${document.getElementById('detallePesoTara').textContent}</td>
                            <td>${document.getElementById('detalleHoraTara').textContent}</td>
                        </tr>
                        <tr>
                            <td class="total" colspan="3">Peso Neto: ${document.getElementById('detallePesoNeto').textContent}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">Observaciones</div>
                    <div>${document.getElementById('detalleObservaciones').textContent}</div>
                </div>
                
                <div class="signature">
                    <div class="signature-line"></div>
                    <div>Firma del Responsable</div>
                </div>
                
                <div class="footer">
                    <p>Este es un comprobante generado electrónicamente por el sistema de pesaje.</p>
                    <p>ID: ${document.getElementById('pesajeId').textContent} | Fecha de impresión: ${new Date().toLocaleString()}</p>
                </div>
                
                <script>
                    // Imprimir automáticamente al cargar
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            // Cerrar la ventana después de imprimir (opcional)
                            // setTimeout(function() { window.close(); }, 100);
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `;
    
    ventana.document.open();
    ventana.document.write(contenido);
    ventana.document.close();
}

// Funciones de utilidad
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CL');
}

function formatearFechaHora(fecha) {
    if (!fecha) return '';
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleString('es-CL');
}

function mostrarAlerta(mensaje, tipo = 'info') {
    // En un entorno real, podrías usar un sistema de notificaciones más sofisticado
    alert(`${tipo.toUpperCase()}: ${mensaje}`);
}

// Procesar archivo JSON subido
function procesarArchivoJSON(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            let contenido = event.target.result;
            
            // Eliminar 'json_data' del inicio si existe
            if (contenido.trim().startsWith('json_data')) {
                contenido = contenido.trim().substring(9);
            }
            
            const datosJSON = JSON.parse(contenido);
            
            if (!Array.isArray(datosJSON)) {
                mostrarAlerta('El archivo JSON debe contener un array de registros', 'error');
                return;
            }
            
            // Mapear datos al formato del sistema
            const pesajesImportados = mapearDatosJSON(datosJSON);
            
            // Agregar a los datos existentes
            pesajesData = [...pesajesData, ...pesajesImportados];
            
            // Actualizar la tabla
            actualizarTablaPesajes();
            actualizarResumen();
            
            mostrarAlerta(`Se importaron ${pesajesImportados.length} registros correctamente`, 'success');
            
            // Limpiar el input
            inputJSON.value = '';
            
        } catch (error) {
            console.error('Error al procesar el JSON:', error);
            mostrarAlerta('Error al procesar el archivo JSON. Verifique el formato.', 'error');
        }
    };
    
    reader.onerror = function() {
        mostrarAlerta('Error al leer el archivo', 'error');
    };
    
    reader.readAsText(archivo);
}

// Mapear datos del JSON al formato del sistema
function mapearDatosJSON(datosJSON) {
    const maxId = pesajesData.length > 0 ? Math.max(...pesajesData.map(p => p.id)) : 0;
    
    return datosJSON.map((registro, index) => {
        // Parsear fecha y hora del formato "2025/12/01" y "08:07:28"
        const fechaParts = registro.fechaIn1 ? registro.fechaIn1.split('/') : ['2025', '12', '01'];
        const horaParts = registro.horaIn1 ? registro.horaIn1.split(':') : ['00', '00', '00'];
        
        const fecha = new Date(
            parseInt(fechaParts[0]),
            parseInt(fechaParts[1]) - 1,
            parseInt(fechaParts[2]),
            parseInt(horaParts[0]),
            parseInt(horaParts[1]),
            parseInt(horaParts[2])
        );
        
        const pIn1 = parseFloat(registro.pIn1) || 0;
        const pOut1 = parseFloat(registro.pOut1) || 0;
        
        // Determinar peso bruto y tara según el proceso
        let pesoBruto, pesoTara, pesoNeto;
        if (registro.PesajeProceso === 'ENTRADA') {
            pesoBruto = pIn1;
            pesoTara = 0;
            pesoNeto = 0;
        } else if (registro.PesajeProceso === 'SALIDA') {
            pesoBruto = pIn1;
            pesoTara = pOut1;
            pesoNeto = Math.max(0, pIn1 - pOut1);
        } else {
            pesoBruto = pIn1;
            pesoTara = pOut1;
            pesoNeto = Math.max(0, pIn1 - pOut1);
        }
        
        // Determinar estado según el tipo de pesaje
        let estado = 'completado';
        if (registro.PesajeTipo === 'INTERNO_SIN_VALOR') {
            estado = 'completado';
        } else if (registro.PesajeTipo === 'CREDITO') {
            estado = 'pendiente';
        } else if (registro.PesajeTipo === 'PARTICULAR_CON_BOLETA') {
            estado = 'completado';
        }
        
        // Concatenar nombre y apellido para el conductor
        const nombre = registro.cInNom || '';
        const apellido = registro.cInAp || '';
        const conductor = nombre && apellido ? `${nombre} ${apellido}` : (nombre || apellido || '');

        return {
            id: maxId + index + 1,
            fechaHora: fecha.toISOString(),
            patente: registro.patente || '',
            conductor: conductor,
            producto: registro.producto1 || '',
            proveedor: registro.cliente1 || '',
            documento: registro.gDespacho1 || '',
            pesoBruto: pesoBruto,
            pesoTara: pesoTara,
            pesoNeto: pesoNeto,
            estado: estado,
            observaciones: `Importado de JSON - Tipo: ${registro.PesajeTipo}, Proceso: ${registro.PesajeProceso}`,
            esExportacion: false,
            fechaHoraBruto: fecha.toISOString(),
            fechaHoraTara: pOut1 > 0 ? new Date(fecha.getTime() + 30 * 60000).toISOString() : fecha.toISOString()
        };
    });
}

// Hacer funciones accesibles globalmente
window.verPesaje = verPesaje;
window.editarPesaje = editarPesaje;
window.eliminarPesaje = eliminarPesaje;
window.cerrarModalExportarExcel = cerrarModalExportarExcel;
window.confirmarExportarExcel = confirmarExportarExcel;

// Función para alternar entre temas
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Función para actualizar el icono del botón de tema
function updateThemeIcon(theme) {
    const icon = btnToggleTheme.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Función para abrir modal de exportación a Excel
function exportarAExcel() {
    // Configurar fechas del modal con las fechas actuales de filtro
    exportFechaInicio.value = fechaInicio.value;
    exportFechaFin.value = fechaFin.value;

    // Mostrar modal
    modalExportarExcel.style.display = 'block';
}

// Función para cerrar modal de exportación a Excel
function cerrarModalExportarExcel() {
    modalExportarExcel.style.display = 'none';
}

// Función para confirmar y ejecutar exportación a Excel
function confirmarExportarExcel() {
    // Obtener datos base (todos los datos iniciales)
    let datosParaExportar = typeof pesajesDatosIniciales !== 'undefined' ?
        [...pesajesDatosIniciales] :
        generarDatosEjemplo();

    console.log(`Datos base: ${datosParaExportar.length} registros`);
    console.log(`Usar filtros actuales: ${exportUsarFiltrosActuales.checked}`);

    // Aplicar filtros según selección
    if (exportUsarFiltrosActuales.checked) {
        // Usar filtros actuales de la interfaz
        console.log(`Filtro interfaz - Fechas: ${fechaInicio.value} a ${fechaFin.value}, Estado: ${filtroEstado.value}, Búsqueda: ${buscarPesaje.value}`);
        datosParaExportar = datosParaExportar.filter(pesaje => {
            const fechaPesaje = pesaje.fechaHora.split('T')[0];
            return fechaPesaje >= fechaInicio.value &&
                   fechaPesaje <= fechaFin.value &&
                   (filtroEstado.value === '' || pesaje.estado === filtroEstado.value) &&
                   (buscarPesaje.value === '' ||
                    pesaje.patente.toLowerCase().includes(buscarPesaje.value.toLowerCase()) ||
                    pesaje.conductor.toLowerCase().includes(buscarPesaje.value.toLowerCase()));
        });
    } else {
        // Usar rango de fechas del modal
        const fechaInicioExport = exportFechaInicio.value;
        const fechaFinExport = exportFechaFin.value;

        console.log(`Filtro modal - Fechas: ${fechaInicioExport} a ${fechaFinExport}`);
        datosParaExportar = datosParaExportar.filter(pesaje => {
            const fechaPesaje = pesaje.fechaHora.split('T')[0];
            return fechaPesaje >= fechaInicioExport && fechaPesaje <= fechaFinExport;
        });
    }

    console.log(`Registros después del filtro: ${datosParaExportar.length}`);

    if (!datosParaExportar || datosParaExportar.length === 0) {
        mostrarAlerta('No hay datos para exportar con los filtros seleccionados', 'warning');
        return;
    }

    // Preparar datos para exportar
    const datosExportar = datosParaExportar.map(pesaje => ({
        'ID': pesaje.id,
        'Fecha': pesaje.fechaHora.split('T')[0],
        'Hora': pesaje.fechaHora.split('T')[1],
        'Patente': pesaje.patente,
        'Conductor': pesaje.conductor,
        'Producto': pesaje.producto,
        'Proveedor': pesaje.proveedor,
        'Documento': pesaje.documento,
        'Peso Bruto (kg)': pesaje.pesoBruto,
        'Peso Tara (kg)': pesaje.pesoTara,
        'Peso Neto (kg)': pesaje.pesoNeto,
        'Estado': pesaje.estado,
        'Observaciones': pesaje.observaciones
    }));

    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(datosExportar);

    // Ajustar ancho de columnas
    const colWidths = [
        { wch: 6 },  // ID
        { wch: 12 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 10 }, // Patente
        { wch: 15 }, // Conductor
        { wch: 20 }, // Producto
        { wch: 25 }, // Proveedor
        { wch: 12 }, // Documento
        { wch: 14 }, // Peso Bruto
        { wch: 12 }, // Peso Tara
        { wch: 12 }, // Peso Neto
        { wch: 10 }, // Estado
        { wch: 40 }  // Observaciones
    ];
    ws['!cols'] = colWidths;

    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pesajes');

    // Generar nombre de archivo con rango de fechas
    const fechaInicioNombre = exportFechaInicio.value;
    const fechaFinNombre = exportFechaFin.value;
    const nombreArchivo = `Pesajes_${fechaInicioNombre}_a_${fechaFinNombre}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);

    // Cerrar modal
    cerrarModalExportarExcel();

    mostrarAlerta(`Archivo ${nombreArchivo} exportado correctamente (${datosExportar.length} registros)`, 'success');
}
