/**
 * Módulo de Ventas - Funcionalidad Principal
 * 
 * Este archivo contiene toda la lógica de JavaScript necesaria para el funcionamiento
 * del módulo de ventas del sistema ERP.
 */

// Variables globales
let carrito = [];
let clienteSeleccionado = null;
let productos = [];

// Inicialización cuando el DOM esté completamente cargado
$(document).ready(function() {
    inicializarComponentes();
    cargarProductos();
    cargarClientes();
    actualizarContadores();
});

/**
 * Inicializa los componentes de la interfaz
 */
function inicializarComponentes() {
    // Inicializar tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Inicializar selects con select2 si está disponible
    if ($.fn.select2) {
        $('.select2').select2({
            theme: 'bootstrap-5',
            placeholder: 'Seleccione una opción',
            allowClear: true
        });
    }
    
    // Inicializar datepickers
    $('.datepicker').datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        todayHighlight: true,
        language: 'es'
    });
    
    // Manejadores de eventos
    manejarEventos();
}

/**
 * Configura los manejadores de eventos de la interfaz
 */
function manejarEventos() {
    // Búsqueda de productos
    $('#buscarProducto').on('keyup', function() {
        const termino = $(this).val().toLowerCase();
        filtrarProductos(termino);
    });
    
    // Búsqueda de clientes
    $('#buscarCliente').on('keyup', function() {
        const termino = $(this).val().toLowerCase();
        buscarClientes(termino);
    });
    
    // Agregar producto al carrito
    $(document).on('click', '.producto-card', function() {
        const productoId = $(this).data('id');
        const producto = productos.find(p => p.id === productoId);
        
        if (producto) {
            agregarAlCarrito(producto);
        }
    });
    
    // Eliminar producto del carrito
    $(document).on('click', '.btn-eliminar-item', function(e) {
        e.stopPropagation();
        const itemId = $(this).data('id');
        eliminarDelCarrito(itemId);
    });
    
    // Actualizar cantidad en el carrito
    $(document).on('change', '.cantidad-item', function() {
        const itemId = $(this).data('id');
        const nuevaCantidad = parseInt($(this).val());
        actualizarCantidad(itemId, nuevaCantidad);
    });
    
    // Procesar pago
    $('#btnPagar').click(function() {
        procesarPago();
    });
    
    // Guardar como borrador
    $('#btnGuardarBorrador').click(function() {
        guardarBorrador();
    });
}

/**
 * Carga los productos desde la API
 */
function cargarProductos() {
    // Aquí iría la llamada a la API para obtener los productos
    // Por ahora usamos datos de ejemplo
    productos = [
        { id: 1, codigo: 'PROD-001', nombre: 'Producto de Ejemplo', precio: 99.99, stock: 50, categoria: 'General' },
        // Más productos de ejemplo...
    ];
    
    renderizarProductos(productos);
}

/**
 * Filtra los productos según el término de búsqueda
 * @param {string} termino - Término de búsqueda
 */
function filtrarProductos(termino) {
    const productosFiltrados = productos.filter(producto => 
        producto.nombre.toLowerCase().includes(termino) || 
        producto.codigo.toLowerCase().includes(termino)
    );
    
    renderizarProductos(productosFiltrados);
}

/**
 * Renderiza la lista de productos en la interfaz
 * @param {Array} productosLista - Lista de productos a mostrar
 */
function renderizarProductos(productosLista) {
    const $lista = $('#listaProductos');
    $lista.empty();
    
    if (productosLista.length === 0) {
        $lista.html(`
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="text-muted">No se encontraron productos</p>
            </div>
        `);
        return;
    }
    
    productosLista.forEach(producto => {
        $lista.append(`
            <div class="col-md-4 mb-4">
                <div class="card product-card h-100" data-id="${producto.id}">
                    <img src="https://via.placeholder.com/150" class="card-img-top" alt="${producto.nombre}">
                    <div class="card-body">
                        <h6 class="card-title">${producto.nombre}</h6>
                        <p class="card-text text-muted small">Código: ${producto.codigo}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 text-primary">$${producto.precio.toFixed(2)}</h5>
                            <span class="badge bg-${producto.stock > 0 ? 'success' : 'danger'}">
                                ${producto.stock > 0 ? `En stock: ${producto.stock}` : 'Sin stock'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `);
    });
}

/**
 * Agrega un producto al carrito
 * @param {Object} producto - Producto a agregar
 */
function agregarAlCarrito(producto) {
    // Verificar si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.id === producto.id);
    
    if (itemExistente) {
        // Si ya existe, incrementar la cantidad
        itemExistente.cantidad += 1;
    } else {
        // Si no existe, agregar nuevo ítem
        carrito.push({
            id: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }
    
    actualizarCarrito();
    mostrarNotificacion('Producto agregado al carrito', 'success');
}

/**
 * Elimina un ítem del carrito
 * @param {number} itemId - ID del ítem a eliminar
 */
function eliminarDelCarrito(itemId) {
    carrito = carrito.filter(item => item.id !== itemId);
    actualizarCarrito();
    mostrarNotificacion('Producto eliminado del carrito', 'warning');
}

/**
 * Actualiza la cantidad de un ítem en el carrito
 * @param {number} itemId - ID del ítem
 * @param {number} cantidad - Nueva cantidad
 */
function actualizarCantidad(itemId, cantidad) {
    const item = carrito.find(item => item.id === itemId);
    if (item) {
        item.cantidad = cantidad > 0 ? cantidad : 1;
        actualizarCarrito();
    }
}

/**
 * Actualiza la interfaz del carrito
 */
function actualizarCarrito() {
    const $listaCarrito = $('#listaCarrito');
    
    if (carrito.length === 0) {
        $listaCarrito.html(`
            <div class="text-muted text-center py-3">
                <i class="fas fa-shopping-cart fa-3x mb-3"></i>
                <p>No hay productos en el carrito</p>
            </div>
        `);
    } else {
        $listaCarrito.empty();
        
        carrito.forEach(item => {
            const subtotal = item.precio * item.cantidad;
            
            $listaCarrito.append(`
                <div class="cart-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${item.nombre}</h6>
                            <small class="text-muted">${item.codigo}</small>
                        </div>
                        <button class="btn btn-sm btn-link text-danger btn-eliminar-item" data-id="${item.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <div class="input-group input-group-sm" style="width: 120px;">
                            <button class="btn btn-outline-secondary btn-sm" type="button" onclick="actualizarCantidad(${item.id}, ${item.cantidad - 1})">-</button>
                            <input type="number" class="form-control text-center cantidad-item" 
                                   data-id="${item.id}" value="${item.cantidad}" min="1">
                            <button class="btn btn-outline-secondary btn-sm" type="button" onclick="actualizarCantidad(${item.id}, ${item.cantidad + 1})">+</button>
                        </div>
                        <span class="fw-bold">$${subtotal.toFixed(2)}</span>
                    </div>
                </div>
            `);
        });
    }
    
    actualizarTotales();
    actualizarContadores();
}

/**
 * Actualiza los totales del carrito
 */
function actualizarTotales() {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.19; // 19% de IVA
    const total = subtotal + impuestos;
    
    $('#subtotal').text(`$${subtotal.toFixed(2)}`);
    $('#impuestos').text(`$${impuestos.toFixed(2)}`);
    $('#total').text(`$${total.toFixed(2)}`);
}

/**
 * Actualiza los contadores de la interfaz
 */
function actualizarContadores() {
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    $('#contadorProductos').text(totalItems);
    
    // Actualizar el contador en el menú si existe
    const $contadorCarrito = $('.contador-carrito');
    if ($contadorCarrito.length) {
        $contadorCarrito.text(totalItems);
        $contadorCarrito.toggle(totalItems > 0);
    }
}

/**
 * Procesa el pago de la venta actual
 */
function procesarPago() {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío', 'warning');
        return;
    }
    
    if (!clienteSeleccionado) {
        mostrarNotificacion('Debe seleccionar un cliente', 'warning');
        return;
    }
    
    // Aquí iría la lógica para procesar el pago
    // Por ahora mostramos un mensaje de éxito
    mostrarNotificacion('Venta procesada correctamente', 'success');
    
    // Limpiar el carrito después de la venta
    carrito = [];
    actualizarCarrito();
    
    // Redirigir al listado de ventas después de 2 segundos
    setTimeout(() => {
        window.location.href = 'listado_ventas.html';
    }, 2000);
}

/**
 * Guarda la venta actual como borrador
 */
function guardarBorrador() {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío', 'warning');
        return;
    }
    
    // Aquí iría la lógica para guardar como borrador
    mostrarNotificacion('Venta guardada como borrador', 'info');
    
    // Limpiar el carrito
    carrito = [];
    actualizarCarrito();
}

/**
 * Muestra una notificación en la interfaz
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación (success, error, warning, info)
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Usar toast de Bootstrap si está disponible
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            // Crear el contenedor de toasts si no existe
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '11';
            document.body.appendChild(container);
        }
        
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${mensaje}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 3000 });
        bsToast.show();
        
        // Eliminar el toast del DOM después de que se oculte
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    } else {
        // Fallback a alert si no está disponible Bootstrap Toast
        alert(mensaje);
    }
}

// Funciones para la búsqueda de clientes
function cargarClientes() {
    // Aquí iría la llamada a la API para obtener los clientes
    // Por ahora usamos datos de ejemplo
    window.clientes = [
        { id: 1, nombre: 'Cliente de Ejemplo', documento: '12345678', telefono: '+56 9 1234 5678', email: 'cliente@ejemplo.com' },
        // Más clientes de ejemplo...
    ];
}

function buscarClientes(termino) {
    if (!termino || termino.length < 2) {
        $('#listaClientes').empty().hide();
        return;
    }
    
    const resultados = window.clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(termino) || 
        (cliente.documento && cliente.documento.includes(termino))
    );
    
    const $lista = $('<div>').addClass('list-group position-absolute w-100 z-index-1');
    
    if (resultados.length === 0) {
        $lista.append('<div class="list-group-item">No se encontraron clientes</div>');
    } else {
        resultados.forEach(cliente => {
            $lista.append(`
                <a href="#" class="list-group-item list-group-item-action cliente-item" 
                   data-id="${cliente.id}" 
                   data-nombre="${cliente.nombre}"
                   data-documento="${cliente.documento || ''}"
                   data-telefono="${cliente.telefono || ''}"
                   data-email="${cliente.email || ''}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${cliente.nombre}</h6>
                        <small>${cliente.documento || 'Sin documento'}</small>
                    </div>
                    <p class="mb-1">${cliente.email || ''}</p>
                    <small>${cliente.telefono || ''}</small>
                </a>
            `);
        });
    }
    
    const $contenedor = $('#contenedorListaClientes');
    if ($contenedor.length === 0) {
        $('body').append('<div id="contenedorListaClientes"></div>');
    }
    
    const inputRect = $('#buscarCliente')[0].getBoundingClientRect();
    $('#contenedorListaClientes')
        .empty()
        .append($lista)
        .css({
            position: 'fixed',
            top: inputRect.bottom + window.scrollY + 5 + 'px',
            left: inputRect.left + 'px',
            width: inputRect.width + 'px',
            'max-height': '300px',
            'overflow-y': 'auto',
            'z-index': '1050',
            'display': 'block'
        });
    
    // Manejador de clic en un cliente
    $('.cliente-item').on('click', function(e) {
        e.preventDefault();
        seleccionarCliente($(this).data());
    });
    
    // Ocultar la lista al hacer clic fuera
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#buscarCliente, #contenedorListaClientes').length) {
            $('#contenedorListaClientes').hide();
        }
    });
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    $('#nombreCliente').text(cliente.nombre);
    $('#contenedorListaClientes').hide();
    $('#buscarCliente').val(cliente.nombre);
    
    // Mostrar información adicional del cliente si existe el elemento
    if ($('#infoCliente').length) {
        $('#infoCliente').html(`
            <p class="mb-1"><strong>Documento:</strong> ${cliente.documento || 'No especificado'}</p>
            <p class="mb-1"><strong>Teléfono:</strong> ${cliente.telefono || 'No especificado'}</p>
            <p class="mb-0"><strong>Correo:</strong> ${cliente.email || 'No especificado'}</p>
        `);
    }
    
    mostrarNotificacion(`Cliente seleccionado: ${cliente.nombre}`, 'success');
}

// Hacer las funciones accesibles globalmente
window.actualizarCantidad = actualizarCantidad;
