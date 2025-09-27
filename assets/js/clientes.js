// Clase para manejar las operaciones CRUD de clientes
class ClienteService {
    constructor() {
        this.clientes = this.obtenerClientes();
    }

    // Obtener todos los clientes
    obtenerClientes() {
        const clientesGuardados = localStorage.getItem('clientes');
        return clientesGuardados ? JSON.parse(clientesGuardados) : [];
    }

    // Obtener un cliente por su ID
    obtenerClientePorId(id) {
        return this.clientes.find(cliente => cliente.id === id) || null;
    }

    // Guardar un nuevo cliente
    guardarCliente(cliente) {
        // Generar un ID único
        cliente.id = Date.now().toString();
        cliente.fechaCreacion = new Date().toISOString();
        
        this.clientes.push(cliente);
        this.actualizarAlmacenamiento();
        return cliente;
    }

    // Actualizar un cliente existente
    actualizarCliente(id, datosActualizados) {
        const indice = this.clientes.findIndex(c => c.id === id);
        if (indice !== -1) {
            this.clientes[indice] = { ...this.clientes[indice], ...datosActualizados };
            this.actualizarAlmacenamiento();
            return true;
        }
        return false;
    }

    // Eliminar un cliente
    eliminarCliente(id) {
        const indice = this.clientes.findIndex(c => c.id === id);
        if (indice !== -1) {
            this.clientes.splice(indice, 1);
            this.actualizarAlmacenamiento();
            return true;
        }
        return false;
    }

    // Actualizar el almacenamiento local
    actualizarAlmacenamiento() {
        localStorage.setItem('clientes', JSON.stringify(this.clientes));
    }
}

// Instancia global del servicio
const clienteService = new ClienteService();
