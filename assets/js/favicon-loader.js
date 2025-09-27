/**
 * Carga dinámicamente el favicon en todas las páginas
 * Este script debe incluirse en el <head> de cada página HTML
 */

document.addEventListener('DOMContentLoaded', function() {
    // Crear el elemento link para el favicon
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    
    // Ruta al favicon desde la raíz del sitio
    // La ruta es relativa a la ubicación del archivo HTML que carga este script
    favicon.href = '/assets/partials/favicon.svg';
    
    // Verificar si ya existe un favicon y reemplazarlo
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
        existingFavicon.parentNode.replaceChild(favicon, existingFavicon);
    } else {
        // Si no existe, agregarlo al head
        document.head.appendChild(favicon);
    }
});
