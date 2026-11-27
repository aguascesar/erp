# Configuración de Google Sheets + Google Apps Script

Esta solución permite recibir datos de pesajes desde Gambas3 sin necesidad de un servidor Node.js, ideal para GitHub Pages.

## Paso 1: Crear Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de cálculo con el nombre "Pesajes ERP"
3. No necesitas agregar encabezados manualmente, el script los creará automáticamente

## Paso 2: Crear Google Apps Script

1. En tu Google Sheet, ve a **Extensiones** > **Apps Script**
2. Borra el código predeterminado
3. Copia el contenido del archivo `Code.gs` de este repositorio
4. Pégalo en el editor de Apps Script
5. **IMPORTANTE:** Cambia la constante `API_TOKEN` por un token seguro:

```javascript
const API_TOKEN = 'tu_token_seguro_unico_aqui';
```

6. Guarda el proyecto (Ctrl+S o Cmd+S)

## Paso 3: Desplegar el Script como API Web

1. En el editor de Apps Script, haz clic en **Implementar** > **Nueva implementación**
2. Selecciona:
   - **Tipo:** Aplicación web
   - **Descripción:** API de Pesajes
   - **Ejecutar como:** Yo (tu cuenta de Google)
   - **Quién tiene acceso:** Cualquier persona (para que Gambas3 pueda enviar datos)
3. Haz clic en **Implementar**
4. Copia la **URL de la aplicación web** que te muestra (termina en `/exec`)

## Paso 4: Configurar Gambas3

En tu código Gambas3, actualiza las constantes:

```gambas
Private Const URL_API_PESAJE As String = "https://script.google.com/macros/s/TU_ID_DEL_SCRIPT/exec"
Private Const TOKEN_API As String = "tu_token_seguro_unico_aqui"
```

**IMPORTANTE:** La URL debe ser la que copiaste en el paso 3.

## Paso 5: Configurar la Interfaz Web

1. Abre el archivo `assets/js/api_pesajes.js`
2. Reemplaza la constante `SCRIPT_URL` con tu URL del script:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID_DEL_SCRIPT/exec';
```

3. Guarda los cambios

## Paso 6: Probar la Conexión

### Desde Gambas3:

Ejecuta tu función `EnviarJsonConReintentos` con datos de prueba. Deberías recibir una respuesta como:

```json
{
  "success": true,
  "message": "Pesaje recibido y guardado correctamente",
  "id": 1
}
```

### Desde la Interfaz Web:

1. Abre tu sitio GitHub Pages
2. Navega a `/modules/api_pesajes/`
3. Deberías ver los datos cargados desde Google Sheets

## Estructura de Datos en Google Sheets

El script crea automáticamente una hoja llamada "Pesajes" con las siguientes columnas:

- ID
- Recibido (timestamp)
- idraM
- Patente
- Tipo
- Tara
- UbicacionOUT
- Cliente1
- RUT Cliente1
- Fono Cliente1
- Proceso
- Producto1 Code
- Producto1
- Producto1 Valor
- Producto1 Cantidad
- Producto1 Valor Total
- Producto2
- Producto2 Valor
- Producto2 Cantidad
- Producto2 Valor Total
- Productos Valor Total
- Guia Despacho
- Conductor Salida Apellido
- Conductor Salida Nombre
- Conductor Salida RUT
- Conductor Salida Fono
- Humedad
- Gluten
- Categoria
- Falling Number
- Especifico
- Recibe
- Almacenaje
- N Muestra
- Condicion
- Fecha Out1
- Hora Out1
- Obs Entrada
- Obs Salida
- Peso Out1
- Peso Neto1
- User Out
- Pesaje Tipo
- Pesaje Valor
- Pesaje Proceso

## Ventajas de esta Solución

- ✅ **100% Gratis** - Sin costos de servidor
- ✅ **GitHub Pages Compatible** - Solo frontend estático
- ✅ **Interfaz Visual** - Google Sheets como dashboard
- ✅ **Exportación Fácil** - Excel, CSV, PDF desde Google Sheets
- ✅ **Backup Automático** - Google guarda versiones
- ✅ **Acceso Móvil** - App de Google Sheets
- ✅ **Colaboración** - Múltiples usuarios pueden ver/editar

## Limitaciones

- ⚠️ **Cuota de Google Apps Script** - Límite de 20,000 requests/día (gratuito)
- ⚠️ **Latencia** - Puede ser más lento que un servidor dedicado
- ⚠️ **Eliminación** - Para eliminar registros, hacerlo directamente en Google Sheets

## Solución de Problemas

### Error: "Token de autenticación inválido"

- Verifica que el token en Gambas3 coincida exactamente con el de `Code.gs`
- Revisa que no haya espacios extras

### Error: "Error al cargar los datos" en la interfaz web

- Verifica que la URL en `api_pesajes.js` sea correcta
- Asegúrate de que el script esté desplegado como "Aplicación web"
- Verifica que el acceso sea "Cualquier persona"

### Los datos no aparecen en Google Sheets

- Revisa la pestaña "Ejecuciones" en Apps Script para ver errores
- Verifica que el JSON enviado desde Gambas3 tenga los campos `idraM` y `patente`
- Revisa que la hoja de cálculo tenga el nombre correcto ("Pesajes")

### Error CORS en la interfaz web

Google Apps Script puede tener problemas con CORS. Si tienes problemas, usa la URL con `/dev` en lugar de `/exec` para desarrollo:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID_DEL_SCRIPT/dev';
```

## Seguridad

- 🔒 Usa un token fuerte y único
- 🔒 No compartas la URL del script públicamente
- 🔒 Considera restringir el acceso a "Cualquier usuario con cuenta de Google" si prefieres
- 🔒 Revisa periódicamente los registros en Google Sheets

## Actualizar el Script

Si necesitas modificar el script:

1. Edita el código en Apps Script
2. Guarda los cambios
3. Ve a **Implementar** > **Gestionar implementaciones**
4. Crea una nueva versión
5. La URL permanece igual, pero el código se actualiza

## Exportar Datos

Desde Google Sheets puedes:
- **Archivo** > **Descargar** > Microsoft Excel (.xlsx)
- **Archivo** > **Descargar** > Valores separados por comas (.csv)
- **Archivo** > **Descargar** > Documento PDF (.pdf)
- **Archivo** > **Compartir** > Publicar en la web (para embed)
