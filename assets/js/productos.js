// Clase para manejar las operaciones CRUD de productos
class ProductoService {
    constructor() {
        this.productos = this.obtenerProductos();
    }

    // Obtener todos los productos
    obtenerProductos() {
        const productosGuardados = localStorage.getItem('productos');
        return productosGuardados ? JSON.parse(productosGuardados) : [];
    }

    // Obtener un producto por su ID
    obtenerProductoPorId(id) {
        return this.productos.find(producto => producto.id === id) || null;
    }

    // Guardar un nuevo producto
    guardarProducto(producto) {
        // Generar un ID único
        producto.id = Date.now().toString();
        producto.fechaCreacion = new Date().toISOString();
        
        // Asegurarse de que el stock sea un número
        producto.stock = Number(producto.stock) || 0;
        
        this.productos.push(producto);
        this.actualizarAlmacenamiento();
        return producto;
    }

    // Actualizar un producto existente
    actualizarProducto(id, datosActualizados) {
        const indice = this.productos.findIndex(p => p.id === id);
        if (indice !== -1) {
            // Asegurarse de que el stock sea un número
            if (datosActualizados.stock !== undefined) {
                datosActualizados.stock = Number(datosActualizados.stock) || 0;
            }
            
            this.productos[indice] = { ...this.productos[indice], ...datosActualizados };
            this.actualizarAlmacenamiento();
            return true;
        }
        return false;
    }

    // Eliminar un producto
    eliminarProducto(id) {
        const indice = this.productos.findIndex(p => p.id === id);
        if (indice !== -1) {
            this.productos.splice(indice, 1);
            this.actualizarAlmacenamiento();
            return true;
        }
        return false;
    }

    // Actualizar el almacenamiento local
    actualizarAlmacenamiento() {
        localStorage.setItem('productos', JSON.stringify(this.productos));
    }
}

// Instancia global del servicio
const productoService = new ProductoService();
