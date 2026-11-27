// Variables globales
let pesajesData = [];
let currentPage = 1;
const itemsPerPage = 15;

// Configuración de Google Apps Script
// Reemplaza con tu URL del script desplegado
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyX6SbNBce_pjgWxOyos360aGY-yaX_WDU_3WevvwuzcB4YQTSHhl2wRejqVXV8KrNl/exec';

// Elementos del DOM
const tblPesajesBody = document.getElementById('tblPesajesBody');
const btnRecargar = document.getElementById('btnRecargar');
const btnExportar = document.getElementById('btnExportar');
const btnToggleTheme = document.getElementById('btnToggleTheme');
const btnAnterior = document.getElementById('btnAnterior');
const btnSiguiente = document.getElementById('btnSiguiente');
const paginacionInfo = document.getElementById('paginacionInfo');
const buscarPesaje = document.getElementById('buscarPesaje');
const modalVerDetalle = document.getElementById('modalVerDetalle');
const closeButtons = document.querySelectorAll('.close');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Cargar datos iniciales
    cargarPesajes();

    // Configurar eventos
    configurarEventos();
});

// Configuración de eventos
function configurarEventos() {
    btnRecargar.addEventListener('click', cargarPesajes);
    
    btnExportar.addEventListener('click', exportarJSON);
    
    btnToggleTheme.addEventListener('click', toggleTheme);
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modalVerDetalle.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modalVerDetalle) {
            modalVerDetalle.style.display = 'none';
        }
    });
    
    // Búsqueda con debounce
    let debounceTimer;
    buscarPesaje.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentPage = 1;
            actualizarTablaPesajes();
        }, 500);
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
}

// Cargar lista de pesajes desde Google Apps Script
async function cargarPesajes() {
    try {
        // Mostrar carga
        tblPesajesBody.innerHTML = '<tr><td colspan="8" class="text-center">Cargando...</td></tr>';
        
        if (SCRIPT_URL === 'TU_URL_DE_SCRIPT_AQUI') {
            mostrarAlerta('Por favor, configura la URL del script en api_pesajes.js', 'error');
            tblPesajesBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">URL del script no configurada</td></tr>';
            return;
        }
        
        const response = await fetch(SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error('Error al cargar los datos');
        }
        
        const datosAPI = await response.json();
        console.log(`Registros desde API: ${datosAPI.length}`);
        
        // Combinar con datos iniciales si existen
        if (typeof pesajesDatosIniciales !== 'undefined' && pesajesDatosIniciales.length > 0) {
            console.log(`Datos iniciales encontrados: ${pesajesDatosIniciales.length} registros`);
            
            // Convertir datos iniciales al formato de la API
            const datosInicialesConvertidos = pesajesDatosIniciales.map((item, index) => ({
                id: item.id,
                receivedAt: item.fechaHora,
                patente: item.patente,
                cliente1: item.proveedor,
                producto1: item.producto,
                pN1: item.pesoNeto,
                Proceso: item.observaciones?.includes('Proceso: ') ? 
                    item.observaciones.split('Proceso: ')[1]?.split(',')[0] : '-',
                origen: 'inicial'
            }));
            
            // Combinar datos
            pesajesData = [...datosInicialesConvertidos, ...datosAPI];
            
            // Asegurar IDs únicos para datos de la API
            const maxIdInicial = Math.max(...datosInicialesConvertidos.map(d => d.id || 0));
            datosAPI.forEach((item, index) => {
                if (!item.id || item.id <= maxIdInicial) {
                    item.id = maxIdInicial + index + 1;
                }
                item.origen = 'api';
            });
            
            console.log(`Total registros combinados: ${pesajesData.length}`);
        } else {
            pesajesData = datosAPI.map((item, index) => ({
                ...item,
                id: item.id || (index + 1),
                origen: 'api'
            }));
            console.log(`Solo datos de API: ${pesajesData.length} registros`);
        }
        
        // Ordenar por fecha de recepción (más antiguos primero, más recientes al final)
        pesajesData.sort((a, b) => {
            const fechaA = new Date(a.receivedAt || 0);
            const fechaB = new Date(b.receivedAt || 0);
            return fechaA - fechaB;
        });
        
        console.log(`Registros ordenados cronológicamente`);
        
        // Actualizar la tabla
        actualizarTablaPesajes();
        actualizarResumen();
        
    } catch (error) {
        console.error('Error al cargar los pesajes:', error);
        mostrarAlerta('Error al cargar los registros de pesaje', 'error');
        tblPesajesBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar los datos</td></tr>';
    }
}

// Actualizar la tabla con los datos
function actualizarTablaPesajes() {
    if (pesajesData.length === 0) {
        tblPesajesBody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron registros</td></tr>';
        return;
    }
    
    // Aplicar filtro de búsqueda
    const termino = buscarPesaje.value.toLowerCase();
    const datosFiltrados = pesajesData.filter(pesaje => {
        return pesaje.patente.toLowerCase().includes(termino) ||
               pesaje.cliente1.toLowerCase().includes(termino);
    });
    
    if (datosFiltrados.length === 0) {
        tblPesajesBody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron resultados</td></tr>';
        return;
    }
    
    // Ordenar por fecha de recepción (más antiguos primero para mostrar cronológicamente)
    const datosOrdenados = [...datosFiltrados].sort((a, b) => {
        const fechaA = new Date(a.receivedAt || 0);
        const fechaB = new Date(b.receivedAt || 0);
        return fechaA - fechaB;
    });
    
    // Paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = datosOrdenados.slice(startIndex, endIndex);
    
    // Generar filas de la tabla
    tblPesajesBody.innerHTML = '';
    
    paginatedData.forEach(pesaje => {
        const tr = document.createElement('tr');
        
        const fechaRecibido = new Date(pesaje.receivedAt);
        const fechaStr = fechaRecibido.toLocaleDateString('es-CL');
        const horaStr = fechaRecibido.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        
        const pesoNeto = parseFloat(pesaje.pN1) || 0;
        
        tr.innerHTML = `
            <td>${pesaje.id}</td>
            <td>${fechaStr} ${horaStr}</td>
            <td><strong>${pesaje.patente}</strong></td>
            <td>${pesaje.cliente1 || '-'}</td>
            <td>${pesaje.producto1 || '-'}</td>
            <td class="text-right font-weight-bold">${pesoNeto.toLocaleString('es-CL')} kg</td>
            <td><span class="badge badge-info">${pesaje.Proceso || '-'}</span></td>
            <td class="text-center">
                <button class="btn-action view" onclick="verDetalle(${pesaje.id})" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action delete" onclick="eliminarPesaje(${pesaje.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tblPesajesBody.appendChild(tr);
    });
    
    // Actualizar controles de paginación
    actualizarControlesPaginacion(datosFiltrados.length);
}

// Actualizar controles de paginación
function actualizarControlesPaginacion(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    paginacionInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    
    btnAnterior.disabled = currentPage === 1;
    btnSiguiente.disabled = currentPage >= totalPages || totalPages === 0;
}

// Actualizar el resumen
function actualizarResumen() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaResumen').textContent = formatearFecha(hoy);
    
    const totalPesajes = pesajesData.length;
    
    // Filtrar pesajes de hoy manejando diferentes formatos de fecha
    const pesajesHoy = pesajesData.filter(p => {
        if (!p.receivedAt) return false;
        const fechaRecibido = new Date(p.receivedAt);
        if (isNaN(fechaRecibido.getTime())) return false;
        return fechaRecibido.toISOString().split('T')[0] === hoy;
    }).length;
    
    document.getElementById('totalPesajes').textContent = totalPesajes.toLocaleString('es-CL');
    document.getElementById('pesajesHoy').textContent = pesajesHoy.toLocaleString('es-CL');
}

// Ver detalle de un pesaje
function verDetalle(id) {
    const pesaje = pesajesData.find(p => p.id === id);
    if (!pesaje) return;
    
    const fechaRecibido = pesaje.receivedAt ? new Date(pesaje.receivedAt) : new Date();
    
    // Construir HTML del detalle
    let html = `
        <div class="detail-header">
            <div class="detail-item">
                <span class="detail-label">ID API:</span>
                <span class="detail-value">${pesaje.id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">ID Sistema:</span>
                <span class="detail-value">${pesaje.idraM}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Recibido:</span>
                <span class="detail-value">${fechaRecibido.toLocaleString('es-CL')}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Datos del Vehículo</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Patente:</span>
                    <span class="detail-value">${pesaje.patente}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tipo:</span>
                    <span class="detail-value">${pesaje.tipo || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tara:</span>
                    <span class="detail-value">${pesaje.tara || '-'} kg</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ubicación:</span>
                    <span class="detail-value">${pesaje.ubicacionOUT || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Datos del Cliente</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Razón Social:</span>
                    <span class="detail-value">${pesaje.cliente1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">RUT:</span>
                    <span class="detail-value">${pesaje.rutCliente1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">${pesaje.fonoCliente1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Condición:</span>
                    <span class="detail-value">${pesaje.condicion || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Producto Principal</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Producto:</span>
                    <span class="detail-value">${pesaje.producto1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Código:</span>
                    <span class="detail-value">${pesaje.producto1code || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Peso Neto:</span>
                    <span class="detail-value">${pesaje.pN1 || 0} kg</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Valor Unitario:</span>
                    <span class="detail-value">$${pesaje.producto1valor || 0}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Valor Total:</span>
                    <span class="detail-value">$${pesaje.producto1ValorTotal || 0}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Almacenaje:</span>
                    <span class="detail-value">${pesaje.almacenaje || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Calidad del Producto</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Humedad:</span>
                    <span class="detail-value">${pesaje.humedad || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Gluten:</span>
                    <span class="detail-value">${pesaje.gluten || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Categoría:</span>
                    <span class="detail-value">${pesaje.categoria || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Falling Number:</span>
                    <span class="detail-value">${pesaje.fallingNumber || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Peso Específico:</span>
                    <span class="detail-value">${pesaje.especifico || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">N° Muestra:</span>
                    <span class="detail-value">${pesaje.nMuestra || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Conductor de Salida</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Nombre:</span>
                    <span class="detail-value">${pesaje.cOutNom || '-'} ${pesaje.cOutAp || ''}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">RUT:</span>
                    <span class="detail-value">${pesaje.cOutRut || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">${pesaje.cOutFono || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Información del Pesaje</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Proceso:</span>
                    <span class="detail-value">${pesaje.Proceso || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tipo Pesaje:</span>
                    <span class="detail-value">${pesaje.PesajeTipo || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Valor Pesaje:</span>
                    <span class="detail-value">${pesaje.PesajeValor || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Guía Despacho:</span>
                    <span class="detail-value">${pesaje.gDespacho1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fecha Salida:</span>
                    <span class="detail-value">${pesaje.fechaOut1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Hora Salida:</span>
                    <span class="detail-value">${pesaje.horaOut1 || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Usuario:</span>
                    <span class="detail-value">${pesaje.UserOut || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h4>Observaciones</h4>
            <div class="observaciones">
                <p><strong>Entrada:</strong> ${pesaje.oBsEntrada || 'Sin observaciones'}</p>
                <p><strong>Salida:</strong> ${pesaje.oBsSalida || 'Sin observaciones'}</p>
            </div>
        </div>
    `;
    
    // Si hay producto 2, agregar sección
    if (pesaje.producto2) {
        html += `
            <div class="detail-section">
                <h4>Producto Secundario</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Producto:</span>
                        <span class="detail-value">${pesaje.producto2}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cantidad:</span>
                        <span class="detail-value">${pesaje.producto2cantidad || 0} kg</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Valor Unitario:</span>
                        <span class="detail-value">$${pesaje.producto2valor || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Valor Total:</span>
                        <span class="detail-value">$${pesaje.producto2ValorTotal || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    document.getElementById('detalleId').textContent = `#${pesaje.id}`;
    document.getElementById('detalleContenido').innerHTML = html;
    modalVerDetalle.style.display = 'flex';
}

// Eliminar pesaje llamando a la API de Google Apps Script
async function eliminarPesaje(id) {
    if (!confirm('¿Está seguro de eliminar este registro de pesaje? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const pesaje = pesajesData.find(p => p.id === id);
    if (!pesaje) {
        mostrarAlerta('Registro no encontrado', 'error');
        return;
    }
    
    // Si es un dato inicial, solo se puede eliminar localmente
    if (pesaje.origen === 'inicial') {
        mostrarAlerta('Los datos iniciales no se pueden eliminar desde la API. Edita el archivo pesaje_datos_iniciales.js', 'warning');
        return;
    }
    
    try {
        // Llamar a la API con parámetro de eliminación
        const url = `${SCRIPT_URL}?accion=eliminar&id=${id}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error al eliminar el registro');
        }
        
        const resultado = await response.json();
        
        if (resultado.success) {
            // Eliminar del array local
            pesajesData = pesajesData.filter(p => p.id !== id);
            actualizarTablaPesajes();
            actualizarResumen();
            mostrarAlerta('Registro eliminado correctamente', 'success');
        } else {
            mostrarAlerta(`Error: ${resultado.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error al eliminar el pesaje:', error);
        mostrarAlerta('Error al eliminar el registro. Intente eliminar directamente en Google Sheets.', 'error');
        // Abrir Google Sheets como alternativa
        window.open('https://docs.google.com/spreadsheets', '_blank');
    }
}

// Exportar a JSON
function exportarJSON() {
    const dataStr = JSON.stringify(pesajesData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pesajes_api_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Funciones auxiliares
function formatearFecha(fecha) {
    const partes = fecha.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = btnToggleTheme.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

function mostrarAlerta(mensaje, tipo) {
    // Implementación simple de alerta
    alert(mensaje);
}
