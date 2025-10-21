// Variables globales
let pesajes = [];
let productos = [];

// Clase para manejar los pesajes
class Pesaje {
    constructor(id, producto, peso, fecha, notas = '') {
        this.id = id || Date.now();
        this.producto = producto;
        this.peso = parseFloat(peso);
        this.fecha = fecha || new Date().toISOString();
        this.notas = notas;
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    cargarPesajes();
    configurarEventos();
});

// Configura los eventos de los elementos
function configurarEventos() {
    // Registrar nuevo pesaje
    document.getElementById('btnRegistrar').addEventListener('click', registrarPesaje);
    
    // Guardar cambios en la edición
    document.getElementById('btnGuardarCambios').addEventListener('click', guardarCambiosPesaje);
}

// Carga los productos disponibles
function cargarProductos() {
    // Aquí podrías hacer una llamada a una API o cargar desde localStorage
    // Por ahora usaremos datos de ejemplo
    productos = [
        { id: 1, nombre: 'Cemento' },
        { id: 2, nombre: 'Arena' },
        { id: 3, nombre: 'Grava' },
        { id: 4, nombre: 'Agua' },
        { id: 5, nombre: 'Aditivos' }
    ];

    const selectProducto = document.getElementById('producto');
    const selectEditar = document.getElementById('editarProducto');
    
    // Limpiar selects
    selectProducto.innerHTML = '<option value="">Seleccione un producto</option>';
    selectEditar.innerHTML = '<option value="">Seleccione un producto</option>';
    
    // Llenar selects con los productos
    productos.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = producto.nombre;
        
        const optionEditar = option.cloneNode(true);
        
        selectProducto.appendChild(option);
        selectEditar.appendChild(optionEditar);
    });
}

// Carga los pesajes guardados
function cargarPesajes() {
    // Aquí podrías cargar desde una API o localStorage
    // Por ahora usaremos datos de ejemplo
    if (localStorage.getItem('pesajes')) {
        pesajes = JSON.parse(localStorage.getItem('pesajes'));
    } else {
        // Datos de ejemplo
        pesajes = [
            new Pesaje(1, 1, 25.5, '2025-10-20T10:30:00', 'Primer pesaje de prueba'),
            new Pesaje(2, 3, 15.2, '2025-10-21T11:45:00', 'Segundo pesaje de prueba')
        ];
        guardarPesajes();
    }
    
    actualizarTablaPesajes();
}

// Guarda los pesajes en el almacenamiento local
function guardarPesajes() {
    localStorage.setItem('pesajes', JSON.stringify(pesajes));
}

// Actualiza la tabla de pesajes
function actualizarTablaPesajes() {
    const tbody = document.querySelector('#tablaPesajes tbody');
    tbody.innerHTML = '';
    
    if (pesajes.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" class="text-center">No hay registros de pesaje</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Ordenar por fecha descendente
    const pesajesOrdenados = [...pesajes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    pesajesOrdenados.forEach(pesaje => {
        const tr = document.createElement('tr');
        const producto = productos.find(p => p.id == pesaje.producto) || { nombre: 'Desconocido' };
        
        tr.innerHTML = `
            <td>${formatearFecha(pesaje.fecha)}</td>
            <td>${producto.nombre}</td>
            <td>${parseFloat(pesaje.peso).toFixed(2)} kg</td>
            <td>
                <button class="btn btn-sm btn-warning btn-editar" data-id="${pesaje.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-eliminar" data-id="${pesaje.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEditar(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => confirmarEliminar(parseInt(btn.dataset.id)));
    });
}

// Formatea la fecha para mostrarla
function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Registra un nuevo pesaje
function registrarPesaje() {
    const productoId = document.getElementById('producto').value;
    const peso = document.getElementById('peso').value;
    const notas = document.getElementById('notas').value;
    
    // Validaciones
    if (!productoId) {
        mostrarAlerta('error', 'Error', 'Debe seleccionar un producto');
        return;
    }
    
    if (!peso || isNaN(peso) || parseFloat(peso) <= 0) {
        mostrarAlerta('error', 'Error', 'El peso debe ser un número mayor a cero');
        return;
    }
    
    // Crear y guardar el pesaje
    const nuevoPesaje = new Pesaje(null, parseInt(productoId), parseFloat(peso), null, notas);
    pesajes.push(nuevoPesaje);
    guardarPesajes();
    
    // Limpiar formulario
    document.getElementById('peso').value = '';
    document.getElementById('notas').value = '';
    
    // Actualizar tabla
    actualizarTablaPesajes();
    
    mostrarAlerta('success', 'Éxito', 'Pesaje registrado correctamente');
}

// Abre el modal para editar un pesaje
function abrirModalEditar(id) {
    const pesaje = pesajes.find(p => p.id === id);
    if (!pesaje) return;
    
    document.getElementById('editarId').value = pesaje.id;
    document.getElementById('editarProducto').value = pesaje.producto;
    document.getElementById('editarPeso').value = pesaje.peso;
    document.getElementById('editarNotas').value = pesaje.notas || '';
    
    const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
    modal.show();
}

// Guarda los cambios de un pesaje editado
function guardarCambiosPesaje() {
    const id = parseInt(document.getElementById('editarId').value);
    const productoId = document.getElementById('editarProducto').value;
    const peso = document.getElementById('editarPeso').value;
    const notas = document.getElementById('editarNotas').value;
    
    // Validaciones
    if (!productoId) {
        mostrarAlerta('error', 'Error', 'Debe seleccionar un producto');
        return;
    }
    
    if (!peso || isNaN(peso) || parseFloat(peso) <= 0) {
        mostrarAlerta('error', 'Error', 'El peso debe ser un número mayor a cero');
        return;
    }
    
    // Actualizar el pesaje
    const index = pesajes.findIndex(p => p.id === id);
    if (index !== -1) {
        pesajes[index].producto = parseInt(productoId);
        pesajes[index].peso = parseFloat(peso);
        pesajes[index].notas = notas;
        
        guardarPesajes();
        actualizarTablaPesajes();
        
        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditar'));
        modal.hide();
        
        mostrarAlerta('success', 'Éxito', 'Pesaje actualizado correctamente');
    }
}

// Confirma la eliminación de un pesaje
function confirmarEliminar(id) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarPesaje(id);
        }
    });
}

// Elimina un pesaje
function eliminarPesaje(id) {
    pesajes = pesajes.filter(p => p.id !== id);
    guardarPesajes();
    actualizarTablaPesajes();
    
    mostrarAlerta('success', 'Eliminado', 'El pesaje ha sido eliminado');
}

// Muestra una alerta usando SweetAlert2
function mostrarAlerta(icon, title, text) {
    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
}
