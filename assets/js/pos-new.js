// Configuración específica para Chile
const CONFIG_CHILE = {
    moneda: 'CLP$',
    iva: 0.19,  // 19% de IVA
    decimales: 0,  // En Chile los precios se redondean al peso
    formatoMoneda: {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
        currencyDisplay: 'symbol'
    },
    metodosPago: [
        { id: 'efectivo', nombre: 'Efectivo', icono: 'money-bill-wave' },
        { id: 'debito', nombre: 'Tarjeta de Débito', icono: 'credit-card' },
        { id: 'credito', nombre: 'Tarjeta de Crédito', icono: 'credit-card' },
        { id: 'transferencia', nombre: 'Transferencia', icono: 'exchange-alt' },
        { id: 'cheque', nombre: 'Cheque', icono: 'money-check' },
        { id: 'valevista', nombre: 'Vale Vista', icono: 'receipt' },
        { id: 'otro', nombre: 'Otro', icono: 'ellipsis-h' }
    ],
    tiposDocumento: [
        { id: 'boleta', nombre: 'Boleta Electrónica', requiereCliente: false },
        { id: 'factura', nombre: 'Factura Electrónica', requiereCliente: true },
        { id: 'factura_exenta', nombre: 'Factura Exenta Electrónica', requiereCliente: true }
    ]
};

// Variables globales
let carrito = [];
let productos = [];
let categorias = [];

// Elementos del DOM
const elementos = {
    // Elementos principales
    buscarProducto: document.getElementById('buscarProducto'),
    listaProductos: document.getElementById('listaProductos'),
    carritoItems: document.getElementById('carritoItems'),
    subtotalElement: document.getElementById('subtotal'),
    impuestosElement: document.getElementById('impuestos'),
    totalElement: document.getElementById('total'),
    contadorCarrito: document.getElementById('contadorCarrito'),
    pagar: document.getElementById('pagar')
};

// Inicialización del DOM cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    inicializarPOS();
    configurarEventos();
    cargarDatosEjemplo().then(() => {
        renderizarProductos();
        renderizarCategorias();
    });
});

// Función para formatear moneda según formato chileno
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

// Función para configurar los eventos del DOM
function configurarEventos() {
    // Buscar producto
    if (elementos.buscarProducto) {
        elementos.buscarProducto.addEventListener('input', (e) => {
            renderizarProductos(e.target.value);
        });
    }

    // Botón de pagar
    if (elementos.pagar) {
        elementos.pagar.addEventListener('click', abrirModalPago);
    }
}

// Función para abrir la página de proceso de pago
function abrirModalPago() {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío', 'error');
        return;
    }
    
    // Guardar el carrito actual en localStorage
    localStorage.setItem('carritoPendiente', JSON.stringify(carrito));
    
    // Redirigir a la página de proceso de pago
    window.location.href = '/modules/pos/proceso.html';
}

// Función para limpiar el carrito
function limpiarCarrito() {
    carrito = [];
    actualizarCarrito();
    mostrarNotificacion('Carrito vaciado correctamente', 'success');
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <span>${mensaje}</span>
        <button class="cerrar-notificacion">&times;</button>
    `;
    
    document.body.appendChild(notificacion);
    
    // Cerrar notificación al hacer clic en el botón
    const btnCerrar = notificacion.querySelector('.cerrar-notificacion');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            notificacion.remove();
        });
    }
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
        if (document.body.contains(notificacion)) {
            notificacion.remove();
        }
    }, 5000);
}

// Inicializar el POS
function inicializarPOS() {
    // Cargar carrito guardado si existe
    const carritoGuardado = localStorage.getItem('carritoPendiente');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarCarrito();
    }
}

// Cargar datos de ejemplo
async function cargarDatosEjemplo() {
    // Simular carga de datos
    return new Promise((resolve) => {
        // Datos de ejemplo
        productos = [
            { id: 1, codigo: 'P001', nombre: 'Producto 1', precio: 1990, stock: 10, categoria: 'Categoría 1' },
            { id: 2, codigo: 'P002', nombre: 'Producto 2', precio: 2990, stock: 5, categoria: 'Categoría 1' },
            { id: 3, codigo: 'P003', nombre: 'Producto 3', precio: 3990, stock: 8, categoria: 'Categoría 2' },
            { id: 4, codigo: 'P004', nombre: 'Producto 4', precio: 4990, stock: 3, categoria: 'Categoría 2' },
            { id: 5, codigo: 'P005', nombre: 'Producto 5', precio: 5990, stock: 12, categoria: 'Categoría 3' },
        ];
        
        // Obtener categorías únicas
        categorias = [...new Set(productos.map(p => p.categoria))].map((categoria, index) => ({
            id: index + 1,
            nombre: categoria
        }));
        
        resolve();
    });
}

// Renderizar productos
function renderizarProductos(filtro = '') {
    if (!elementos.listaProductos) return;
    
    let productosFiltrados = productos;
    
    if (filtro) {
        const busqueda = filtro.toLowerCase();
        productosFiltrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(busqueda) || 
            p.codigo.toLowerCase().includes(busqueda)
        );
    }
    
    elementos.listaProductos.innerHTML = productosFiltrados.map(producto => `
        <div class="producto" data-id="${producto.id}">
            <div class="producto-info">
                <span class="producto-codigo">${producto.codigo}</span>
                <h3 class="producto-nombre">${producto.nombre}</h3>
                <div class="producto-precio">${formatearMoneda(producto.precio)}</div>
                <div class="producto-stock">Stock: ${producto.stock}</div>
            </div>
            <button class="btn-agregar" data-id="${producto.id}">
                <i class="fas fa-plus"></i> Agregar
            </button>
        </div>
    `).join('');
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id || e.target.closest('.btn-agregar').dataset.id);
            const producto = productos.find(p => p.id === id);
            if (producto) {
                agregarAlCarrito(producto);
            }
        });
    });
}

// Renderizar categorías
function renderizarCategorias() {
    const contenedorCategorias = document.getElementById('categorias');
    if (!contenedorCategorias) return;
    
    // Agregar botón para mostrar todos los productos
    const botonTodos = `
        <button class="categoria-btn active" data-categoria="todos">
            <i class="fas fa-th"></i>
            <span>Todos</span>
        </button>
    `;
    
    // Agregar botones de categorías
    const botonesCategorias = categorias.map(categoria => `
        <button class="categoria-btn" data-categoria="${categoria.id}">
            <i class="fas fa-tag"></i>
            <span>${categoria.nombre}</span>
        </button>
    `).join('');
    
    contenedorCategorias.innerHTML = botonTodos + botonesCategorias;
    
    // Agregar eventos a los botones de categoría
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoria = e.currentTarget.dataset.categoria;
            document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (categoria === 'todos') {
                renderizarProductos();
            } else {
                const categoriaSeleccionada = categorias.find(c => c.id === parseInt(categoria));
                if (categoriaSeleccionada) {
                    const productosFiltrados = productos.filter(p => p.categoria === categoriaSeleccionada.nombre);
                    renderizarProductos('');
                    // Filtrado visual
                    document.querySelectorAll('.producto').forEach(prod => {
                        const id = parseInt(prod.dataset.id);
                        const producto = productos.find(p => p.id === id);
                        if (producto && producto.categoria !== categoriaSeleccionada.nombre) {
                            prod.style.display = 'none';
                        } else {
                            prod.style.display = 'flex';
                        }
                    });
                }
            }
        });
    });
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    const productoEnCarrito = carrito.find(item => item.id === producto.id);
    
    if (productoEnCarrito) {
        // Verificar stock
        if (productoEnCarrito.cantidad >= producto.stock) {
            mostrarNotificacion('No hay suficiente stock disponible', 'error');
            return;
        }
        productoEnCarrito.cantidad++;
    } else {
        // Verificar stock
        if (producto.stock <= 0) {
            mostrarNotificacion('Producto sin stock disponible', 'error');
            return;
        }
        carrito.push({
            ...producto,
            cantidad: 1
        });
    }
    
    actualizarCarrito();
    mostrarNotificacion(`${producto.nombre} agregado al carrito`, 'success');
}

// Actualizar la vista del carrito
function actualizarCarrito() {
    if (!elementos.carritoItems) return;
    
    // Actualizar lista de productos en el carrito
    elementos.carritoItems.innerHTML = carrito.map((item, index) => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <span class="carrito-item-nombre">${item.nombre}</span>
                <span class="carrito-item-precio">${formatearMoneda(item.precio)} c/u</span>
            </div>
            <div class="carrito-item-cantidad">
                <button class="btn-cantidad" data-index="${index}" data-cambio="-1">-</button>
                <span>${item.cantidad}</span>
                <button class="btn-cantidad" data-index="${index}" data-cambio="1">+</button>
            </div>
            <div class="carrito-item-subtotal">
                ${formatearMoneda(item.precio * item.cantidad)}
            </div>
            <button class="btn-eliminar" data-index="${index}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Calcular totales
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.19; // 19% de IVA
    const total = subtotal + impuestos;
    
    // Actualizar totales
    if (elementos.subtotalElement) elementos.subtotalElement.textContent = formatearMoneda(subtotal);
    if (elementos.impuestosElement) elementos.impuestosElement.textContent = formatearMoneda(impuestos);
    if (elementos.totalElement) elementos.totalElement.textContent = formatearMoneda(total);
    
    // Actualizar contador de carrito
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    if (elementos.contadorCarrito) {
        elementos.contadorCarrito.textContent = totalItems;
        elementos.contadorCarrito.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // Agregar eventos a los botones de cantidad
    document.querySelectorAll('.btn-cantidad').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const cambio = parseInt(e.currentTarget.dataset.cambio);
            actualizarCantidad(index, cambio);
        });
    });
    
    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const producto = carrito[index];
            carrito.splice(index, 1);
            actualizarCarrito();
            mostrarNotificacion(`${producto.nombre} eliminado del carrito`, 'warning');
        });
    });
}

// Actualizar cantidad de un producto en el carrito
function actualizarCantidad(index, cambio) {
    if (index < 0 || index >= carrito.length) return;
    
    const item = carrito[index];
    
    if (cambio > 0) {
        // Incrementar cantidad si hay stock
        if (item.cantidad < item.stock) {
            item.cantidad += cambio;
        } else {
            mostrarNotificacion(`No hay suficiente stock de ${item.nombre}`, 'error');
            return;
        }
    } else {
        // Decrementar cantidad
        item.cantidad += cambio;
        
        // Si la cantidad llega a 0, eliminar del carrito
        if (item.cantidad <= 0) {
            carrito.splice(index, 1);
        }
    }
    
    actualizarCarrito();
}

// Estilos para las notificaciones
const estilosNotificaciones = document.createElement('style');
estilosNotificaciones.textContent = `
    .notificacion {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 250px;
        max-width: 350px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: opacity 0.3s, transform 0.3s;
    }
    
    .notificacion.show {
        opacity: 1;
        transform: translateX(0);
    }
    
    .notificacion.success {
        background-color: #4CAF50;
    }
    
    .notificacion.error {
        background-color: #F44336;
    }
    
    .notificacion.warning {
        background-color: #FF9800;
    }
    
    .notificacion.info {
        background-color: #2196F3;
    }
    
    .cerrar-notificacion {
        background: none;
        border: none;
        color: white;
        font-size: 1.2em;
        cursor: pointer;
        margin-left: 10px;
    }
    
    .cerrar-notificacion:hover {
        opacity: 0.8;
    }
`;

document.head.appendChild(estilosNotificaciones);

// Agregar estilos para el contador de carrito
const estilosCarrito = document.createElement('style');
estilosCarrito.textContent = `
    #contadorCarrito {
        display: none;
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #F44336;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        align-items: center;
        justify-content: center;
    }
`;

document.head.appendChild(estilosCarrito);
