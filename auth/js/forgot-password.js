// Variables globales
let currentUser = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Referencias a los elementos del DOM
    const form = document.getElementById('forgotPasswordForm');
    const emailSection = document.getElementById('emailSection');
    const securityQuestionSection = document.getElementById('securityQuestionSection');
    const newPasswordSection = document.getElementById('newPasswordSection');
    const questionText = document.getElementById('questionText');
    const verifyAnswerBtn = document.getElementById('verifyAnswerBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');

    // Manejador para el envío del formulario de email
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();

        if (!email) {
            mostrarError('Por favor ingresa tu correo electrónico', 'error');
            return;
        }

        // Buscar el usuario por email
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email);

        if (!user) {
            mostrarError('No se encontró ninguna cuenta con este correo electrónico', 'error');
            return;
        }

        // Guardar el usuario actual y mostrar la pregunta de seguridad
        currentUser = user;
        const questionMap = {
            'mother_maiden': '¿Cuál es el apellido de soltera de tu madre?',
            'first_pet': '¿Cuál fue el nombre de tu primera mascota?',
            'birth_city': '¿En qué ciudad naciste?'
        };

        questionText.textContent = questionMap[user.securityQuestion] || 'Por favor responde tu pregunta de seguridad';

        // Mostrar la sección de pregunta de seguridad
        emailSection.style.display = 'none';
        securityQuestionSection.style.display = 'block';
    });

    // Manejador para verificar la respuesta de seguridad
    verifyAnswerBtn.addEventListener('click', function() {
        const answer = document.getElementById('securityAnswer').value.trim();

        if (!answer) {
            mostrarError('Por favor ingresa tu respuesta', 'error');
            return;
        }

        // Verificar la respuesta (comparación no sensible a mayúsculas)
        if (answer.toLowerCase() !== currentUser.securityAnswer.toLowerCase()) {
            mostrarError('La respuesta no es correcta. Por favor intenta de nuevo.', 'error');
            return;
        }

        // Mostrar la sección de nueva contraseña
        securityQuestionSection.style.display = 'none';
        newPasswordSection.style.display = 'block';
    });

    // Manejador para restablecer la contraseña
    resetPasswordBtn.addEventListener('click', function() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // Validaciones
        if (!newPassword || !confirmNewPassword) {
            mostrarError('Por favor completa todos los campos', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            mostrarError('Las contraseñas no coinciden', 'error');
            return;
        }

        if (newPassword.length < 8) {
            mostrarError('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }

        // Actualizar la contraseña del usuario
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.email === currentUser.email);

        if (userIndex !== -1) {
            users[userIndex].password = btoa(newPassword); // Codificar en base64
            localStorage.setItem('users', JSON.stringify(users));

            // Mostrar mensaje de éxito
            mostrarError('¡Contraseña actualizada correctamente! Redirigiendo al login...', 'success');

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    });
});

// Función para mostrar mensajes (similar a la que ya teníamos en register.js)
function mostrarError(mensaje, tipo = 'error') {
    // Eliminar mensajes anteriores
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <strong>${tipo === 'error' ? 'Error:' : 'Éxito:'}</strong> ${mensaje}
        <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    // Insertar el mensaje después del formulario
    const form = document.getElementById('forgotPasswordForm');
    form.parentNode.insertBefore(alertDiv, form.nextSibling);

    // Desaparecer automáticamente después de 5 segundos (solo para mensajes de éxito)
    if (tipo === 'success') {
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}
