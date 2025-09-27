/**
 * Módulo de registro de usuarios para AJ2SE
 * Maneja el registro de nuevos usuarios
 */

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

/**
 * Maneja el envío del formulario de registro
 * @param {Event} event - Evento de envío del formulario
 */
async function handleRegister(event) {
    event.preventDefault();

    // Obtener valores del formulario
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const securityQuestion = document.getElementById('securityQuestion').value;
    const securityAnswer = document.getElementById('securityAnswer').value.trim();

    // Validaciones básicas
    if (!firstName || !lastName || !email || !password || !confirmPassword || !securityQuestion || !securityAnswer) {
        mostrarError('Todos los campos son obligatorios', 'error');
        return;
    }

    if (password !== confirmPassword) {
        mostrarError('Las contraseñas no coinciden', 'error');
        return;
    }

    // Verificar si el usuario ya existe
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userExists = users.some(user => user.email === email);

    if (userExists) {
        mostrarError('Ya existe un usuario con este correo electrónico', 'error');
        return;
    }

    // Crear nuevo usuario
    const newUser = {
        id: Date.now().toString(),
        firstName,
        lastName,
        email,
        password: btoa(password), // Codificación base64 (solo para ejemplo, no es seguro en producción)
        securityQuestion,
        securityAnswer,
        createdAt: new Date().toISOString()
    };

    // Guardar usuario
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    // Mostrar mensaje de éxito
    mostrarError('¡Registro exitoso! Redirigiendo al login...', 'success');

    // Redirigir después de 2 segundos
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

/**
 * Valida el formato de un correo electrónico
 * @param {string} email - Correo electrónico a validar
 * @returns {boolean} true si el formato es válido, false en caso contrario
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Muestra un mensaje en la interfaz
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de mensaje (success, error, warning, info)
 */
function mostrarError(mensaje, tipo = 'error') {
    // Verificar si la función mostrarError de auth.js está disponible
    if (typeof window.mostrarError === 'function' && window.mostrarError !== mostrarError) {
        window.mostrarError(mensaje, tipo);
        return;
    }

    // Implementación básica si no existe la función en auth.js
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <strong>${tipo === 'error' ? 'Error:' : tipo === 'success' ? 'Éxito:' : ''}</strong> ${mensaje}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    // Insertar el mensaje al principio del formulario
    const form = document.getElementById('registerForm');
    if (form) {
        form.insertBefore(alertDiv, form.firstChild);
    }

    // Si es un mensaje de éxito, redirigir después de mostrarlo
    if (tipo === 'success') {
        // Limpiar el formulario
        if (form) form.reset();

        // Redirigir después de un breve retraso para que el usuario vea el mensaje
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}
