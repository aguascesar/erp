// Configuración
const CONFIG = {
    iva: 0.19,
    moneda: 'CLP$',
    decimales: 0
};

// Estado global
let carrito = [];
let metodoPagoSeleccionado = null;

// Elementos del DOM
const elementos = {
    // Navegación
    volverAlPos: document.getElementById('volverAlPos'),
    
    // Datos del documento
    tipoDocumento: document.getElementById('tipoDocumento'),
    
    // Datos del cliente
    datosCliente: document.getElementById('datosCliente'),
    rutCliente: document.getElementById('rutCliente'),
    nombreCliente: document.getElementById('nombreCliente'),
    giroCliente: document.getElementById('giroCliente'),
    direccionCliente: document.getElementById('direccionCliente'),
    comunaCliente: document.getElementById('comunaCliente'),
    ciudadCliente: document.getElementById('ciudadCliente'),
    
    // Método de pago
    montoRecibido: document.getElementById('montoRecibido'),
    cambioElement: document.getElementById('cambio'),
    
    // Resumen
    resumenSubtotal: document.getElementById('resumen-subtotal'),
    resumenIva: document.getElementById('resumen-iva'),
    resumenTotal: document.getElementById('resumen-total'),
    ivaLabel: document.querySelector('#iva-label'),
    
    // Botones
    cancelarPago: document.getElementById('cancelarPago'),
    confirmarPago: document.getElementById('confirmarPago')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar el carrito desde el almacenamiento local
    cargarCarrito();
    
    // Configurar eventos
    configurarEventos();
    
    // Actualizar la interfaz
    actualizarResumenVenta();
});

// Cargar carrito desde localStorage
function cargarCarrito() {
    const carritoGuardado = localStorage.getItem('carritoPendiente');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
    
    if (carrito.length === 0) {
        // Redirigir si el carrito está vacío
        window.location.href = '/modules/pos/';
    }
}

// Configurar eventos
function configurarEventos() {
    // Navegación
    elementos.volverAlPos.addEventListener('click', volverAlPos);
    
    // Tipo de documento
    elementos.tipoDocumento.addEventListener('change', manejarCambioTipoDocumento);
    
    // Validar RUT al perder foco
    if (elementos.rutCliente) {
        elementos.rutCliente.addEventListener('blur', () => {
            if (elementos.rutCliente.value) {
                elementos.rutCliente.value = formatearRut(elementos.rutCliente.value);
            }
        });
    }
    
    // Métodos de pago
    document.querySelectorAll('.metodo-pago').forEach(boton => {
        boton.addEventListener('click', () => seleccionarMetodoPago(boton));
    });
    
    // Monto recibido
    if (elementos.montoRecibido) {
        elementos.montoRecibido.addEventListener('input', calcularCambio);
        elementos.montoRecibido.addEventListener('blur', validarMonto);
    }
    
    // Botones de acción
    if (elementos.cancelarPago) {
        elementos.cancelarPago.addEventListener('click', confirmarCancelarVenta);
    }
    
    if (elementos.confirmarPago) {
        elementos.confirmarPago.addEventListener('click', procesarPago);
    }
}

// Manejar cambio en el tipo de documento
function manejarCambioTipoDocumento() {
    const tipoDoc = this.value;
    const tipoDocConfig = obtenerTipoDocumentoConfig(tipoDoc);
    
    // Mostrar/ocultar datos del cliente según el tipo de documento
    if (tipoDocConfig.requiereCliente) {
        elementos.datosCliente.style.display = 'block';
    } else {
        elementos.datosCliente.style.display = 'none';
    }
    
    // Actualizar resumen
    actualizarResumenVenta();
}

// Obtener configuración del tipo de documento
function obtenerTipoDocumentoConfig(tipoDoc) {
    const tiposDocumento = [
        { id: 'boleta', nombre: 'Boleta Electrónica', requiereCliente: false },
        { id: 'factura', nombre: 'Factura Electrónica', requiereCliente: true },
        { id: 'factura_exenta', nombre: 'Factura Exenta Electrónica', requiereCliente: true }
    ];
    
    return tiposDocumento.find(t => t.id === tipoDoc) || tiposDocumento[0];
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
    
    // Habilitar/deshabilitar confirmación de pago
    actualizarEstadoBotonConfirmar();
}

// Calcular cambio
function calcularCambio() {
    if (!elementos.montoRecibido || !elementos.cambioElement) return;
    
    const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
    const total = parseFloat(
        elementos.resumenTotal.textContent.replace(/[^0-9]/g, '')
    ) || 0;
    
    const cambio = montoRecibido - total;
    
    // Actualizar visualización del cambio
    if (elementos.cambioElement) {
        elementos.cambioElement.textContent = `Cambio: ${formatearMoneda(Math.max(0, cambio))}`;
        elementos.cambioElement.style.color = cambio < 0 ? '#dc3545' : '';
    }
    
    // Actualizar estado del botón de confirmación
    actualizarEstadoBotonConfirmar();
}

// Validar monto recibido
function validarMonto() {
    if (!elementos.montoRecibido || !elementos.resumenTotal) return;
    
    const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
    const total = parseFloat(
        elementos.resumenTotal.textContent.replace(/[^0-9]/g, '')
    ) || 0;
    
    if (montoRecibido < total) {
        mostrarNotificacion('El monto recibido es menor al total', 'error');
        elementos.montoRecibido.focus();
    }
}

// Actualizar resumen de la venta
function actualizarResumenVenta() {
    if (!elementos.tipoDocumento) return;
    
    // Calcular subtotal (suma de precios * cantidades)
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // Determinar el tipo de documento actual
    const tipoDoc = elementos.tipoDocumento.value;
    const tipoDocConfig = obtenerTipoDocumentoConfig(tipoDoc);
    
    // Calcular IVA según tipo de documento
    let iva = 0;
    
    if (tipoDoc === 'factura') {
        iva = Math.round(subtotal * CONFIG.iva);
        if (elementos.ivaLabel) {
            elementos.ivaLabel.textContent = `IVA (${(CONFIG.iva * 100)}%):`;
            elementos.ivaLabel.parentElement.style.display = 'flex';
        }
    } else if (tipoDoc === 'factura_exenta') {
        iva = 0;
        if (elementos.ivaLabel) {
            elementos.ivaLabel.textContent = 'IVA (Exento):';
            elementos.ivaLabel.parentElement.style.display = 'flex';
        }
    } else {
        iva = 0;
        if (elementos.ivaLabel) {
            elementos.ivaLabel.textContent = 'Impuestos:';
            elementos.ivaLabel.parentElement.style.display = 'flex';
        }
    }
    
    const total = subtotal + iva;
    
    // Actualizar resumen en la interfaz
    if (elementos.resumenSubtotal) elementos.resumenSubtotal.textContent = formatearMoneda(subtotal);
    if (elementos.resumenIva) elementos.resumenIva.textContent = formatearMoneda(iva);
    if (elementos.resumenTotal) elementos.resumenTotal.textContent = formatearMoneda(total);
    
    // Actualizar monto mínimo en el input de pago
    if (elementos.montoRecibido) {
        const totalEntero = Math.ceil(total);
        elementos.montoRecibido.setAttribute('min', totalEntero);
        
        // Si el monto actual es menor que el total, actualizarlo
        const montoActual = parseInt(elementos.montoRecibido.value) || 0;
        if (montoActual < totalEntero || elementos.montoRecibido.value === '') {
            elementos.montoRecibido.value = totalEntero;
        }
        
        // Recalcular cambio
        calcularCambio();
    }
    
    // Actualizar estado del botón de confirmación
    actualizarEstadoBotonConfirmar();
}

// Actualizar estado del botón de confirmación
function actualizarEstadoBotonConfirmar() {
    if (!elementos.confirmarPago) return;
    
    // Verificar si hay productos en el carrito
    const tieneProductos = carrito.length > 0;
    
    // Verificar si se seleccionó un método de pago
    const metodoPagoSeleccionado = document.querySelector('.metodo-pago.active') !== null;
    
    // Verificar si el monto es suficiente (solo para pago en efectivo)
    let montoSuficiente = true;
    if (metodoPagoSeleccionado && elementos.montoRecibido) {
        const montoRecibido = parseFloat(elementos.montoRecibido.value) || 0;
        const total = parseFloat(
            elementos.resumenTotal.textContent.replace(/[^0-9]/g, '')
        ) || 0;
        montoSuficiente = montoRecibido >= total;
    }
    
    // Verificar si se requiere información del cliente
    let clienteValido = true;
    const tipoDoc = elementos.tipoDocumento ? elementos.tipoDocumento.value : 'boleta';
    const tipoDocConfig = obtenerTipoDocumentoConfig(tipoDoc);
    
    if (tipoDocConfig.requiereCliente) {
        // Validar campos obligatorios del cliente
        const rutValido = elementos.rutCliente && elementos.rutCliente.value.trim() !== '';
        const nombreValido = elementos.nombreCliente && elementos.nombreCliente.value.trim() !== '';
        
        clienteValido = rutValido && nombreValido;
    }
    
    // Habilitar/deshabilitar botón de confirmación
    elementos.confirmarPago.disabled = !(
        tieneProductos &&
        metodoPagoSeleccionado &&
        montoSuficiente &&
        clienteValido
    );
}

// Formatear número como moneda
function formatearMoneda(monto) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto);
}

// Formatear RUT chileno
function formatearRut(rut) {
    // Eliminar cualquier caracter que no sea número o K
    let rutLimpio = rut.replace(/[^0-9kK]/g, '');
    
    // Si está vacío, devolver vacío
    if (rutLimpio.length === 0) return '';
    
    // Separar el dígito verificador
    let dv = rutLimpio.slice(-1).toUpperCase();
    let rutSinDv = rutLimpio.slice(0, -1);
    
    // Formatear el RUT con puntos y guión
    let rutFormateado = '';
    let contador = 0;
    
    for (let i = rutSinDv.length - 1; i >= 0; i--) {
        rutFormateado = rutSinDv[i] + rutFormateado;
        contador++;
        if (contador === 3 && i > 0) {
            rutFormateado = '.' + rutFormateado;
            contador = 0;
        }
    }
    
    // Agregar el dígito verificador
    return rutFormateado + '-' + dv;
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    
    // Agregar icono según el tipo
    let icono = '';
    switch(tipo) {
        case 'success':
            icono = '✓';
            break;
        case 'error':
            icono = '✗';
            break;
        case 'warning':
            icono = '⚠️';
            break;
        default:
            icono = 'ℹ️';
    }
    
    notificacion.innerHTML = `<span class="notificacion-icono">${icono}</span> ${mensaje}`;
    
    // Agregar al documento
    document.body.appendChild(notificacion);
    
    // Mostrar notificación con animación
    setTimeout(() => {
        notificacion.style.opacity = '1';
        notificacion.style.transform = 'translateX(0)';
    }, 10);
    
    // Cerrar automáticamente después de 4 segundos
    setTimeout(() => {
        notificacion.style.opacity = '0';
        notificacion.style.transform = 'translateX(100%)';
        
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                notificacion.remove();
            }
        }, 300);
    }, 4000);
    
    return notificacion;
}

// Volver al punto de venta
function volverAlPos() {
    window.location.href = '/modules/pos/';
}

// Confirmar cancelación de venta
function confirmarCancelarVenta() {
    if (confirm('¿Está seguro de que desea cancelar la venta? Los datos no guardados se perderán.')) {
        // Limpiar el carrito pendiente
        localStorage.removeItem('carritoPendiente');
        // Redirigir al punto de venta
        volverAlPos();
    }
}

// Mostrar modal de éxito
function mostrarModalExito() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Configurar evento del botón de nueva venta
        document.getElementById('nuevaVentaBtn').onclick = function() {
            modal.style.display = 'none';
            window.location.href = '/modules/pos/';
        };
        
        // Mostrar/ocultar formulario de email
        document.getElementById('enviarPorEmail').onclick = function() {
            const emailForm = document.getElementById('emailForm');
            emailForm.style.display = emailForm.style.display === 'none' ? 'block' : 'none';
        };
        
        // Enviar por email
        document.getElementById('confirmarEnvioEmail').onclick = function() {
            const email = document.getElementById('emailCliente').value;
            if (!email) {
                mostrarNotificacion('Por favor ingrese un correo electrónico', 'error');
                return;
            }
            
            // Aquí iría la lógica para enviar el comprobante por correo
            mostrarNotificacion(`Comprobante enviado a ${email}`, 'success');
            document.getElementById('emailForm').style.display = 'none';
        };
        
        // Imprimir comprobante
        document.getElementById('imprimirComprobante').onclick = function() {
            // Aquí iría la lógica para imprimir el comprobante
            mostrarNotificacion('Preparando impresión del comprobante...', 'info');
            // Simulación de impresión
            setTimeout(() => {
                window.print();
            }, 1000);
        };
    }
}

// Generar PDF del comprobante (simulación)
function generarPDFComprobante() {
    // En una implementación real, aquí se generaría el PDF con una librería como jsPDF
    return {
        url: '#', // URL del PDF generado
        nombre: `comprobante_${new Date().getTime()}.pdf`
    };
}

// Procesar pago
function procesarPago() {
    // Deshabilitar el botón para evitar múltiples clics
    const btnConfirmar = document.getElementById('confirmarPago');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }

    // Validar nuevamente antes de procesar
    if (carrito.length === 0) {
        mostrarNotificacion('❌ No hay productos en el carrito', 'error');
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar Venta';
        }
        return;
    }
    
    if (!metodoPagoSeleccionado) {
        mostrarNotificacion('❌ Por favor seleccione un método de pago', 'error');
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar Venta';
        }
        return;
    }
    
    // Obtener datos del pago
    const tipoDoc = elementos.tipoDocumento ? elementos.tipoDocumento.value : 'boleta';
    const montoRecibido = elementos.montoRecibido ? parseFloat(elementos.montoRecibido.value) || 0 : 0;
    const total = parseFloat(elementos.resumenTotal.textContent.replace(/[^0-9]/g, '')) || 0;
    
    // Validar monto recibido para pagos en efectivo
    if (metodoPagoSeleccionado === 'efectivo' && montoRecibido < total) {
        const faltante = formatearMoneda(total - montoRecibido);
        mostrarNotificacion(`❌ El monto recibido es insuficiente. Faltan ${faltante}`, 'error');
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar Venta';
        }
        return;
    }
    
    // Mostrar notificación de proceso en curso
    const notifId = 'procesando-pago';
    mostrarNotificacion('⏳ Procesando su pago, por favor espere...', 'info', 0, notifId);
    
    // Simular procesamiento del pago (en un caso real, aquí iría la llamada a la API)
    setTimeout(() => {
        // Cerrar notificación de proceso
        const notif = document.getElementById(notifId);
        if (notif) notif.remove();
        
        // Simular éxito del pago (en un caso real, esto dependería de la respuesta de la API)
        const pagoExitoso = true;
        
        if (pagoExitoso) {
            // Limpiar el carrito
            carrito = [];
            localStorage.removeItem('carritoPendiente');
            
            // Mostrar modal de éxito con opciones de comprobante
            mostrarModalExito();
            
            // También mostramos una notificación
            mostrarNotificacion('✅ Venta procesada correctamente', 'success', 5000);
        } else {
            // Mostrar notificación de error
            mostrarNotificacion('❌ Error al procesar el pago. Intente nuevamente.', 'error');
            
            // Reactivar el botón
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar Venta';
            }
        }
    }, 2000); // Simular tiempo de procesamiento
}
