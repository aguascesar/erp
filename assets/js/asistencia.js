// Variables globales
let marcasData = [];
let trabajadores = [];
let currentPage = 1;
const itemsPerPage = 15;

// Elementos del DOM
const tblMarcasBody = document.getElementById('tblMarcasBody');
const btnNuevaMarca = document.getElementById('btnNuevaMarca');
const modalNuevaMarca = document.getElementById('modalNuevaMarca');
const closeModal = document.querySelector('.close');
const btnCancelarMarca = document.getElementById('btnCancelarMarca');
const formNuevaMarca = document.getElementById('formNuevaMarca');
const fechaInicio = document.getElementById('fechaInicio');
const fechaFin = document.getElementById('fechaFin');
const btnFiltrar = document.getElementById('btnFiltrar');
const btnAnterior = document.getElementById('btnAnterior');
const btnSiguiente = document.getElementById('btnSiguiente');
const paginacionInfo = document.getElementById('paginacionInfo');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar fechas por defecto (hoy)
    const today = new Date().toISOString().split('T')[0];
    fechaInicio.value = today;
    fechaFin.value = today;
    
    // Cargar datos iniciales
    cargarTrabajadores();
    cargarMarcas();
    
    // Configurar eventos
    configurarEventos();
});

// Configuración de eventos
function configurarEventos() {
    // Modal de nueva marca
    btnNuevaMarca.addEventListener('click', () => {
        abrirModalNuevaMarca();
    });
    
    // Cerrar modal
    closeModal.addEventListener('click', cerrarModal);
    btnCancelarMarca.addEventListener('click', cerrarModal);
    window.addEventListener('click', (e) => {
        if (e.target === modalNuevaMarca) {
            cerrarModal();
        }
    });
    
    // Envío del formulario
    formNuevaMarca.addEventListener('submit', guardarMarca);
    
    // Filtros
    btnFiltrar.addEventListener('click', () => {
        currentPage = 1;
        cargarMarcas();
    });
    
    // Paginación
    btnAnterior.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            cargarMarcas();
        }
    });
    
    btnSiguiente.addEventListener('click', () => {
        const totalPages = Math.ceil(marcasData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            cargarMarcas();
        }
    });
}

// Funciones para el modal
function abrirModalNuevaMarca() {
    document.getElementById('fechaMarca').value = new Date().toISOString().split('T')[0];
    document.getElementById('horaMarca').value = new Date().toTimeString().substring(0, 5);
    modalNuevaMarca.style.display = 'flex';
}

function cerrarModal() {
    modalNuevaMarca.style.display = 'none';
    formNuevaMarca.reset();
}

// Cargar trabajadores desde la API
async function cargarTrabajadores() {
    try {
        // Simulación de carga de trabajadores
        // En un entorno real, esto haría una llamada a tu API
        trabajadores = [
            { id: 1, rut: '12.345.678-9', nombre: 'Juan Pérez' },
            { id: 2, rut: '18.765.432-1', nombre: 'María González' },
            { id: 3, rut: '15.678.234-5', nombre: 'Carlos López' },
            { id: 4, rut: '19.876.543-2', nombre: 'Ana Martínez' },
            { id: 5, rut: '11.223.344-5', nombre: 'Pedro Sánchez' }
        ];
        
        // Llenar el select de trabajadores
        const selectTrabajador = document.getElementById('trabajador');
        selectTrabajador.innerHTML = '<option value="">Seleccione un trabajador</option>';
        
        trabajadores.forEach(trabajador => {
            const option = document.createElement('option');
            option.value = trabajador.id;
            option.textContent = `${trabajador.nombre} (${trabajador.rut})`;
            selectTrabajador.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        mostrarAlerta('Error al cargar la lista de trabajadores', 'error');
    }
}

// Cargar marcas desde la API
async function cargarMarcas() {
    try {
        // Mostrar carga
        tblMarcasBody.innerHTML = '<tr><td colspan="8" class="text-center">Cargando...</td></tr>';
        
        // Simulación de carga de marcas
        // En un entorno real, esto haría una llamada a tu API con los filtros
        // const response = await fetch(`/api/marcas?fechaInicio=${fechaInicio.value}&fechaFin=${fechaFin.value}`);
        // marcasData = await response.json();
        
        // Datos de ejemplo
        marcasData = generarDatosEjemplo();
        
        // Actualizar la tabla
        actualizarTablaMarcas();
        actualizarResumen();
        
    } catch (error) {
        console.error('Error al cargar marcas:', error);
        mostrarAlerta('Error al cargar las marcas de asistencia', 'error');
        tblMarcasBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar los datos</td></tr>';
    }
}

// Generar datos de ejemplo para la tabla
function generarDatosEjemplo() {
    const tipos = ['entrada', 'salida', 'colacion_inicio', 'colacion_termino'];
    const ubicaciones = ['Oficina Central', 'Sucursal Norte', 'Teletrabajo'];
    const nombres = ['Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez', 'Pedro Sánchez'];
    const ruts = ['12.345.678-9', '18.765.432-1', '15.678.234-5', '19.876.543-2', '11.223.344-5'];
    
    const hoy = new Date();
    const marcas = [];
    
    // Generar 50 marcas de ejemplo
    for (let i = 1; i <= 50; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 días
        
        const hora = Math.floor(Math.random() * 24);
        const minuto = Math.floor(Math.random() * 60);
        
        const trabajadorIndex = i % 5;
        const tipoIndex = Math.floor(Math.random() * tipos.length);
        const ubicacionIndex = Math.floor(Math.random() * ubicaciones.length);
        
        marcas.push({
            id: i,
            trabajador_id: trabajadorIndex + 1,
            rut: ruts[trabajadorIndex],
            nombre: nombres[trabajadorIndex],
            fecha: fecha.toISOString().split('T')[0],
            hora: `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`,
            tipo: tipos[tipoIndex],
            ubicacion: ubicaciones[ubicacionIndex],
            observacion: i % 5 === 0 ? 'Marcación manual' : ''
        });
    }
    
    // Filtrar por fechas seleccionadas
    return marcas.filter(marca => {
        return marca.fecha >= fechaInicio.value && marca.fecha <= fechaFin.value;
    });
}

// Actualizar la tabla con los datos
function actualizarTablaMarcas() {
    if (marcasData.length === 0) {
        tblMarcasBody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron registros</td></tr>';
        return;
    }
    
    // Ordenar por fecha y hora (más recientes primero)
    const datosOrdenados = [...marcasData].sort((a, b) => {
        const fechaHoraA = new Date(`${a.fecha}T${a.hora}`);
        const fechaHoraB = new Date(`${b.fecha}T${b.hora}`);
        return fechaHoraB - fechaHoraA;
    });
    
    // Paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = datosOrdenados.slice(startIndex, endIndex);
    
    // Generar filas de la tabla
    tblMarcasBody.innerHTML = '';
    
    paginatedData.forEach(marca => {
        const tr = document.createElement('tr');
        
        // Determinar clase según el tipo de marca
        let tipoClase = '';
        let tipoTexto = '';
        
        switch(marca.tipo) {
            case 'entrada':
                tipoClase = 'text-success';
                tipoTexto = 'Entrada';
                break;
            case 'salida':
                tipoClase = 'text-danger';
                tipoTexto = 'Salida';
                break;
            case 'colacion_inicio':
                tipoClase = 'text-warning';
                tipoTexto = 'Inicio Colación';
                break;
            case 'colacion_termino':
                tipoClase = 'text-info';
                tipoTexto = 'Término Colación';
                break;
        }
        
        tr.innerHTML = `
            <td>${marca.id}</td>
            <td>${marca.rut}</td>
            <td>${marca.nombre}</td>
            <td>${formatearFecha(marca.fecha)}</td>
            <td>${marca.hora}</td>
            <td><span class="${tipoClase}">${tipoTexto}</span></td>
            <td>${marca.ubicacion}</td>
            <td class="text-center">
                <button class="btn-action edit" onclick="editarMarca(${marca.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="eliminarMarca(${marca.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tblMarcasBody.appendChild(tr);
    });
    
    // Actualizar controles de paginación
    actualizarControlesPaginacion();
}

// Actualizar controles de paginación
function actualizarControlesPaginacion() {
    const totalPages = Math.ceil(marcasData.length / itemsPerPage);
    
    // Actualizar información de paginación
    paginacionInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    
    // Habilitar/deshabilitar botones
    btnAnterior.disabled = currentPage === 1;
    btnSiguiente.disabled = currentPage >= totalPages || totalPages === 0;
}

// Actualizar el resumen
function actualizarResumen() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaResumen').textContent = formatearFecha(hoy);
    
    // Contar trabajadores únicos
    const trabajadoresUnicos = new Set(marcasData.map(m => m.trabajador_id));
    document.getElementById('totalTrabajadores').textContent = trabajadoresUnicos.size;
    
    // Total de marcas
    document.getElementById('totalMarcaciones').textContent = marcasData.length;
    
    // Ejemplo: Contar atrasos (solo como ejemplo, la lógica real dependerá de tu negocio)
    const atrasos = marcasData.filter(m => {
        if (m.tipo === 'entrada') {
            const [hora, minuto] = m.hora.split(':').map(Number);
            return hora > 9 || (hora === 9 && minuto > 15); // Ejemplo: después de las 9:15 se considera atraso
        }
        return false;
    }).length;
    
    document.getElementById('totalAtrasos').textContent = atrasos;
    
    // Ejemplo: Trabajadores sin marcar entrada hoy
    const sinMarcar = Math.max(0, trabajadores.length - trabajadoresUnicos.size);
    document.getElementById('sinMarcar').textContent = sinMarcar;
}

// Guardar nueva marca
async function guardarMarca(e) {
    e.preventDefault();
    
    const formData = new FormData(formNuevaMarca);
    const trabajadorId = formData.get('trabajador');
    const fecha = formData.get('fechaMarca');
    const hora = formData.get('horaMarca');
    const tipo = formData.get('tipoMarca');
    const observacion = formData.get('observacion');
    
    // Validaciones básicas
    if (!trabajadorId) {
        mostrarAlerta('Debe seleccionar un trabajador', 'error');
        return;
    }
    
    try {
        // En un entorno real, aquí iría la llamada a la API para guardar la marca
        // const response = await fetch('/api/marcas', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         trabajador_id: trabajadorId,
        //         fecha,
        //         hora,
        //         tipo,
        //         observacion
        //     })
        // });
        
        // Simulación de éxito
        mostrarAlerta('Marca registrada correctamente', 'success');
        cerrarModal();
        cargarMarcas(); // Recargar datos
        
    } catch (error) {
        console.error('Error al guardar la marca:', error);
        mostrarAlerta('Error al guardar la marca', 'error');
    }
}

// Editar marca
function editarMarca(id) {
    const marca = marcasData.find(m => m.id === id);
    if (!marca) return;
    
    // Llenar el formulario con los datos de la marca
    const form = document.getElementById('formNuevaMarca');
    form.elements['trabajador'].value = marca.trabajador_id;
    form.elements['fechaMarca'].value = marca.fecha;
    form.elements['horaMarca'].value = marca.hora;
    form.elements['tipoMarca'].value = marca.tipo;
    form.elements['observacion'].value = marca.observacion || '';
    
    // Cambiar el texto del botón
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Actualizar Marca';
    
    // Guardar el ID de la marca que se está editando
    form.dataset.editId = id;
    
    // Abrir el modal
    abrirModalNuevaMarca();
}

// Eliminar marca
async function eliminarMarca(id) {
    if (!confirm('¿Está seguro de eliminar esta marca de asistencia?')) {
        return;
    }
    
    try {
        // En un entorno real, aquí iría la llamada a la API para eliminar la marca
        // await fetch(`/api/marcas/${id}`, { method: 'DELETE' });
        
        // Simulación de éxito
        mostrarAlerta('Marca eliminada correctamente', 'success');
        cargarMarcas(); // Recargar datos
        
    } catch (error) {
        console.error('Error al eliminar la marca:', error);
        mostrarAlerta('Error al eliminar la marca', 'error');
    }
}

// Funciones de utilidad
function formatearFecha(fecha) {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}

function mostrarAlerta(mensaje, tipo = 'info') {
    // En un entorno real, podrías usar un sistema de notificaciones más sofisticado
    alert(`${tipo.toUpperCase()}: ${mensaje}`);
}

// Exportar a Excel
function exportarAExcel() {
    // Implementar lógica de exportación a Excel
    alert('Exportando a Excel...');
}

// Exportar a PDF
function exportarAPDF() {
    // Implementar lógica de exportación a PDF
    alert('Exportando a PDF...');
}

// Asignar eventos de exportación
document.getElementById('btnExportarExcel').addEventListener('click', exportarAExcel);
document.getElementById('btnExportarPDF').addEventListener('click', exportarAPDF);

// Hacer funciones accesibles globalmente si es necesario
window.editarMarca = editarMarca;
window.eliminarMarca = eliminarMarca;
