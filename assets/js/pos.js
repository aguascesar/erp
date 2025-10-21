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
let metodoPagoSeleccionado = null;
let secuenciaDocumento = 1;  // En producción, esto vendría de la base de datos

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
    pagar: document.getElementById('pagar'), // Botón de pagar
    
    // Elementos de tipo de documento
    tipoDocumento: document.getElementById('tipoDocumento'),
    
    // Elementos de datos del cliente
    datosCliente: document.getElementById('datosCliente'),
    rutCliente: document.getElementById('rutCliente'),
    nombreCliente: document.getElementById('nombreCliente'),
    giroCliente: document.getElementById('giroCliente'),
    direccionCliente: document.getElementById('direccionCliente'),
    comunaCliente: document.getElementById('comunaCliente'),
    ciudadCliente: document.getElementById('ciudadCliente'),
    
    // Elementos del resumen de la venta
    resumenSubtotal: document.getElementById('resumen-subtotal'),
    resumenIva: document.getElementById('resumen-iva'),
    resumenTotal: document.getElementById('resumen-total'),
    
    // Elementos de pago
    montoRecibido: document.getElementById('montoRecibido'),
    cambio: document.getElementById('cambio'),
    confirmarPago: document.getElementById('confirmarPago'),
    cancelarPago: document.getElementById('cancelarPago'),
    metodosPago: document.querySelectorAll('.metodo-pago'),
    
    // Elementos de IVA
    ivaLabel: document.querySelector('.resumen-item:nth-child(2) span:first-child'),
    
    // Elementos adicionales
    clienteNombre: document.getElementById('clienteNombre'),
    clienteEmail: document.getElementById('clienteEmail'),
    clienteTelefono: document.getElementById('clienteTelefono'),
    cancelarVenta: document.getElementById('cancelarVenta'),
    nuevaVenta: document.getElementById('nuevaVenta')
};

// Configuración de la aplicación
const CONFIG = {
    iva: 0.19, // 19% de IVA para Chile
    ivaExento: 0, // 0% para facturas exentas
    moneda: 'CLP$',
    decimales: 0
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
    return new Intl.NumberFormat('es-CL', CONFIG_CHILE.formatoMoneda).format(valor);
}

// Función para validar RUT chileno
function validarRUT(rut) {
    // Eliminar puntos y guión
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    
    // Validar formato
    if (!/^\d{7,8}[0-9kK]{1}$/.test(rut)) {
        return false;
    }
    
    // Separar número y dígito verificador
    let numero = rut.slice(0, -1);
    let dv = rut.slice(-1).toUpperCase();
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero.charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    let dvEsperado = 11 - (suma % 11);
    let dvCalculado = dvEsperado === 11 ? '0' : 
                     dvEsperado === 10 ? 'K' : 
                     dvEsperado.toString();
    
    return dv === dvCalculado;
}

// Función para formatear RUT
function formatearRUT(rut) {
    // Eliminar todo lo que no sea número o K
    rut = rut.replace(/[^0-9kK]/g, '');
    
    if (rut.length <= 1) return rut;
    
    // Separar número y DV
    let numero = rut.slice(0, -1);
    let dv = rut.slice(-1).toUpperCase();
    
    // Agregar puntos
    let rutFormateado = '';
    let contador = 0;
    
    for (let i = numero.length - 1; i >= 0; i--) {
        rutFormateado = numero.charAt(i) + rutFormateado;
        contador++;
        if (contador === 3 && i !== 0) {
            rutFormateado = '.' + rutFormateado;
            contador = 0;
        }
    }
    
    return rutFormateado + '-' + dv;
}

// Función para limpiar el carrito
function limpiarCarrito() {
    carrito = [];
    actualizarCarrito();
    
    // Limpiar búsqueda
    if (elementos.buscarProducto) {
        elementos.buscarProducto.value = '';
    }
    
    // Mostrar notificación
    mostrarNotificacion('El carrito ha sido vaciado', 'info');
}

// Función para configurar los eventos del DOM
function configurarEventos() {
    // Búsqueda de productos
    if (elementos.buscarProducto) {
        elementos.buscarProducto.addEventListener('input', (e) => {
            filtrarProductos(e.target.value);
        });
    }

    // Botón de pagar
    if (elementos.pagar) {
        elementos.pagar.addEventListener('click', abrirPanelPago);
    }

    // Botón de nueva venta
    if (elementos.nuevaVenta) {
        elementos.nuevaVenta.addEventListener('click', limpiarCarrito);
    }

    // Botón de cancelar venta
    if (elementos.cancelarVenta) {
        elementos.cancelarVenta.addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea cancelar la venta actual?')) {
                limpiarCarrito();
            }
        });
    }
    
    // Botón de confirmar pago
    if (elementos.confirmarPago) {
        elementos.confirmarPago.addEventListener('click', procesarPago);
    }
    
    // Botón de cancelar pago
    if (elementos.cancelarPago) {
        elementos.cancelarPago.addEventListener('click', cerrarPanelPago);
    }
    
    // Cerrar panel de pago al hacer clic en la X
    const cerrarPanelBtn = document.getElementById('cerrarPanelPago');
    if (cerrarPanelBtn) {
        cerrarPanelBtn.addEventListener('click', cerrarPanelPago);
    }
    
    // Cerrar panel al hacer clic fuera del contenido
    if (panelPagoOverlay) {
        panelPagoOverlay.addEventListener('click', cerrarPanelPago);
    }
    
    // Prevenir que el clic dentro del panel lo cierre
    if (panelPago) {
        panelPago.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Cerrar con la tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panelPago && panelPago.classList.contains('active')) {
            e.preventDefault();
            cerrarPanelPago();
        }
    });
    
    // Eventos de los métodos de pago
    if (elementos.metodosPago) {
        elementos.metodosPago.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                seleccionarMetodoPago(btn);
            });
        });
    }
}

// Inicialización del POS
async function inicializarPOS() {
    try {
        // Cargar datos de ejemplo (en un caso real, esto vendría de una API)
        await cargarDatosEjemplo();
        
        // Renderizar productos y categorías
        renderizarProductos();
        renderizarCategorias();
        
        // Actualizar carrito
        actualizarCarrito();
    } catch (error) {
        console.error('Error al inicializar el POS:', error);
        mostrarNotificacion('Error al cargar los datos del sistema', 'error');
    }
}

// Cargar datos de ejemplo
async function cargarDatosEjemplo() {
    return new Promise((resolve) => {
        // Categorías de ejemplo
        categorias = [
            { id: 1, nombre: 'Todos' },
            { id: 2, nombre: 'Bebidas' },
            { id: 3, nombre: 'Comida' },
            { id: 4, nombre: 'Snacks' },
            { id: 5, nombre: 'Limpieza' },
            { id: 6, nombre: 'Otros' }
        ];
        
        // Productos de ejemplo (precios en pesos chilenos)
        productos = [
            { id: 1, codigo: 'P001', nombre: 'Pepsi 600ml', precio: 1800, categoria: 2, stock: 50, descripcion: 'Bebida gaseosa 600ml' },
            { id: 2, codigo: 'P002', nombre: 'Papas 45g', precio: 1500, categoria: 4, stock: 30, descripcion: 'Papas fritas sabor natural' },
            { id: 3, codigo: 'P003', nombre: 'Jugo 500ml', precio: 1200, categoria: 2, stock: 45, descripcion: 'Jugo de frutas 500ml' },
            { id: 4, codigo: 'P004', nombre: 'Galletas', precio: 1600, categoria: 4, stock: 25, descripcion: 'Galletas de chocolate' },
            { id: 5, codigo: 'P005', nombre: 'Agua 1L', precio: 1000, categoria: 2, stock: 60, descripcion: 'Agua mineral sin gas' },
            { id: 6, codigo: 'P006', nombre: 'Pan Molde', precio: 3500, categoria: 3, stock: 20, descripcion: 'Pan de molde integral' },
            { id: 7, codigo: 'P007', nombre: 'Leche 1L', precio: 2500, categoria: 3, stock: 30, descripcion: 'Leche entera' },
            { id: 8, codigo: 'P008', nombre: 'Huevos 1d', precio: 4500, categoria: 3, stock: 15, descripcion: 'Huevos tamaño estándar' },
        ];
        
        setTimeout(resolve, 500); // Simular tiempo de carga
    });
}

// Función para obtener la ruta de la imagen del producto
function obtenerImagenProducto(codigo) {
    // Mapeo de códigos de producto a nombres de archivo de imagen
    const imagenes = {
        "P001": "Pepsi.png",
        "P002": "Papas.png",
        "P003": "Jugo.png",
        "P004": "Galletas.png",
        "P005": "Agua.png",
        "P006": "Pan.png",
        "P007": "Leche.png",
        "P008": "Huevos.png"
    };
    
    // Obtener el nombre del archivo de imagen o usar uno por defecto
    const nombreArchivo = imagenes[codigo] || "default-product.png";

    // Devolver la ruta correcta a la carpeta de imágenes de productos
    // Usamos / al inicio para que sea relativa a la raíz del sitio
    return `/assets/img/productos/${nombreArchivo}`;
}

// Renderizar productos en la interfaz
function renderizarProductos(filtro = '') {
    if (!elementos.listaProductos) return;
    
    // Filtrar productos
    const productosFiltrados = filtro
        ? productos.filter(p =>
            p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
            p.codigo.toLowerCase().includes(filtro.toLowerCase()))
        : productos;
    
    // Limpiar contenedor
    elementos.listaProductos.innerHTML = '';
    
    // Mostrar mensaje si no hay productos
    if (productosFiltrados.length === 0) {
        elementos.listaProductos.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                <p class="h5">No se encontraron productos</p>
                <p class="text-muted">Intenta con otro término de búsqueda</p>
            </div>`;
        return;
    }
    
    // Crear fila para las tarjetas
    const row = document.createElement('div');
    row.className = 'row';
    
    // Generar tarjetas de productos
    productosFiltrados.forEach(producto => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        // Obtener la ruta de la imagen del producto
        const imagenProducto = obtenerImagenProducto(producto.codigo);
        
        col.innerHTML = `
            <div class="card producto-card h-100" onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                <div class="producto-imagen-contenedor">
                    <img src="${imagenProducto}" 
                         alt="${producto.nombre}" 
                         class="producto-imagen"
                         onerror="this.onerror=null; this.src='assets/img/tech_avatar.svg'">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text text-muted mb-2">${producto.descripcion || 'Sin descripción'}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="h5 mb-0 text-primary">${formatearMoneda(producto.precio)}</span>
                        <span class="badge ${producto.stock > 0 ? 'bg-success' : 'bg-danger'}">
                            ${producto.stock > 0 ? `${producto.stock} disponibles` : 'Sin stock'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        row.appendChild(col);
    });
    
    elementos.listaProductos.appendChild(row);
}

// Renderizar categorías
function renderizarCategorias() {
    const contenedorCategorias = document.querySelector('.categorias');
    if (!contenedorCategorias) return;
    
    contenedorCategorias.innerHTML = '';
    
    categorias.forEach(categoria => {
        const boton = document.createElement('button');
        boton.className = 'btn btn-outline-primary me-2 mb-2';
        boton.textContent = categoria.nombre;
        boton.onclick = () => filtrarPorCategoria(categoria.id);
        contenedorCategorias.appendChild(boton);
    });
}

// Filtrar productos por categoría
function filtrarPorCategoria(categoriaId) {
    if (!elementos.listaProductos) return;
    
    // Si la categoría es 'Todos', mostrar todos los productos
    if (categoriaId === 1) {
        renderizarProductos();
        return;
    }
    
    // Filtrar productos por categoría
    const productosFiltrados = productos.filter(p => p.categoria === categoriaId);
    
    // Limpiar contenedor
    elementos.listaProductos.innerHTML = '';
    
    // Mostrar mensaje si no hay productos
    if (productosFiltrados.length === 0) {
        const categoria = categorias.find(c => c.id === categoriaId);
        elementos.listaProductos.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-folder-open fa-3x mb-3 text-muted"></i>
                <p class="h5">No hay productos en la categoría "${categoria ? categoria.nombre : 'seleccionada'}"</p>
                <button class="btn btn-primary mt-3" onclick="renderizarProductos()">
                    Ver todos los productos
                </button>
            </div>`;
        return;
    }
    
    // Crear fila para las tarjetas
    const row = document.createElement('div');
    row.className = 'row';
    
    // Generar tarjetas de productos filtrados
    productosFiltrados.forEach(producto => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        // Obtener la ruta de la imagen del producto
        const imagenProducto = obtenerImagenProducto(producto.codigo);
        
        col.innerHTML = `
            <div class="card producto-card h-100" onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                <div class="producto-imagen-contenedor">
                    <img src="${imagenProducto}" 
                         alt="${producto.nombre}" 
                         class="producto-imagen"
                         onerror="this.onerror=null; this.src='assets/img/tech_avatar.svg'">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text text-muted mb-2">${producto.descripcion || 'Sin descripción'}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="h5 mb-0 text-primary">${formatearMoneda(producto.precio)}</span>
                        <span class="badge ${producto.stock > 0 ? 'bg-success' : 'bg-danger'}">
                            ${producto.stock > 0 ? `${producto.stock} disponibles` : 'Sin stock'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        row.appendChild(col);
    });
    
    elementos.listaProductos.appendChild(row);
}

// Filtrar productos por búsqueda
function filtrarProductos(busqueda = '') {
    renderizarProductos(busqueda);
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    // Verificar si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.id === producto.id);
    
    if (itemExistente) {
        // Si ya está en el carrito, aumentar la cantidad
        if (itemExistente.cantidad < itemExistente.stock) {
            itemExistente.cantidad++;
        } else {
            mostrarNotificacion(`No hay suficiente stock de ${producto.nombre}`, 'warning');
            return;
        }
    } else {
        // Si no está en el carrito, agregarlo
        if (producto.stock > 0) {
            carrito.push({
                ...producto,
                cantidad: 1
            });
        } else {
            mostrarNotificacion(`No hay stock disponible de ${producto.nombre}`, 'warning');
            return;
        }
    }
    
    // Actualizar la vista del carrito
    actualizarCarrito();
    
    // Mostrar notificación
    mostrarNotificacion(`${producto.nombre} agregado al carrito`, 'success');
}

// Actualizar la vista del carrito
function actualizarCarrito() {
    if (!elementos.carritoItems || !elementos.subtotalElement || !elementos.impuestosElement || !elementos.totalElement || !elementos.contadorCarrito) return;
    
    // Limpiar el carrito
    elementos.carritoItems.innerHTML = '';
    
    // Si el carrito está vacío
    if (carrito.length === 0) {
        elementos.carritoItems.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <p class="mb-0">El carrito está vacío</p>
                <small class="text-muted">Agrega productos para comenzar</small>
            </div>`;
        
        // Actualizar totales
        elementos.subtotalElement.textContent = formatearMoneda(0);
        elementos.impuestosElement.textContent = formatearMoneda(0);
        elementos.totalElement.textContent = formatearMoneda(0);
        elementos.contadorCarrito.textContent = '0';
        
        // Deshabilitar botón de pagar
        if (elementos.pagar) {
            elementos.pagar.disabled = true;
        }
        
        return;
    }
    
    // Calcular totales
    let subtotal = 0;
    
    // Generar items del carrito
    carrito.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'carrito-item';
        
        const precioTotal = item.precio * item.cantidad;
        subtotal += precioTotal;
        
        itemElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h6 class="mb-0">${item.nombre}</h6>
                    <small class="text-muted">${formatearMoneda(item.precio)} c/u</small>
                </div>
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary" onclick="actualizarCantidad(${index}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="mx-2">${item.cantidad}</span>
                    <button class="btn btn-sm btn-outline-secondary" onclick="actualizarCantidad(${index}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <span class="ms-3 fw-bold">${formatearMoneda(precioTotal)}</span>
                    <button class="btn btn-link text-danger ms-2" onclick="actualizarCantidad(${index}, 0)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        elementos.carritoItems.appendChild(itemElement);
    });
    
    // Calcular impuestos (19% de IVA)
    const impuestos = subtotal * CONFIG.iva;
    const total = subtotal + impuestos;
    
    // Actualizar totales
    elementos.subtotalElement.textContent = formatearMoneda(subtotal);
    elementos.impuestosElement.textContent = formatearMoneda(impuestos);
    elementos.totalElement.textContent = formatearMoneda(total);
    
    // Actualizar contador del carrito
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    elementos.contadorCarrito.textContent = totalItems;
    
    // Habilitar botón de pagar
    if (elementos.pagar) {
        elementos.pagar.disabled = false;
    }
}

// Actualizar cantidad de un producto en el carrito
function actualizarCantidad(index, cambio) {
    if (index < 0 || index >= carrito.length) return;
    
    const item = carrito[index];
    
    if (cambio === 0) {
        // Eliminar el producto del carrito
        carrito.splice(index, 1);
        mostrarNotificacion(`${item.nombre} eliminado del carrito`, 'info');
    } else {
        // Actualizar cantidad
        const nuevaCantidad = item.cantidad + cambio;
        
        if (nuevaCantidad <= 0) {
            // Si la cantidad es 0 o menor, eliminar el producto
            carrito.splice(index, 1);
            mostrarNotificacion(`${item.nombre} eliminado del carrito`, 'info');
        } else if (nuevaCantidad > item.stock) {
            // No permitir superar el stock disponible
            mostrarNotificacion(`No hay suficiente stock de ${item.nombre}`, 'warning');
            return;
        } else {
            // Actualizar cantidad
            item.cantidad = nuevaCantidad;
        }
    }
    
    // Actualizar la vista del carrito
    actualizarCarrito();
}

// Referencia a los elementos del panel de pago
const panelPago = document.getElementById('panelPago');
const panelPagoOverlay = document.getElementById('panelPagoOverlay');

// Abrir panel de pago
function abrirPanelPago() {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío', 'warning');
        return;
    }
    
    // Actualizar resumen de la venta
    actualizarResumenVenta();
    
    // Mostrar panel y overlay
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    panelPago.classList.add('active');
    panelPagoOverlay.classList.add('active');
    
    // Enfocar el primer elemento interactivo
    const firstFocusable = panelPago.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
    
    // Habilitar el botón de confirmar pago solo si hay un método de pago seleccionado
    actualizarEstadoBotonConfirmar();
}

// Cerrar panel de pago
function cerrarPanelPago() {
    document.body.style.overflow = ''; // Restaurar scroll del body
    panelPago.classList.remove('active');
    panelPagoOverlay.classList.remove('active');
    
    // Enfocar el botón de pagar al cerrar
    if (elementos.pagar) {
        elementos.pagar.focus();
    }
}

// Seleccionar método de pago
function seleccionarMetodoPago(boton) {
    if (!boton) return;
    
    // Remover clase activa de todos los botones
    if (elementos.metodosPago) {
        elementos.metodosPago.forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    // Agregar clase activa al botón seleccionado
    boton.classList.add('active');
    
    // Guardar método de pago seleccionado
    metodoPagoSeleccionado = boton.getAttribute('data-metodo');
    
    // Actualizar estado del botón de confirmar pago
    actualizarEstadoBotonConfirmar();
}

// Actualizar estado del botón de confirmar pago
function actualizarEstadoBotonConfirmar() {
    if (!elementos.confirmarPago) return;
    
    // Verificar si hay un método de pago seleccionado
    const hayMetodoPago = !!metodoPagoSeleccionado;
    
    // Verificar si el monto recibido es válido (si aplica)
    let montoValido = true;
    if (metodoPagoSeleccionado === 'efectivo' && elementos.montoRecibido) {
        const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
        const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0) * (1 + CONFIG.iva);
        montoValido = montoRecibido >= total;
    }
    
    // Habilitar/deshabilitar botón de confirmar pago
    elementos.confirmarPago.disabled = !(hayMetodoPago && montoValido);
}

// Actualizar resumen de la venta en la página y en el panel
function actualizarResumenVenta() {
    console.log('Actualizando resumen de venta...');
    
    // Verificar que los elementos existen
    if (!elementos.resumenSubtotal || !elementos.resumenIva || !elementos.resumenTotal) {
        console.error('Error: No se encontraron los elementos del resumen');
        return;
    }
    
    // Calcular subtotal
    const subtotal = carrito.reduce((sum, item) => {
        const itemTotal = item.precio * item.cantidad;
        console.log(`Producto: ${item.nombre}, Cantidad: ${item.cantidad}, Precio: ${item.precio}, Total: ${itemTotal}`);
        return sum + itemTotal;
    }, 0);
    
    console.log('Subtotal calculado:', subtotal);
    
    // Calcular impuestos (19% de IVA)
    const impuestos = subtotal * CONFIG.iva;
    
    // Calcular total
    const total = subtotal + impuestos;
    
    console.log('Impuestos calculados:', impuestos);
    console.log('Total calculado:', total);
    
    // Actualizar valores en la página principal
    try {
        elementos.resumenSubtotal.textContent = formatearMoneda(subtotal);
        elementos.resumenIva.textContent = formatearMoneda(impuestos);
        elementos.resumenTotal.textContent = formatearMoneda(total);
        
        console.log('Valores actualizados en la página principal');
    } catch (error) {
        console.error('Error al actualizar los valores en la página principal:', error);
    }
    
    // Actualizar valores en el panel deslizante
    try {
        const panelSubtotal = document.getElementById('panel-resumen-subtotal');
        const panelIva = document.getElementById('panel-resumen-iva');
        const panelTotal = document.getElementById('panel-resumen-total');
        
        if (panelSubtotal && panelIva && panelTotal) {
            panelSubtotal.textContent = formatearMoneda(subtotal);
            panelIva.textContent = formatearMoneda(impuestos);
            panelTotal.textContent = formatearMoneda(total);
            
            console.log('Valores actualizados en el panel deslizante');
        } else {
            console.warn('No se encontraron los elementos del panel deslizante');
        }
    } catch (error) {
        console.error('Error al actualizar los valores en el panel deslizante:', error);
    }
    
    // Actualizar monto recibido y cambio si es pago en efectivo
    if (elementos.montoRecibido && elementos.cambio) {
        elementos.montoRecibido.value = '';
        elementos.cambio.textContent = formatearMoneda(0);
    }
    
    // Actualizar lista de productos en el resumen
    const listaProductos = document.getElementById('resumen-productos');
    if (listaProductos) {
        listaProductos.innerHTML = '';
        
        carrito.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <h6 class="mb-0">${item.nombre}</h6>
                    <small class="text-muted">${item.cantidad} x ${formatearMoneda(item.precio)}</small>
                </div>
                <span class="fw-bold">${formatearMoneda(item.precio * item.cantidad)}</span>
            `;
            listaProductos.appendChild(li);
        });
    }
}

// Calcular cambio
function calcularCambio() {
    if (!elementos.montoRecibido || !elementos.cambio) return;
    
    const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0) * (1 + CONFIG.iva);
    
    if (montoRecibido >= total) {
        const cambio = montoRecibido - total;
        elementos.cambio.textContent = formatearMoneda(cambio);
    } else {
        elementos.cambio.textContent = formatearMoneda(0);
    }
    
    // Actualizar estado del botón de confirmar pago
    actualizarEstadoBotonConfirmar();
}

// Procesar pago
function procesarPago() {
    try {
        // Validar que haya un método de pago seleccionado
        if (!metodoPagoSeleccionado) {
            mostrarNotificacion('Por favor, selecciona un método de pago', 'warning');
            return;
        }
        
        // Validar monto recibido si es pago en efectivo
        if (metodoPagoSeleccionado === 'efectivo' && elementos.montoRecibido) {
            const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
            const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0) * (1 + CONFIG.iva);
            
            if (montoRecibido < total) {
                mostrarNotificacion('El monto recibido es insuficiente', 'warning');
                return;
            }
        }
        
        // Aquí iría la lógica para procesar el pago con el método seleccionado
        // Por ahora, solo mostramos un mensaje de éxito
        
        // Generar número de documento
        const numeroDocumento = generarNumeroDocumento();
        
        // Mostrar mensaje de éxito
        mostrarNotificacion(`Pago procesado correctamente. N° de documento: ${numeroDocumento}`, 'success');
        
        // Cerrar panel de pago
        cerrarPanelPago();
        
        // Limpiar carrito
        limpiarCarrito();
        
    } catch (error) {
        console.error('Error al procesar el pago:', error);
        mostrarNotificacion('Error al procesar el pago', 'error');
    }
}

// Generar número de documento
function generarNumeroDocumento() {
    // En un caso real, esto vendría de la base de datos
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const consecutivo = secuenciaDocumento.toString().padStart(4, '0');
    
    secuenciaDocumento++;
    
    return `${año}${mes}${dia}-${consecutivo}`;
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    console.log(`Mostrando notificación: ${mensaje} (${tipo})`);
    
    // Asegurarse de que exista el contenedor de notificaciones
    let contenedorNotificaciones = document.getElementById('notificaciones');
    if (!contenedorNotificaciones) {
        contenedorNotificaciones = document.createElement('div');
        contenedorNotificaciones.id = 'notificaciones';
        document.body.appendChild(contenedorNotificaciones);
    }
    
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    
    // Icono según el tipo de notificación
    let icono = 'info-circle';
    if (tipo === 'success') icono = 'check-circle';
    else if (tipo === 'warning') icono = 'exclamation-triangle';
    else if (tipo === 'error') icono = 'times-circle';
    
    // Contenido de la notificación
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-${icono} me-2"></i>
            <span>${mensaje}</span>
            <button type="button" class="btn-close" onclick="this.closest('.notificacion').remove()"></button>
        </div>
    `;
    
    // Agregar al contenedor de notificaciones
    contenedorNotificaciones.insertBefore(notificacion, contenedorNotificaciones.firstChild);
    
    // Eliminar la notificación después de 5 segundos
    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.classList.add('fade-out');
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Estilos para las notificaciones
const estilosNotificaciones = document.createElement('style');
estilosNotificaciones.textContent = `
    #notificaciones {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 350px;
        width: 100%;
    }
    
    .notificacion {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 15px;
        overflow: hidden;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(100%);
        animation: slideIn 0.3s forwards;
    }
    
    .notificacion-contenido {
        padding: 15px 20px;
        display: flex;
        align-items: center;
        position: relative;
    }
    
    .notificacion i {
        font-size: 1.2rem;
        margin-right: 10px;
    }
    
    .notificacion-success {
        border-left: 4px solid #28a745;
    }
    
    .notificacion-success i {
        color: #28a745;
    }
    
    .notificacion-error {
        border-left: 4px solid #dc3545;
    }
    
    .notificacion-error i {
        color: #dc3545;
    }
    
    .notificacion-warning {
        border-left: 4px solid #ffc107;
    }
    
    .notificacion-warning i {
        color: #ffc107;
    }
    
    .notificacion-info {
        border-left: 4px solid #17a2b8;
    }
    
    .notificacion-info i {
        color: #17a2b8;
    }
    
    .btn-close {
        margin-left: auto;
        padding: 0.5rem;
        opacity: 0.5;
    }
    
    .btn-close:hover {
        opacity: 1;
    }
    
    .fade-out {
        opacity: 0 !important;
        transform: translateX(100%) !important;
    }
    
    @keyframes slideIn {
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;

document.head.appendChild(estilosNotificaciones);

// Agregar contenedor de notificaciones si no existe
if (!document.getElementById('notificaciones')) {
    const contenedorNotificaciones = document.createElement('div');
    contenedorNotificaciones.id = 'notificaciones';
    document.body.appendChild(contenedorNotificaciones);
}
