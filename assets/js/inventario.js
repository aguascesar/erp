// Variables globales
let productos = [];
let categorias = [];
let modal = document.getElementById('modalProducto');
let formProducto = document.getElementById('formProducto');
let tablaInventario = document.getElementById('tablaInventario').getElementsByTagName('tbody')[0];

// Inicializar jsPDF
const { jsPDF } = window.jspdf;
jsPDF.autoTableSetDefaults({
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    tableLineColor: [189, 195, 199],
    tableLineWidth: 0.1
});

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales
    cargarCategorias();
    cargarProductos();
    
    // Configurar eventos de botones
    document.getElementById('nuevoProducto').addEventListener('click', mostrarModalNuevo);
    document.getElementById('actualizarInventario').addEventListener('click', cargarProductos);
    document.getElementById('cancelarProducto').addEventListener('click', cerrarModal);
    document.querySelector('.cerrar-modal').addEventListener('click', cerrarModal);
    
    // Configurar búsqueda en tiempo real
    document.getElementById('buscarProducto').addEventListener('input', filtrarProductos);
    document.getElementById('filtroCategoria').addEventListener('change', filtrarProductos);
    
    // Configurar envío del formulario
    formProducto.addEventListener('submit', guardarProducto);
    
    // Configurar menú desplegable de exportación
    const btnExportar = document.getElementById('btnExportar');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    btnExportar.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!btnExportar.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Eventos para exportar
    document.getElementById('exportarExcel').addEventListener('click', exportarAExcel);
    document.getElementById('exportarPDF').addEventListener('click', exportarAPDF);
});

// Funciones principales
function cargarProductos() {
    // Aquí iría la llamada a la API para obtener los productos
    // Por ahora usaremos datos de ejemplo
    productos = [
        { id: 1, codigo: 'PROD001', nombre: 'Laptop HP', categoria: 'Tecnología', stock: 15, stockMinimo: 5, precioCompra: 1200, precioVenta: 1599.99 },
        { id: 2, codigo: 'PROD002', nombre: 'Mouse Inalámbrico', categoria: 'Accesorios', stock: 42, stockMinimo: 10, precioCompra: 15.99, precioVenta: 29.99 },
        { id: 3, codigo: 'PROD003', nombre: 'Teclado Mecánico', categoria: 'Accesorios', stock: 3, stockMinimo: 5, precioCompra: 45.50, precioVenta: 79.99 },
        { id: 4, codigo: 'PROD004', nombre: 'Monitor 24"', categoria: 'Tecnología', stock: 8, stockMinimo: 3, precioCompra: 199.99, precioVenta: 299.99 },
        { id: 5, codigo: 'PROD005', nombre: 'Impresora Láser', categoria: 'Oficina', stock: 0, stockMinimo: 2, precioCompra: 249.99, precioVenta: 349.99 }
    ];
    
    actualizarTablaProductos();
}

function cargarCategorias() {
    // Aquí iría la llamada a la API para obtener las categorías
    // Por ahora usaremos datos de ejemplo
    categorias = ['Tecnología', 'Accesorios', 'Oficina', 'Suministros'];
    
    // Llenar el select de categorías en el formulario
    const selectCategoria = document.getElementById('categoria');
    const selectFiltroCategoria = document.getElementById('filtroCategoria');
    
    // Limpiar opciones existentes (excepto la primera)
    selectCategoria.innerHTML = '<option value="">Seleccione una categoría</option>';
    selectFiltroCategoria.innerHTML = '<option value="">Todas las categorías</option>';
    
    // Agregar categorías a los selects
    categorias.forEach(categoria => {
        selectCategoria.innerHTML += `<option value="${categoria}">${categoria}</option>`;
        selectFiltroCategoria.innerHTML += `<option value="${categoria}">${categoria}</option>`;
    });
}

function actualizarTablaProductos(productosFiltrados = null) {
    const datos = productosFiltrados || productos;
    
    // Limpiar tabla
    tablaInventario.innerHTML = '';
    
    if (datos.length === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = '<td colspan="8" class="text-center">No se encontraron productos</td>';
        tablaInventario.appendChild(fila);
        return;
    }
    
    // Llenar tabla con los productos
    datos.forEach(producto => {
        const fila = document.createElement('tr');
        
        // Determinar el estado del stock
        let estadoClase = '';
        let estadoTexto = '';
        
        if (producto.stock <= 0) {
            estadoClase = 'estado-agotado';
            estadoTexto = 'Agotado';
        } else if (producto.stock <= producto.stockMinimo) {
            estadoClase = 'estado-bajo';
            estadoTexto = 'Bajo stock';
        } else {
            estadoClase = 'estado-disponible';
            estadoTexto = 'Disponible';
        }
        
        fila.innerHTML = `
            <td>${producto.codigo}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria}</td>
            <td>${producto.stock} ${producto.stock <= producto.stockMinimo ? '<i class="fas fa-exclamation-triangle" style="color: orange; margin-left: 5px;" title="Stock por debajo del mínimo"></i>' : ''}</td>
            <td>$${producto.precioCompra.toFixed(2)}</td>
            <td>$${producto.precioVenta.toFixed(2)}</td>
            <td><span class="estado-stock ${estadoClase}">${estadoTexto}</span></td>
            <td class="acciones">
                <button class="btn-icon editar" data-id="${producto.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon eliminar" data-id="${producto.id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Agregar eventos a los botones de acción
        fila.querySelector('.editar').addEventListener('click', () => editarProducto(producto.id));
        fila.querySelector('.eliminar').addEventListener('click', () => confirmarEliminarProducto(producto.id));
        
        tablaInventario.appendChild(fila);
    });
}

// Funciones del modal
function mostrarModalNuevo() {
    document.getElementById('tituloModal').textContent = 'Nuevo Producto';
    formProducto.reset();
    document.getElementById('productoId').value = '';
    modal.style.display = 'flex';
}

function mostrarModalEditar(producto) {
    document.getElementById('tituloModal').textContent = 'Editar Producto';
    
    // Llenar el formulario con los datos del producto
    document.getElementById('productoId').value = producto.id;
    document.getElementById('codigo').value = producto.codigo;
    document.getElementById('nombre').value = producto.nombre;
    document.getElementById('descripcion').value = producto.descripcion || '';
    document.getElementById('categoria').value = producto.categoria;
    document.getElementById('precioCompra').value = producto.precioCompra;
    document.getElementById('precioVenta').value = producto.precioVenta;
    document.getElementById('stock').value = producto.stock;
    document.getElementById('stockMinimo').value = producto.stockMinimo || 0;
    
    modal.style.display = 'flex';
}

function cerrarModal() {
    modal.style.display = 'none';
}

// Funciones CRUD
function guardarProducto(e) {
    e.preventDefault();
    
    const id = document.getElementById('productoId').value;
    const producto = {
        codigo: document.getElementById('codigo').value,
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        categoria: document.getElementById('categoria').value,
        precioCompra: parseFloat(document.getElementById('precioCompra').value),
        precioVenta: parseFloat(document.getElementById('precioVenta').value),
        stock: parseInt(document.getElementById('stock').value) || 0,
        stockMinimo: parseInt(document.getElementById('stockMinimo').value) || 0
    };
    
    // Validaciones básicas
    if (!producto.codigo || !producto.nombre || !producto.categoria) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }
    
    if (producto.precioCompra <= 0 || producto.precioVenta <= 0) {
        alert('Los precios deben ser mayores a cero');
        return;
    }
    
    if (producto.precioVenta <= producto.precioCompra) {
        if (!confirm('El precio de venta es menor o igual al precio de compra. ¿Desea continuar?')) {
            return;
        }
    }
    
    // En una implementación real, aquí iría la llamada a la API
    if (id) {
        // Actualizar producto existente
        const index = productos.findIndex(p => p.id == id);
        if (index !== -1) {
            producto.id = parseInt(id);
            productos[index] = producto;
            mostrarMensaje('Producto actualizado correctamente');
        }
    } else {
        // Crear nuevo producto
        producto.id = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        productos.push(producto);
        mostrarMensaje('Producto creado correctamente');
    }
    
    // Actualizar la tabla y cerrar el modal
    actualizarTablaProductos();
    cerrarModal();
}

function editarProducto(id) {
    const producto = productos.find(p => p.id == id);
    if (producto) {
        mostrarModalEditar(producto);
    }
}

function confirmarEliminarProducto(id) {
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
        eliminarProducto(id);
    }
}

function eliminarProducto(id) {
    // En una implementación real, aquí iría la llamada a la API
    const index = productos.findIndex(p => p.id == id);
    if (index !== -1) {
        productos.splice(index, 1);
        actualizarTablaProductos();
        mostrarMensaje('Producto eliminado correctamente');
    }
}

// Funciones de filtrado
function filtrarProductos() {
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;
    
    const productosFiltrados = productos.filter(producto => {
        const coincideBusqueda = 
            producto.codigo.toLowerCase().includes(busqueda) ||
            producto.nombre.toLowerCase().includes(busqueda);
            
        const coincideCategoria = !categoriaSeleccionada || 
                                producto.categoria === categoriaSeleccionada;
        
        return coincideBusqueda && coincideCategoria;
    });
    
    actualizarTablaProductos(productosFiltrados);
}

// Funciones de utilidad
function mostrarMensaje(mensaje, tipo = 'success') {
    // En una implementación real, podrías usar un sistema de notificaciones más sofisticado
    alert(mensaje);
}

// Cerrar el modal al hacer clic fuera del contenido
window.addEventListener('click', function(event) {
    if (event.target === modal) {
        cerrarModal();
    }
});

// Funciones de exportación
function exportarAExcel(e) {
    e.preventDefault();
    
    // Obtener los datos actuales (filtrados si hay algún filtro aplicado)
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;
    
    const productosAExportar = productos.filter(producto => {
        const coincideBusqueda = 
            producto.codigo.toLowerCase().includes(busqueda) ||
            producto.nombre.toLowerCase().includes(busqueda);
            
        const coincideCategoria = !categoriaSeleccionada || 
                                producto.categoria === categoriaSeleccionada;
        
        return coincideBusqueda && coincideCategoria;
    });
    
    // Preparar los datos para Excel
    const datos = productosAExportar.map(producto => ({
        'Código': producto.codigo,
        'Producto': producto.nombre,
        'Categoría': producto.categoria,
        'Stock Actual': producto.stock,
        'Stock Mínimo': producto.stockMinimo,
        'Precio Compra': `$${producto.precioCompra.toFixed(2)}`,
        'Precio Venta': `$${producto.precioVenta.toFixed(2)}`,
        'Estado': producto.stock <= 0 ? 'Agotado' : (producto.stock <= producto.stockMinimo ? 'Bajo Stock' : 'Disponible')
    }));
    
    // Crear un libro de trabajo y una hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    
    // Ajustar el ancho de las columnas
    const wscols = [
        {wch: 15}, // Código
        {wch: 30}, // Producto
        {wch: 20}, // Categoría
        {wch: 12}, // Stock Actual
        {wch: 12}, // Stock Mínimo
        {wch: 15}, // Precio Compra
        {wch: 15}, // Precio Venta
        {wch: 15}  // Estado
    ];
    ws['!cols'] = wscols;
    
    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    
    // Generar el archivo Excel
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Inventario_${fecha}.xlsx`);
    
    // Cerrar el menú desplegable
    document.querySelector('.dropdown-menu').classList.remove('show');
    
    mostrarMensaje('Exportación a Excel completada correctamente');
}

function exportarAPDF(e) {
    e.preventDefault();
    
    // Obtener los datos actuales (filtrados si hay algún filtro aplicado)
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const categoriaSeleccionada = document.getElementById('filtroCategoria').value;
    
    const productosAExportar = productos.filter(producto => {
        const coincideBusqueda = 
            producto.codigo.toLowerCase().includes(busqueda) ||
            producto.nombre.toLowerCase().includes(busqueda);
            
        const coincideCategoria = !categoriaSeleccionada || 
                                producto.categoria === categoriaSeleccionada;
        
        return coincideBusqueda && coincideCategoria;
    });
    
    // Preparar los datos para PDF
    const columnas = [
        { title: 'Código', dataKey: 'codigo' },
        { title: 'Producto', dataKey: 'nombre' },
        { title: 'Categoría', dataKey: 'categoria' },
        { title: 'Stock', dataKey: 'stock' },
        { title: 'Precio Venta', dataKey: 'precioVenta' },
        { title: 'Estado', dataKey: 'estado' }
    ];
    
    const filas = productosAExportar.map(producto => ({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        stock: producto.stock,
        precioVenta: `$${producto.precioVenta.toFixed(2)}`,
        estado: producto.stock <= 0 ? 'Agotado' : (producto.stock <= producto.stockMinimo ? 'Bajo Stock' : 'Disponible')
    }));
    
    // Crear el documento PDF
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    // Título del documento
    const titulo = 'Reporte de Inventario';
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Agregar encabezado
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text(titulo, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generado el: ${fecha}`, 14, 30);
    
    // Agregar información de filtros si existen
    let filtros = [];
    if (busqueda) filtros.push(`Búsqueda: "${busqueda}"`);
    if (categoriaSeleccionada) filtros.push(`Categoría: ${categoriaSeleccionada}`);
    
    if (filtros.length > 0) {
        doc.text(`Filtros aplicados: ${filtros.join(', ')}`, 14, 38);
    }
    
    // Agregar la tabla
    doc.autoTable({
        head: [columnas.map(col => col.title)],
        body: filas.map(fila => columnas.map(col => fila[col.dataKey])),
        startY: 50,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 25 }, // Código
            1: { cellWidth: 60 }, // Producto
            2: { cellWidth: 40 }, // Categoría
            3: { cellWidth: 20 }, // Stock
            4: { cellWidth: 25 }, // Precio Venta
            5: { cellWidth: 30 }  // Estado
        },
        didDrawPage: function(data) {
            // Pie de página
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(
                `Página ${data.pageNumber} de ${pageCount}`, 
                doc.internal.pageSize.width - 30, 
                doc.internal.pageSize.height - 10,
                { align: 'right' }
            );
        }
    });
    
    // Guardar el PDF
    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`Inventario_${fechaArchivo}.pdf`);
    
    // Cerrar el menú desplegable
    document.querySelector('.dropdown-menu').classList.remove('show');
    
    mostrarMensaje('Exportación a PDF completada correctamente');
}
