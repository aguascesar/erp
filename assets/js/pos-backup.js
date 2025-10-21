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
    
    // Elementos de IVA
    ivaLabel: document.querySelector('.resumen-item:nth-child(2) span:first-child')
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
            renderizarProductos(e.target.value);
        });
    }

    // Botón de pagar
    if (elementos.pagar) {
        elementos.pagar.addEventListener('click', abrirModalPago);
    }

    // Botón de nueva venta
    const btnNuevaVenta = document.getElementById('nuevaVenta');
    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener('click', limpiarCarrito);
    }

    // Botón de cancelar venta
    const btnCancelarVenta = document.getElementById('cancelarVenta');
    if (btnCancelarVenta) {
        btnCancelarVenta.addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea cancelar la venta actual?')) {
                limpiarCarrito();
            }
        });
    }
    
    // Verificar si hay elementos en el carrito al cargar la página
    if (carrito.length > 0) {
        actualizarCarrito();
    }
}

// Manejar cambio en el tipo de documento
function manejarCambioTipoDocumento() {
    const tipoDoc = this.value;
    const tipoDocConfig = CONFIG_CHILE.tiposDocumento.find(t => t.id === tipoDoc);
    
    // Mostrar/ocultar datos del cliente según el tipo de documento
    if (tipoDocConfig.requiereCliente) {
        elementos.datosCliente.style.display = 'block';
    } else {
        elementos.datosCliente.style.display = 'none';
    }
    
    // Actualizar resumen
    actualizarResumenVenta();
}

// Función para seleccionar metodo de pago
function seleccionarMetodoPago(boton) {
    // Quitar selección de todos los botones
    document.querySelectorAll('.metodo-pago').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Seleccionar el botón clickeado
    boton.classList.add('active');
    metodoPagoSeleccionado = boton.dataset.metodo;
    
    // Habilitar/deshabilitar confirmación de pago
    actualizarEstadoBotonConfirmar();
    
    // Si es pago en efectivo, enfocar el campo de monto recibido
    if (metodoPagoSeleccionado === 'efectivo') {
        elementos.montoRecibido.focus();
    } else {
        // Para otros métodos, establecer el monto recibido igual al total
        const total = parseFloat(elementos.totalElement.textContent.replace(/[^0-9]/g, ''));
        elementos.montoRecibido.value = total || '';
        calcularCambio();
    }
}

// Función para actualizar el estado del botón de confirmar pago
function actualizarEstadoBotonConfirmar() {
    const botonConfirmar = document.getElementById('confirmarPago');
    const tipoDoc = elementos.tipoDocumento.value;
    const tipoDocConfig = CONFIG_CHILE.tiposDocumento.find(t => t.id === tipoDoc);
    
    let camposRequeridosOk = true;
    
    // Validar campos obligatorios según tipo de documento
    if (tipoDocConfig.requiereCliente) {
        camposRequeridosOk = (
            validarRUT(elementos.rutCliente.value) &&
            elementos.nombreCliente.value.trim() !== ''
        );
    }
    
    // Validar método de pago seleccionado
    const metodoPagoOk = metodoPagoSeleccionado !== null;
    
    // Validar monto recibido si es pago en efectivo
    let montoOk = true;
    if (metodoPagoSeleccionado === 'efectivo') {
        const montoRecibido = parseInt(elementos.montoRecibido.value) || 0;
        const total = parseInt(elementos.totalElement.textContent.replace(/[^0-9]/g, '') || '0');
        montoOk = montoRecibido >= total;
    }
    
    // Habilitar/deshabilitar botón
    botonConfirmar.disabled = !(camposRequeridosOk && metodoPagoOk && montoOk);
}

// Función para actualizar el resumen de la venta en el modal
function actualizarResumenVenta() {
    if (!elementos.tipoDocumento) return; // Salir si no hay tipo de documento
    
    // Calcular subtotal (suma de precios * cantidades)
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // Determinar el tipo de documento actual
    const tipoDoc = elementos.tipoDocumento.value;
    
    // Calcular IVA según tipo de documento
    let iva = 0;
    let mostrarIva = true;
    
    // Actualizar la etiqueta de IVA según el tipo de documento
    if (elementos.ivaLabel) {
        if (tipoDoc === 'factura') {
            iva = Math.round(subtotal * CONFIG.iva);
            elementos.ivaLabel.textContent = `IVA (${(CONFIG.iva * 100)}%):`;
        } else if (tipoDoc === 'factura_exenta') {
            iva = 0;
            elementos.ivaLabel.textContent = 'IVA (Exento):';
        } else {
            // Para boletas, no se muestra IVA
            iva = 0;
            elementos.ivaLabel.textContent = 'Impuestos:';
        }
    }
    
    // Mostrar u ocultar la fila de IVA según corresponda
    if (elementos.resumenIva && elementos.resumenIva.parentElement) {
        elementos.resumenIva.parentElement.style.display = mostrarIva ? 'flex' : 'none';
    }
    
    const total = subtotal + iva;
    
    // Actualizar resumen en el modal
    if (elementos.resumenSubtotal) {
        elementos.resumenSubtotal.textContent = formatearMoneda(subtotal);
    }
    if (elementos.resumenIva) {
        elementos.resumenIva.textContent = formatearMoneda(iva);
    }
    if (elementos.resumenTotal) {
        elementos.resumenTotal.textContent = formatearMoneda(total);
    }
    
    // Actualizar total en el formulario de pago
    if (elementos.montoRecibido) {
        // Convertir a número entero para asegurar que sea un valor válido
        const totalEntero = Math.ceil(total);
        
        // Establecer el mínimo y valor predeterminado
        elementos.montoRecibido.setAttribute('min', totalEntero);
        
        // Si el campo está vacío o el monto actual es menor que el total, actualizarlo
        const montoActual = parseInt(elementos.montoRecibido.value) || 0;
        if (montoActual < totalEntero || elementos.montoRecibido.value === '') {
            elementos.montoRecibido.value = totalEntero;
        }
        
        // Recalcular el cambio
        if (typeof calcularCambio === 'function') {
            calcularCambio();
        }
    }
    
    // Actualizar estado del botón de confirmar
    actualizarEstadoBotonConfirmar();
    
    return { subtotal, iva, total };
}

// Función para calcular el cambio
function calcularCambio() {
    const montoRecibido = parseInt(elementos.montoRecibido.value) || 0;
    const total = parseInt(elementos.resumenTotal.textContent.replace(/[^0-9]/g, '') || '0');
    
    if (montoRecibido < total) {
        elementos.cambioElement.textContent = `Faltan: ${formatearMoneda(total - montoRecibido)}`;
        elementos.cambioElement.style.color = '#dc3545';
    } else {
        const cambio = montoRecibido - total;
        elementos.cambioElement.textContent = `Cambio: ${formatearMoneda(cambio)}`;
        elementos.cambioElement.style.color = '#28a745';
    }
    
    // Actualizar estado del botón de confirmar
    actualizarEstadoBotonConfirmar();
}

// Función para generar número de documento
function generarNumeroDocumento() {
    const ahora = new Date();
    const anio = ahora.getFullYear().toString().slice(-2);
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const dia = ahora.getDate().toString().padStart(2, '0');
    const secuencia = secuenciaDocumento.toString().padStart(4, '0');
    
    // Incrementar secuencia para el próximo documento
    secuenciaDocumento++;
    
    return `${anio}${mes}${dia}-${secuencia}`;
}

// Inicialización del POS
async function inicializarPOS() {
    // Configurar valores iniciales
    elementos.montoRecibido.setAttribute('step', '1');
    elementos.montoRecibido.setAttribute('min', '0');
    
    try {
        // Cargar datos de ejemplo
        await cargarDatosEjemplo();
        
        // Renderizar productos y categorías
        renderizarProductos();
        renderizarCategorias();
        
        // Configurar eventos
        configurarEventos();
        
        // Inicializar carrito
        actualizarCarrito();
    } catch (error) {
        console.error('Error al inicializar el POS:', error);
        mostrarNotificacion('Error al cargar los datos del POS', 'error');
    }
}

// Cargar datos de ejemplo
async function cargarDatosEjemplo() {
    // Simular carga de datos desde una API
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
            { id: 1, codigo: 'P001', nombre: 'Coca Cola 600ml', precio: 1800, categoria: 2, stock: 50 },
            { id: 2, codigo: 'P002', nombre: 'Sabritas 45g', precio: 1500, categoria: 4, stock: 30 },
            { id: 3, codigo: 'P003', nombre: 'Jugo Jumex 500ml', precio: 1200, categoria: 2, stock: 45 },
            { id: 4, codigo: 'P004', nombre: 'Galletas Emperador', precio: 1600, categoria: 4, stock: 25 },
            { id: 5, codigo: 'P005', nombre: 'Agua 1L', precio: 1000, categoria: 2, stock: 60 },
            { id: 6, codigo: 'P006', nombre: 'Pan Bimbo', precio: 3500, categoria: 3, stock: 20 },
            { id: 7, codigo: 'P007', nombre: 'Leche 1L', precio: 2500, categoria: 3, stock: 30 },
            { id: 8, codigo: 'P008', nombre: 'Huevo 1kg', precio: 4500, categoria: 3, stock: 15 },
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
    const nombreArchivo = imagenes[codigo] || "tech_avatar.svg";

    // Devolver la ruta relativa a la carpeta de imágenes de productos
    return `assets/img/productos/${nombreArchivo}`;
}


// Renderizar productos en la interfaz
function renderizarProductos(filtro = '') {
    elementos.listaProductos.innerHTML = '';
    
    const productosFiltrados = productos.filter(producto => 
        producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        producto.codigo.toLowerCase().includes(filtro.toLowerCase())
    );
    
    if (productosFiltrados.length === 0) {
        elementos.listaProductos.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                <p class="h5">No se encontraron productos</p>
                <p class="text-muted">Intenta con otro término de búsqueda</p>
            </div>`;
        return;
    }
    
    const row = document.createElement('div');
    row.className = 'row';
    
    productosFiltrados.forEach(producto => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        // Obtener la ruta de la imagen usando la función auxiliar
        const imagenSrc = obtenerImagenProducto(producto.codigo);
        
        col.innerHTML = `
            <div class="card producto-card h-100" onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                <div class="producto-imagen-contenedor">
                    ${imagenSrc 
                        ? `<img src="${imagenSrc}" 
                             alt="${producto.nombre}" 
                             class="producto-imagen"
                             onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'sin-imagen\'><i class=\'fas fa-image fa-2x\'></i><span>${producto.nombre}</span></div>'">`
                        : `<div class="sin-imagen">
                                <i class="fas fa-image fa-2x mb-2"></i>
                                <span>${producto.nombre}</span>
                           </div>`
                    }
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text text-muted mb-2">${producto.codigo}</p>
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
        boton.className = 'categoria-btn';
        boton.textContent = categoria.nombre;
        boton.dataset.categoriaId = categoria.id;
        
        if (categoria.id === 1) {
            boton.classList.add('active');
        }
        
        boton.addEventListener('click', () => filtrarPorCategoria(categoria.id));
        contenedorCategorias.appendChild(boton);
    });
}

// Filtrar productos por categoría
function filtrarPorCategoria(categoriaId) {
    // Actualizar botones de categoría
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        if (parseInt(btn.dataset.categoriaId) === categoriaId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Si es la categoría "Todos", mostrar todos los productos
    if (categoriaId === 1) {
        renderizarProductos();
        return;
    }
    
    // Filtrar productos por categoría
    const productosFiltrados = productos.filter(p => p.categoria === categoriaId);
    
    elementos.listaProductos.innerHTML = '';
    
    if (productosFiltrados.length === 0) {
        elementos.listaProductos.innerHTML = '<p class="empty-cart">No hay productos en esta categoría</p>';
        return;
    }
    
    productosFiltrados.forEach(producto => {
        const productoElement = document.createElement('div');
        productoElement.className = 'producto-card';
        productoElement.innerHTML = `
            <div class="producto-img">
                <img src="/assets/img/tech_avatar.svg" alt="${producto.nombre}">
            </div>
            <div class="producto-info">
                <div class="producto-nombre">${producto.nombre}</div>
                <div class="producto-codigo">${producto.codigo}</div>
                <div class="producto-precio">${formatearMoneda(producto.precio)}</div>
                <div class="producto-stock">Disponible: ${producto.stock} pz</div>
            </div>
        `;
        
        productoElement.addEventListener('click', () => agregarAlCarrito(producto));
        elementos.listaProductos.appendChild(productoElement);
    });
}

// Filtrar productos por búsqueda
function filtrarProductos(busqueda) {
    renderizarProductos(busqueda);
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    // Verificar si el producto ya está en el carrito
    const productoEnCarrito = carrito.find(item => item.id === producto.id);
    
    if (productoEnCarrito) {
        // Si ya está en el carrito, incrementar cantidad si hay stock
        if (productoEnCarrito.cantidad < producto.stock) {
            productoEnCarrito.cantidad++;
        } else {
            mostrarNotificacion(`No hay suficiente stock de ${producto.nombre}`, 'error');
            return;
        }
    } else {
        // Si no está en el carrito, agregarlo con cantidad 1 si hay stock
        if (producto.stock > 0) {
            carrito.push({
                ...producto,
                cantidad: 1
            });
        } else {
            mostrarNotificacion(`No hay suficiente stock de ${producto.nombre}`, 'error');
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
    // Limpiar carrito
    elementos.carritoItems.innerHTML = '';
    
    if (carrito.length === 0) {
        elementos.carritoItems.innerHTML = '<p class="empty-cart">El carrito está vacío</p>';
        elementos.pagar.disabled = true;
        elementos.subtotalElement.textContent = formatearMoneda(0);
        elementos.impuestosElement.textContent = formatearMoneda(0);
        elementos.totalElement.textContent = formatearMoneda(0);
        elementos.contadorCarrito.textContent = '0';
        return;
    }
    
    // Calcular totales
    let subtotal = 0;
    
    // Renderizar ítems del carrito
    carrito.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'carrito-item';
        
        const precioTotal = item.precio * item.cantidad;
        subtotal += precioTotal;
        
        itemElement.innerHTML = `
            <div class="item-info">
                <div class="item-nombre">${item.nombre}</div>
                <div class="item-precio">${formatearMoneda(item.precio)} c/u</div>
            </div>
            <div class="item-cantidad">
                <button class="cantidad-btn decrementar" data-index="${index}">-</button>
                <span>${item.cantidad}</span>
                <button class="cantidad-btn incrementar" data-index="${index}">+</button>
            </div>
            <div class="item-total">
                ${formatearMoneda(precioTotal)}
            </div>
        `;
        
        elementos.carritoItems.appendChild(itemElement);
    });
    
    // Calcular impuestos (solo para facturas)
    const tipoDoc = elementos.tipoDocumento ? elementos.tipoDocumento.value : 'boleta';
    const iva = tipoDoc === 'factura' ? Math.round(subtotal * CONFIG_CHILE.iva) : 0;
    const total = subtotal + iva;
    
    // Actualizar totales
    elementos.subtotalElement.textContent = formatearMoneda(subtotal);
    elementos.impuestosElement.textContent = formatearMoneda(iva);
    elementos.totalElement.textContent = formatearMoneda(total);
    elementos.contadorCarrito.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    // Habilitar/deshabilitar botón de pago
    document.getElementById('pagar').disabled = carrito.length === 0;
    
    // Agregar eventos a los botones de cantidad
    document.querySelectorAll('.decrementar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            actualizarCantidad(index, -1);
        });
    });
    
    document.querySelectorAll('.incrementar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            actualizarCantidad(index, 1);
        });
    });
}

// Actualizar cantidad de un producto en el carrito
function actualizarCantidad(index, cambio) {
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
    
    // Actualizar la vista del carrito
    actualizarCarrito();
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

// Cerrar modal de pago
function cerrarModalPago() {
    elementos.modalPago.style.display = 'none';
    
    // Limpiar selección de método de pago
    document.querySelectorAll('.metodo-pago').forEach(btn => {
        btn.classList.remove('active');
    });
    
    metodoPagoSeleccionado = null;
}

// Procesar pago
function procesarPago() {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío', 'error');
        return;
    }
    
    if (!metodoPagoSeleccionado) {
        mostrarNotificacion('Selecciona un método de pago', 'error');
        return;
    }
    
    // Validar monto recibido si es pago en efectivo
    if (metodoPagoSeleccionado === 'efectivo') {
        const montoRecibido = parseInt(elementos.montoRecibido.value) || 0;
        const total = parseInt(elementos.resumenTotal.textContent.replace(/[^0-9]/g, '') || '0');
        
        if (montoRecibido < total) {
            mostrarNotificacion('El monto recibido es menor al total', 'error');
            return;
        }
    }
    
    // Obtener datos del cliente si es factura
    let datosCliente = null;
    const tipoDoc = elementos.tipoDocumento.value;
    const tipoDocConfig = CONFIG_CHILE.tiposDocumento.find(t => t.id === tipoDoc);
    
    if (tipoDocConfig.requiereCliente) {
        if (!validarRUT(elementos.rutCliente.value)) {
            mostrarNotificacion('El RUT ingresado no es válido', 'error');
            elementos.rutCliente.focus();
            return;
        }
        
        if (!elementos.nombreCliente.value.trim()) {
            mostrarNotificacion('Ingrese el nombre o razón social del cliente', 'error');
            elementos.nombreCliente.focus();
            return;
        }
        
        datosCliente = {
            rut: elementos.rutCliente.value,
            nombre: elementos.nombreCliente.value.trim(),
            giro: elementos.giroCliente.value.trim(),
            direccion: elementos.direccionCliente.value.trim(),
            comuna: elementos.comunaCliente.value.trim(),
            ciudad: elementos.ciudadCliente.value.trim()
        };
    }
    
    // Crear objeto de venta
    const venta = {
        fecha: new Date().toISOString(),
        numeroDocumento: generarNumeroDocumento(),
        tipoDocumento: tipoDoc,
        cliente: datosCliente,
        items: carrito.map(item => ({
            id: item.id,
            codigo: item.codigo,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad,
            total: item.precio * item.cantidad
        })),
        subtotal: parseInt(elementos.resumenSubtotal.textContent.replace(/[^0-9]/g, '') || '0'),
        iva: parseInt(elementos.resumenIva.textContent.replace(/[^0-9]/g, '') || '0'),
        total: parseInt(elementos.resumenTotal.textContent.replace(/[^0-9]/g, '') || '0'),
        metodoPago: metodoPagoSeleccionado,
        montoRecibido: parseInt(elementos.montoRecibido.value) || 0,
        cambio: parseInt(elementos.cambioElement.textContent.replace(/[^0-9-]/g, '') || '0')
    };
    
    // Aquí iría el envío a la API para procesar la venta
    console.log('Procesando venta:', venta);
    
    // Simular procesamiento asíncrono
    mostrarNotificacion('Procesando pago...', 'info');
    
    setTimeout(() => {
        // Mostrar mensaje de éxito
        mostrarNotificacion('Venta procesada correctamente', 'success');
        
        // Cerrar modal
        cerrarModalPago();
        
        // Limpiar carrito
        carrito = [];
        actualizarCarrito();
        
        // Aquí podrías redirigir a la impresión del ticket o mostrar un resumen
        // Por ejemplo: window.open(`/ticket/${venta.numeroDocumento}`, '_blank');
        
    }, 1500);
}

// Confirmar cancelación de venta
function confirmarCancelarVenta() {
    if (carrito.length === 0) return;
    
    if (confirm('¿Estás seguro de que deseas cancelar la venta? Se perderán todos los productos en el carrito.')) {
        carrito = [];
        actualizarCarrito();
        mostrarNotificacion('Venta cancelada', 'info');
    }
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    
    // Agregar al documento
    document.body.appendChild(notificacion);
    
    // Animación de entrada
    setTimeout(() => {
        notificacion.style.opacity = '1';
        notificacion.style.transform = 'translateY(0)';
    }, 10);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.opacity = '0';
        notificacion.style.transform = 'translateY(-20px)';
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notificacion.remove();
        }, 300);
    }, 3000);
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Agregar elementos faltantes al objeto 'elementos'
    elementos.modalPago = document.getElementById('modalPago');
    elementos.montoRecibido = document.getElementById('montoRecibido');
    elementos.cambioElement = document.getElementById('cambio');
    
    // Configurar botones
    const nuevaVentaBtn = document.getElementById('nuevaVenta');
    const pagarBtn = document.getElementById('pagar');
    const cancelarVentaBtn = document.getElementById('cancelarVenta');
    const cancelarPagoBtn = document.getElementById('cancelarPago');
    const confirmarPagoBtn = document.getElementById('confirmarPago');
    
    if (nuevaVentaBtn) nuevaVentaBtn.addEventListener('click', confirmarCancelarVenta);
    if (pagarBtn) pagarBtn.addEventListener('click', abrirModalPago);
    if (cancelarVentaBtn) cancelarVentaBtn.addEventListener('click', confirmarCancelarVenta);
    if (cancelarPagoBtn) cancelarPagoBtn.addEventListener('click', cerrarModalPago);
    if (confirmarPagoBtn) confirmarPagoBtn.addEventListener('click', procesarPago);
    
    // Inicializar la aplicación
    inicializarPOS();
});

// Eventos
document.addEventListener('DOMContentLoaded', inicializarPOS);

// Inicialización del POS
async function inicializarPOS() {
    // Cargar datos de ejemplo (en un caso real, esto vendría de una API)
    await cargarDatosEjemplo();
    
    // Renderizar productos y categorías
    renderizarProductos();
    renderizarCategorias();
    
    // Configurar búsqueda
    elementos.buscarProducto.addEventListener('input', filtrarProductos);
    
    // Configurar eventos de los métodos de pago
    document.querySelectorAll('.metodo-pago').forEach(btn => {
        btn.addEventListener('click', () => seleccionarMetodoPago(btn));
    });
    
    // Configurar evento para el monto recibido
    elementos.montoRecibido.addEventListener('input', calcularCambio);
}

    // Función para filtrar productos
function filtrarProductos(busqueda = '') {
    const contenedor = elementos.listaProductos;
    if (!contenedor) return;

    // Filtrar productos según el texto de búsqueda
    const productosFiltrados = busqueda
        ? productos.filter(p =>
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.codigo.toLowerCase().includes(busqueda.toLowerCase()))
        : productos;

    // Limpiar el contenedor
    contenedor.innerHTML = '';

    // Mostrar mensaje si no hay productos
    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x mb-3 text-muted"></i>
                <p class="h5">No se encontraron productos</p>
                <p class="text-muted">Intenta con otro término de búsqueda</p>
            </div>`;
        return;
    }

    // Generar el HTML de los productos
    const row = document.createElement('div');
    row.className = 'row';
    
    productosFiltrados.forEach(producto => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        // Obtener la ruta de la imagen del producto
        const imagenProducto = obtenerImagenProducto(producto.codigo);
        
        col.innerHTML = `
            <div class="card producto-card h-100" onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                <div class="producto-imagen-contenedor">
                    ${imagenProducto 
                        ? `<img src="${imagenProducto}" 
                             alt="${producto.nombre}" 
                             class="producto-imagen"
                             onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'sin-imagen\'><i class=\'fas fa-image fa-2x\'></i><span>${producto.nombre}</span></div>'">`
                        : `<div class="sin-imagen">
                                <i class="fas fa-image fa-2x mb-2"></i>
                                <span>${producto.nombre}</span>
                           </div>`
                    }
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${producto.nombre}</h5>
                    <p class="card-text text-muted mb-2">${producto.codigo}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="h5 mb-0 text-primary">${formatearMoneda(producto.precio)}</span>
                        <span class="badge ${producto.stock > 0 ? 'bg-success' : 'bg-danger'}">
                            ${producto.stock > 0 ? `${producto.stock} disponibles` : 'Sin stock'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
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
        </div>`;
    }).join('');

    contenedor.innerHTML = productosHTML;
}




// Renderizar categorías
function renderizarCategorias() {
    const contenedorCategorias = document.querySelector('.categorias');
    contenedorCategorias.innerHTML = '';
    
    categorias.forEach(categoria => {
        const boton = document.createElement('button');
        boton.className = 'categoria-btn';
        boton.textContent = categoria.nombre;
        boton.dataset.categoriaId = categoria.id;
        
        if (categoria.id === 1) {
            boton.classList.add('active');
        }
        
        boton.addEventListener('click', () => filtrarPorCategoria(categoria.id));
        contenedorCategorias.appendChild(boton);
    });
}

// Filtrar productos por categoría
function filtrarPorCategoria(categoriaId) {
    // Actualizar botones de categoría
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        if (parseInt(btn.dataset.categoriaId) === categoriaId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Si es la categoría "Todos", mostrar todos los productos
    if (categoriaId === 1) {
        renderizarProductos();
        return;
    }
    
    // Filtrar productos por categoría
    const productosFiltrados = productos.filter(p => p.categoria === categoriaId);
    
    elementos.listaProductos.innerHTML = '';
    
    if (productosFiltrados.length === 0) {
        elementos.listaProductos.innerHTML = '<p class="empty-cart">No hay productos en esta categoría</p>';
        return;
    }
    
    productosFiltrados.forEach(producto => {
        const productoElement = document.createElement('div');
        productoElement.className = 'producto-card';
        productoElement.innerHTML = `
            <div class="producto-img">
                <img src="/assets/img/tech_avatar.svg" alt="${producto.nombre}">
            </div>
            <div class="producto-info">
                <div class="producto-nombre">${producto.nombre}</div>
                <div class="producto-codigo">${producto.codigo}</div>
                <div class="producto-precio">$${producto.precio.toFixed(2)}</div>
                <div class="producto-stock">Disponible: ${producto.stock} pz</div>
            </div>
        `;
        
        productoElement.addEventListener('click', () => agregarAlCarrito(producto));
        elementos.listaProductos.appendChild(productoElement);
    });
}

// Filtrar productos por búsqueda
function filtrarProductos() {
    const busqueda = elementos.buscarProducto.value.trim();
    renderizarProductos(busqueda);
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    // Verificar si el producto ya está en el carrito
    const productoEnCarrito = carrito.find(item => item.id === producto.id);
    
    if (productoEnCarrito) {
        // Si ya está en el carrito, incrementar cantidad
        if (productoEnCarrito.cantidad < producto.stock) {
            productoEnCarrito.cantidad++;
        } else {
            alert(`No hay suficiente stock de ${producto.nombre}`);
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
            alert(`No hay suficiente stock de ${producto.nombre}`);
            return;
        }
    }
    
    // Actualizar la vista del carrito
    actualizarCarrito();
    
    // Mostrar notificación
    mostrarNotificacion(`${producto.nombre} agregado al carrito`);
}

// Actualizar la vista del carrito
function actualizarCarrito() {
    // Limpiar carrito
    elementos.carritoItems.innerHTML = '';
    
    if (carrito.length === 0) {
        elementos.carritoItems.innerHTML = '<p class="empty-cart">El carrito está vacío</p>';
        elementos.pagar.disabled = true;
        elementos.subtotalElement.textContent = '$0.00';
        elementos.impuestosElement.textContent = '$0.00';
        elementos.totalElement.textContent = '$0.00';
        elementos.contadorCarrito.textContent = '0';
        return;
    }
    
    // Calcular totales
    let subtotal = 0;
    
    // Renderizar ítems del carrito
    carrito.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'carrito-item';
        
        const precioTotal = item.precio * item.cantidad;
        subtotal += precioTotal;
        
        itemElement.innerHTML = `
            <div class="item-info">
                <div class="item-nombre">${item.nombre}</div>
                <div class="item-precio">$${item.precio.toFixed(2)} c/u</div>
            </div>
            <div class="item-cantidad">
                <button class="cantidad-btn decrementar" data-index="${index}">-</button>
                <span>${item.cantidad}</span>
                <button class="cantidad-btn incrementar" data-index="${index}">+</button>
            </div>
            <div class="item-total">
                $${precioTotal.toFixed(2)}
            </div>
        `;
        
        elementos.carritoItems.appendChild(itemElement);
    });
    
    // Calcular impuestos (16% de IVA)
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;
    
    // Actualizar totales
    elementos.subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    elementos.impuestosElement.textContent = `$${impuestos.toFixed(2)}`;
    elementos.totalElement.textContent = `$${total.toFixed(2)}`;
    elementos.contadorCarrito.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    // Habilitar/deshabilitar botón de pago de forma segura
    if (elementos.pagar) {
        elementos.pagar.disabled = carrito.length === 0;
    }
    
    // Agregar eventos a los botones de cantidad
    document.querySelectorAll('.decrementar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            actualizarCantidad(index, -1);
        });
    });
    
    document.querySelectorAll('.incrementar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            actualizarCantidad(index, 1);
        });
    });
}

// Actualizar cantidad de un producto en el carrito
function actualizarCantidad(index, cambio) {
    const item = carrito[index];
    
    if (cambio > 0) {
        // Incrementar cantidad
        if (item.cantidad < item.stock) {
            item.cantidad += cambio;
        } else {
            mostrarNotificacion(`No hay suficiente stock de ${item.nombre}`);
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
    
    // Actualizar la vista del carrito
    actualizarCarrito();
}

// Abrir página de proceso de pago
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

// Seleccionar método de pago
function seleccionarMetodoPago(boton) {
    // Quitar selección de todos los botones
    document.querySelectorAll('.metodo-pago').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Seleccionar el botón clickeado
    boton.classList.add('active');
    metodoPagoSeleccionado = boton.dataset.metodo;
    
    // Si es pago en efectivo, enfocar el campo de monto recibido
    if (metodoPagoSeleccionado === 'efectivo') {
        elementos.montoRecibido.focus();
    } else {
        elementos.montoRecibido.value = elementos.totalElement.textContent.replace('$', '');
        calcularCambio();
    }
}

// Calcular cambio
function calcularCambio() {
    if (!elementos.montoRecibido.value || isNaN(parseFloat(elementos.montoRecibido.value))) {
        elementos.cambioElement.textContent = 'Cambio: $0.00';
        return;
    }
    
    const montoRecibido = parseFloat(elementos.montoRecibido.value);
    const total = parseFloat(elementos.totalElement.textContent.replace('$', ''));
    
    if (montoRecibido < total) {
        elementos.cambioElement.textContent = 'Faltan: $' + (total - montoRecibido).toFixed(2);
        elementos.cambioElement.style.color = 'red';
    } else {
        const cambio = montoRecibido - total;
        elementos.cambioElement.textContent = 'Cambio: $' + cambio.toFixed(2);
        elementos.cambioElement.style.color = 'green';
    }
}

// Procesar pago
function procesarPago() {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito está vacío');
        return;
    }
    
    if (!metodoPagoSeleccionado) {
        mostrarNotificacion('Selecciona un método de pago');
        return;
    }
    
    if (metodoPagoSeleccionado === 'efectivo') {
        const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
        const total = parseFloat(elementos.totalElement.textContent.replace('$', ''));
        
        if (montoRecibido < total) {
            mostrarNotificacion('El monto recibido es menor al total');
            return;
        }
    }
    
    // Aquí iría la lógica para procesar el pago con una API
    // Por ahora, solo mostramos un mensaje de éxito
    
    // Crear ticket de venta
    const ticket = {
        fecha: new Date().toISOString(),
        productos: carrito,
        subtotal: parseFloat(elementos.subtotalElement.textContent.replace('$', '')),
        impuestos: parseFloat(elementos.impuestosElement.textContent.replace('$', '')),
        total: parseFloat(elementos.totalElement.textContent.replace('$', '')),
        metodoPago: metodoPagoSeleccionado,
        montoRecibido: parseFloat(elementos.montoRecibido.value) || 0,
        cambio: parseFloat(elementos.cambioElement.textContent.replace(/[^0-9.-]+/g,"") || 0)
    };
    
    console.log('Ticket de venta:', ticket);
    
    // Mostrar mensaje de éxito
    mostrarNotificacion('Venta procesada correctamente', 'success');
    
    // Cerrar modal y limpiar carrito
    cerrarModalPago();
    nuevaVenta();
    
    // Aquí podrías redirigir a la impresión del ticket o mostrar un resumen
}

// Nueva venta
function nuevaVenta() {
    if (carrito.length > 0) {
        if (confirm('¿Estás seguro de que deseas iniciar una nueva venta? Se perderán los productos en el carrito.')) {
            carrito = [];
            actualizarCarrito();
        }
    }
}

// Confirmar cancelación de venta
function confirmarCancelarVenta() {
    if (carrito.length === 0) return;
    
    if (confirm('¿Estás seguro de que deseas cancelar la venta? Se perderán todos los productos en el carrito.')) {
        carrito = [];
        actualizarCarrito();
    }
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    
    // Agregar al documento
    document.body.appendChild(notificacion);
    
    // Animación de entrada
    setTimeout(() => {
        notificacion.style.opacity = '1';
        notificacion.style.transform = 'translateY(0)';
    }, 10);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.opacity = '0';
        notificacion.style.transform = 'translateY(-20px)';
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            notificacion.remove();
        }, 300);
    }, 3000);
}

// Estilos para las notificaciones
const estilosNotificaciones = document.createElement('style');
estilosNotificaciones.textContent = `
    .notificacion {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: #333;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        opacity: 0;
        transform: translateY(-50px);
        transition: all 0.3s ease-in-out;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 350px;
        font-size: 14px;
        line-height: 1.5;
    }
    
    .notificacion::before {
        content: '';
        display: inline-block;
        width: 20px;
        height: 20px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        flex-shrink: 0;
    }
    
    .notificacion.success {
        background-color: #4bb543;
        border-left: 4px solid #3a9a33;
    }
    
    .notificacion.error {
        background-color: #dc3545;
        border-left: 4px solid #c82333;
    }
    
    .notificacion.warning {
        background-color: #ffc107;
        color: #212529;
        border-left: 4px solid #e0a800;
    }
    
    .notificacion.info {
        background-color: #17a2b8;
        border-left: 4px solid #138496;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }`;

document.head.appendChild(estilosNotificaciones);
