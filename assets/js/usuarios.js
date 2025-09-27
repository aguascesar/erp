// Clase para manejar las operaciones CRUD de usuarios
class UsuarioService {
    constructor() {
        this.usuarios = this.obtenerUsuarios();
    }

    // Validar formato de RUT chileno
    validarRut(rut) {
        if (!rut) return false;
        
        // Limpiar formato
        rut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
        
        // Validar formato
        if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
        
        // Validar dígito verificador
        const dv = rut.slice(-1);
        const num = rut.slice(0, -1);
        
        let suma = 0;
        let multiplo = 2;
        
        for (let i = num.length - 1; i >= 0; i--) {
            suma += parseInt(num.charAt(i)) * multiplo;
            multiplo = multiplo === 7 ? 2 : multiplo + 1;
        }
        
        const dvEsperado = 11 - (suma % 11);
        const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
        
        return dv === dvCalculado;
    }

    // Validar email
    validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Validar contraseña
    validarPassword(pass) {
        return pass && pass.length >= 6;
    }

    // Verificar si el usuario ya existe
    usuarioExiste(rut, email, usuario) {
        return this.usuarios.some(u => 
            (u.rut === rut || u.email === email || u.user === usuario) && 
            u.estado === 'Activo'
        );
    }

    // Obtener todos los usuarios
    obtenerUsuarios() {
        try {
            const usuariosGuardados = localStorage.getItem('usuarios');
            if (!usuariosGuardados) {
                console.warn('No se encontraron usuarios en el almacenamiento local');
                return [];
            }
            const usuarios = JSON.parse(usuariosGuardados);
            console.log('Usuarios cargados:', usuarios);
            return Array.isArray(usuarios) ? usuarios : [];
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            return [];
        }
    }

    // Obtener un usuario por su ID
    obtenerUsuarioPorId(id) {
        return this.usuarios.find(usuario => usuario.id === id) || null;
    }

    // Validar datos del usuario
    validarUsuario(usuario, esActualizacion = false) {
        if (!usuario.nombre || !usuario.apellido || !usuario.rut || !usuario.email || !usuario.user || (!esActualizacion && !usuario.pass)) {
            return { valido: false, mensaje: 'Todos los campos son obligatorios' };
        }

        if (!this.validarRut(usuario.rut)) {
            return { valido: false, mensaje: 'El RUT ingresado no es válido' };
        }

        if (!this.validarEmail(usuario.email)) {
            return { valido: false, mensaje: 'El correo electrónico no es válido' };
        }

        if (!esActualizacion && !this.validarPassword(usuario.pass)) {
            return { valido: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' };
        }

        // Verificar si ya existe un usuario con el mismo RUT, email o nombre de usuario
        if (this.usuarios.some(u => 
            u.id !== usuario.id && 
            (u.rut === usuario.rut || u.email === usuario.email || u.user === usuario.user) &&
            u.estado === 'Activo'
        )) {
            return { valido: false, mensaje: 'Ya existe un usuario con el mismo RUT, correo o nombre de usuario' };
        }

        return { valido: true };
    }

    // Guardar un nuevo usuario
    guardarUsuario(usuario) {
        const validacion = this.validarUsuario(usuario, false);
        if (!validacion.valido) {
            return { exito: false, mensaje: validacion.mensaje };
        }

        // Generar un ID único
        usuario.id = Date.now().toString();
        usuario.fechaCreacion = new Date().toISOString();
        usuario.estado = 'Activo';
        
        // No almacenar la contraseña en texto plano en una aplicación real
        // Aquí deberías usar un hash como bcrypt
        usuario.pass = btoa(usuario.pass); // Solo como ejemplo, no seguro para producción
        
        this.usuarios.push(usuario);
        this.actualizarAlmacenamiento();
        return { exito: true, usuario };
    }

    // Actualizar un usuario existente
    actualizarUsuario(id, datosActualizados) {
        const indice = this.usuarios.findIndex(u => u.id === id);
        if (indice === -1) {
            return { exito: false, mensaje: 'Usuario no encontrado' };
        }

        const usuarioActual = { ...this.usuarios[indice] };
        const usuarioActualizado = { ...usuarioActual, ...datosActualizados };

        const validacion = this.validarUsuario(usuarioActualizado, true);
        if (!validacion.valido) {
            return { exito: false, mensaje: validacion.mensaje };
        }

        // Si se está actualizando la contraseña
        if (datosActualizados.pass) {
            usuarioActualizado.pass = btoa(datosActualizados.pass);
        } else {
            // Mantener la contraseña actual si no se está cambiando
            usuarioActualizado.pass = usuarioActual.pass;
        }

        this.usuarios[indice] = usuarioActualizado;
        this.actualizarAlmacenamiento();
        return { exito: true, usuario: usuarioActualizado };
    }

    // Eliminar un usuario (cambiar estado a inactivo)
    eliminarUsuario(id) {
        id = id.toString(); // Asegurar que el id sea string
        const indice = this.usuarios.findIndex(u => u.id.toString() === id);
        if (indice !== -1) {
            this.usuarios[indice].estado = 'Inactivo';
            this.actualizarAlmacenamiento();
            return { exito: true };
        }
        return { exito: false, mensaje: 'Usuario no encontrado' };
    }

    // Reactivar un usuario
    reactivarUsuario(id) {
        id = id.toString(); // Asegurar que el id sea string
        const indice = this.usuarios.findIndex(u => u.id.toString() === id);
        if (indice !== -1) {
            this.usuarios[indice].estado = 'Activo';
            this.actualizarAlmacenamiento();
            return { exito: true };
        }
        return { exito: false, mensaje: 'Usuario no encontrado' };
    }

    // Eliminar permanentemente un usuario
    eliminarPermanente(id) {
        const indice = this.usuarios.findIndex(u => u.id.toString() === id.toString());
        if (indice !== -1) {
            this.usuarios.splice(indice, 1);
            this.actualizarAlmacenamiento();
            return { exito: true };
        }
        return { exito: false, mensaje: 'Usuario no encontrado' };
    }

    // Actualizar el almacenamiento local
    actualizarAlmacenamiento() {
        localStorage.setItem('usuarios', JSON.stringify(this.usuarios));
    }
}

// Instancia global del servicio
const usuarioService = new UsuarioService();
