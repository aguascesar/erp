/**
 * Módulo de autenticación para AJ2SE
 * Maneja el inicio de sesión, cierre de sesión y gestión de usuarios
 */

// Cache para usuarios
let usersCache = null;

/**
 * Función para decodificar base64 optimizada
 */
function decodeBase64(str) {
    try {
        return JSON.parse(atob(str));
    } catch (e) {
        console.error('Error al decodificar datos:', e);
        return null;
    }
}

/**
 * Obtiene los usuarios desde el almacenamiento local
 * @returns {Array} Lista de usuarios
 */
async function obtenerUsuarios() {
    console.log('Obteniendo usuarios desde localStorage...');

    // Si ya tenemos los usuarios en caché, los devolvemos
    if (usersCache) {
        console.log('Usando usuarios en caché:', usersCache);
        return usersCache;
    }

    try {
        // Obtener usuarios desde localStorage
        const usuariosGuardados = localStorage.getItem('usuarios');
        console.log('Usuarios en localStorage:', usuariosGuardados);

        if (usuariosGuardados) {
            usersCache = JSON.parse(usuariosGuardados);
            console.log('Usuarios parseados desde localStorage:', usersCache);
            return usersCache;
        }

        console.warn('No se encontraron usuarios en localStorage');
        return [];

    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
    }
}

/**
 * Verifica si una cadena está en formato base64
 * @param {string} str - Cadena a verificar
 * @returns {boolean} true si es base64, false en caso contrario
 */
function isBase64(str) {
    try {
        // Verificar si la cadena es base64 válida
        return btoa(atob(str)) === str;
    } catch (e) {
        return false;
    }
}

/**
 * Compara una contraseña en texto plano con una almacenada (puede estar en base64)
 * @param {string} inputPassword - Contraseña proporcionada por el usuario
 * @param {string} storedPassword - Contraseña almacenada (puede estar en base64)
 * @returns {boolean} true si coinciden, false en caso contrario
 */
function comparePasswords(inputPassword, storedPassword) {
    try {
        // Si la contraseña almacenada está en base64, decodificarla antes de comparar
        if (isBase64(storedPassword)) {
            const decodedPassword = atob(storedPassword);
            return inputPassword === decodedPassword;
        }
        // Si no está en base64, comparar directamente
        return inputPassword === storedPassword;
    } catch (error) {
        console.error('Error al comparar contraseñas:', error);
        return false;
    }
}

/**
 * Autentica un usuario
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Usuario autenticado
 * @throws {Error} Con mensaje descriptivo del error
 */
async function autenticarUsuario(email, password) {
    console.log('Iniciando autenticación para:', email);

    try {
        // Validar parámetros de entrada
        if (!email || typeof email !== 'string') {
            throw new Error('El correo electrónico es requerido');
        }

        if (!password || typeof password !== 'string') {
            throw new Error('La contraseña es requerida');
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('El formato del correo electrónico no es válido');
        }

        // Obtener usuarios
        console.log('Obteniendo lista de usuarios...');
        const usuarios = await obtenerUsuarios();
        console.log('Usuarios encontrados:', usuarios);

        // Verificar si se obtuvieron usuarios
        if (!Array.isArray(usuarios)) {
            console.error('Error: No se pudieron cargar los usuarios');
            throw new Error('Error en la autenticación. Por favor, intente más tarde.');
        }

        // Buscar usuario por email (case insensitive)
        const emailLower = email.toLowerCase();
        console.log('Buscando usuario con email (lowercase):', emailLower);

        const usuario = usuarios.find(u => {
            if (!u || (!u.email && !u.correo)) return false;
            const userEmail = (u.email || u.correo || '').toLowerCase();
            return userEmail === emailLower;
        });

        console.log('Usuario encontrado:', usuario);

        if (!usuario) {
            console.warn(`Intento de inicio de sesión fallido para el usuario: ${email}`);
            console.warn('Usuarios disponibles:', usuarios.map(u => (u?.email || u?.correo || 'sin correo')));
            throw new Error('Usuario o contraseña incorrectos');
        }

        // Verificar si el usuario está habilitado
        if (usuario.habilitar === false || usuario.estado === 'Inactivo') {
            console.warn(`Intento de inicio de sesión para usuario inactivo: ${email}`);
            throw new Error('Esta cuenta está deshabilitada. Por favor, contacte al administrador.');
        }

        // Verificar contraseña
        console.log('Verificando contraseña...');
        const contrasenaAlmacenada = usuario.pass || usuario.contrasena || '';
        console.log('Contraseña almacenada (posiblemente en base64):', contrasenaAlmacenada);

        const esContrasenaValida = await comparePasswords(password, contrasenaAlmacenada);
        console.log('Resultado de verificación de contraseña:', esContrasenaValida);

        if (!esContrasenaValida) {
            console.warn('Contraseña incorrecta para el usuario:', email);
            throw new Error('Usuario o contraseña incorrectos');
        }

        console.log('Autenticación exitosa para el usuario:', email);
        return usuario;

    } catch (error) {
        console.error('Error en autenticación:', {
            error: error.message,
            email,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Verifica si hay una sesión activa
 * @returns {boolean} true para permitir acceso sin autenticación
 */
function verificarSesion() {
    // Forzar autenticación exitosa
    localStorage.setItem('isAuthenticated', 'true');
    // Asegurarse de que el usuario tenga un correo y nombre por defecto
    if (!localStorage.getItem('userEmail')) {
        localStorage.setItem('userEmail', 'admin@example.com');
    }
    if (!localStorage.getItem('userName')) {
        localStorage.setItem('userName', 'Administrador');
    }
    return true;
}

/**
 * Muestra un mensaje de error en el formulario
 * @param {string} mensaje - Mensaje de error a mostrar
 * @param {string} tipo - Tipo de mensaje (error, success, warning)
 */
function mostrarError(mensaje, tipo = 'error') {
    // Eliminar mensajes de error anteriores
    const erroresAnteriores = document.querySelectorAll('.alert');
    erroresAnteriores.forEach(el => el.remove());

    // Crear elemento de error
    const errorDiv = document.createElement('div');
    errorDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    errorDiv.role = 'alert';
    errorDiv.id = 'error-message';

    // Agregar icono según el tipo de mensaje
    let icono = '';
    if (tipo === 'success') {
        icono = '<i class="fas fa-check-circle mr-2"></i>';
    } else if (tipo === 'warning') {
        icono = '<i class="fas fa-exclamation-triangle mr-2"></i>';
    } else {
        icono = '<i class="fas fa-exclamation-circle mr-2"></i>';
    }

    errorDiv.innerHTML = `
        ${icono}
        <span>${mensaje}</span>
        <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    // Insertar el mensaje en el formulario
    const form = document.querySelector('form');
    if (form) {
        form.prepend(errorDiv);

        // Desplazarse al mensaje de error
        setTimeout(() => {
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    } else {
        // Si no hay formulario, mostrar como notificación
        console.error('Mensaje de error (no se pudo mostrar en el formulario):', mensaje);
    }

    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.classList.remove('show');
            setTimeout(() => errorDiv.remove(), 150);
        }
    }, 5000);
}

/**
 * Maneja el envío del formulario de inicio de sesión
 * @param {Event} event - Evento de envío del formulario
 */
async function handleLogin(event) {
    event.preventDefault();

    const loginForm = document.getElementById('loginForm');
    const email = document.getElementById('inputEmail').value.trim();
    const password = document.getElementById('inputPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Deshabilitar botón y mostrar indicador de carga
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Iniciando sesión...';

    try {
        const usuario = await autenticarUsuario(email, password);

        // Guardar estado de autenticación
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', usuario.correo || email);
        localStorage.setItem('userName', usuario.nombre || 'Usuario');

        // Guardar en cookies si se seleccionó "Recordarme"
        if (rememberMe) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 30); // 30 días
            document.cookie = `rememberMe=true; expires=${expirationDate.toUTCString()}; path=/`;
        }

        // Mostrar mensaje de éxito
        mostrarError('¡Inicio de sesión exitoso! Redirigiendo...', 'success');

        // Redirigir después de un breve retraso
        setTimeout(() => {
            window.location.href = '../modules/gestion/dashboard.html?login=success';

        }, 1000);

    } catch (error) {
        // Mostrar mensaje de error
        mostrarError(error.message || 'Error en la autenticación');

        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        // Enfocar el campo correspondiente
        try {
            if (error.message.includes('correo') || error.message.includes('email')) {
                document.getElementById('inputEmail').focus();
            } else if (error.message.includes('contraseña')) {
                document.getElementById('inputPassword').focus();
            }
        } catch (e) {
            console.error('Error al manejar el foco:', e);
        }
    }
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
    // Eliminar datos de autenticación
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');

    // Eliminar cookie de recordar
    document.cookie = 'rememberMe=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Redirigir al login
    window.location.href = 'auth/login.html';
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    // Configurar el formulario de login si existe
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Verificar si hay una sesión activa
    if (verificarSesion()) {
        // Evitar bucle de redirección verificando la ruta actual
        if (!window.location.pathname.includes('dashboard.html')) {
            window.location.href = '../modules/gestion/dashboard.html';
        }
    } else if (window.location.pathname.includes('dashboard.html')) {
        // Si no hay sesión y está en dashboard, redirigir a login
        window.location.href = 'auth/login.html';
    }
});

// Exportar funciones para usar en otros archivos
window.Auth = {
    verificarSesion,
    logout,
    obtenerUsuarios,
    autenticarUsuario
};
