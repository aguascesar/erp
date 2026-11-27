// Google Apps Script para API de Pesajes
// Recibe JSON vía POST desde Gambas3 y guarda en la pestaña "Pesajes_ERP".
// IMPORTANTE: Cada vez que modifiques este código, debes crear una NUEVA VERSIÓN
// en "Implementar" -> "Administrar implementaciones" -> Editar -> "Nueva versión".


/**
 * @OnlyCurrentDoc
 */


const SHEET_NAME = 'Pesajes_ERP';
const API_TOKEN = 'cesar'; // Debe coincidir con TOKEN_API en Gambas3


/**
 * Función de prueba para ejecutar manualmente desde el editor de Apps Script.
 * Selecciona "probarGuardarPesajeManual" en la barra superior y haz clic en "Ejecutar".
 * Permite comprobar si la hoja se crea/abre, si se escriben encabezados y si se inserta la fila.
 */


function probarGuardarPesajeManual() {
  console.log('=== [TEST MANUAL] Iniciando prueba de guardado en hoja "' + SHEET_NAME + '" ===');


  const payloadPrueba = {
    idraM: 'TEST-194021',
    patente: 'JGHF75',
    cliente1: 'PARTICULAR',
    rutCliente1: '12345678-9',
    producto1: 'VARIOS',
    gDespacho1: '123',
    cOutAp: 'AGUAS',
    cOutNom: 'CESAR',
    fechaOut1: '2026/11/26',
    horaOut1: '12:46:30',
    oBsEntrada: ' $$.5500, ',
    oBsSalida: 'PRUEBA_MANUAL',
    pOut1: '43580',
    pN1: '1460',
    UserOut: 'CESAR',
    PesajeTipo: 'PARTICULAR_CON_BOLETA',
    PesajeValor: '$.5500',
    PesajeProceso: 'SALIDA'
  };


  console.log('=== [TEST MANUAL] Payload de prueba: ' + JSON.stringify(payloadPrueba));
  const res = guardarPesaje(payloadPrueba);
  console.log('=== [TEST MANUAL] Resultado final: ' + JSON.stringify(res));
}



/**
 * Punto de entrada HTTP POST (recibe datos JSON enviados desde Gambas3).
 */


function doPost(e) {
  const inicioMs = Date.now();
  console.log('------------------------------------------------------------');
  console.log('[doPost 1/6] Petición POST recibida en Apps Script.');
  try {
    // 1. Verifica que exista el objeto evento y el cuerpo postData.contents
    //console.log('1. Inicio doPost. Keys de e: ' + JSON.stringify(Object.keys(e || {})));
    console.log('[doPost 2/6] Claves en objeto e: ' + JSON.stringify(Object.keys(e || {})));


    if (e && e.parameter) {
      console.log('[doPost 2b/6] Query parameters (e.parameter): ' + JSON.stringify(e.parameter));
    }
/** 
*    if (!e || !e.postData || !e.postData.contents) {
*      console.log('SALIDA TEMPRANA: e.postData vacío -> ' + JSON.stringify(e || {}));
*      return jsonResponse({ error: 'No se recibieron datos en la petición POST' });
*    }
*/
    if (!e || !e.postData || typeof e.postData.contents === 'undefined' || e.postData.contents === '') {
      console.warn('[doPost SALIDA] e.postData o e.postData.contents está vacío. Detalle e: ' + JSON.stringify(e || {}));
      return jsonResponse({
        error: 'No se recibieron datos en la petición POST',
        hint: 'Verifica que Gambas envíe cuerpo en POST (hClient.Post) y que la URL termine en /exec'
      });
    }




    const rawBody = e.postData.contents;
    //console.log('2. rawBody recibido (primeros 300 chars): ' + String(rawBody).slice(0, 300));
    console.log('[doPost 3/6] rawBody recibido (' + String(rawBody).length + ' chars). Muestra: ' + String(rawBody).slice(0, 400));




    // 2. Intenta parsear el JSON entrante
    let data = {};
    try {
      data = JSON.parse(rawBody);
      console.log('[doPost 3b/6] JSON parseado correctamente. Claves recibidas (' + Object.keys(data).length + '): ' + JSON.stringify(Object.keys(data)));
    } catch (parseErr) {
      console.error('[doPost SALIDA] Error al parsear JSON: ' + parseErr.toString());
      //console.log('SALIDA TEMPRANA: JSON inválido -> ' + parseErr.toString());
      //return jsonResponse({ error: 'JSON inválido en postData', details: parseErr.toString() });
      return jsonResponse({
        error: 'JSON inválido en postData',
        details: parseErr.toString(),
        rawPreview: String(rawBody).slice(0, 200)
      });
    }


    // 3. Valida token si viene informado en query string, parámetros o dentro del JSON
    // Nota: en Apps Script las cabeceras HTTP como Authorization no siempre llegan en e.headers
    const tokenRecibido =
      (e.parameter && (e.parameter.token || e.parameter.Authorization)) ||
      data.token ||
      '';


/** 
*    if (tokenRecibido) {
*      const tokenLimpio = String(tokenRecibido).replace(/^Bearer\s+/i, '').trim();
*      if (API_TOKEN && tokenLimpio !== API_TOKEN) {
*        console.log('SALIDA TEMPRANA: Token inválido -> ' + tokenLimpio);
*        return jsonResponse({ error: 'Token de autenticación inválido' });
*      }
*    }
*/


    if (tokenRecibido) {
      const tokenLimpio = String(tokenRecibido).replace(/^Bearer\s+/i, '').trim();
      console.log('[doPost 4/6] Token recibido detectado (longitud ' + tokenLimpio.length + '). Validando contra API_TOKEN...');
      if (API_TOKEN && tokenLimpio !== API_TOKEN) {
        console.warn('[doPost SALIDA] Token inválido. Recibido=["' + tokenLimpio + '"]');
        return jsonResponse({ error: 'Token de autenticación inválido' });
      }
      console.log('[doPost 4b/6] Token válido.');
    } else {
      console.log('[doPost 4/6] No se recibió token en e.parameter ni en data.token (se continúa según configuración actual).');
    }


// 4. Valida campos mínimos requeridos
    const idraM = String(data.idraM || '').trim();
    const patente = String(data.patente || '').trim();
    //console.log('3. Validando mínimos -> idraM=[' + idraM + '], patente=[' + patente + ']');
    console.log('[doPost 5/6] Validando mínimos -> idraM=["' + idraM + '"], patente=["' + patente + '"]');
    
    if (!idraM && !patente) {
      console.warn('[doPost SALIDA] Faltan ambos campos mínimos: idraM y patente están vacíos.');
      //console.log('SALIDA TEMPRANA: Faltan idraM y patente');
      return jsonResponse({ error: 'Datos insuficientes: se requiere al menos idraM o patente' });
    }



    // 5. Guarda el registro en la hoja de cálculo
    console.log('[doPost 6/6] Llamando a guardarPesaje(data)...');
    const resultado = guardarPesaje(data);
    //console.log('4. Guardado OK -> ' + JSON.stringify(resultado));
    const duracionMs = Date.now() - inicioMs;
    console.log('[doPost EXITO] Guardado completado en ' + duracionMs + ' ms -> ' + JSON.stringify(resultado));




    return jsonResponse({
      success: true,
      message: 'Pesaje recibido y guardado correctamente',
      id: resultado.id,
      fila: resultado.fila,
      hoja: SHEET_NAME,
      duracionMs: duracionMs
    });
/**
  } catch (error) {
    console.log('ERROR EN CATCH: ' + error.toString());
    return jsonResponse({ error: 'Error interno del servidor', details: error.toString() });
  }
*/
  } catch (error) {
    const duracionMs = Date.now() - inicioMs;
    console.error('[doPost CATCH] Error no controlado tras ' + duracionMs + ' ms: ' + error.toString());
    if (error && error.stack) {
      console.error('[doPost STACK] ' + error.stack);
    }
    return jsonResponse({
      error: 'Error interno del servidor',
      details: error.toString()
    });
  }


}



/**
 * Punto de entrada HTTP GET.
 * Soporta ?accion=estado para consultar si hay datos, ?accion=eliminar&id=X para eliminar, o devuelve todos los pesajes.
 */



function doGet(e) {
  console.log('[doGet 1/3] Petición GET recibida. Parámetros: ' + JSON.stringify((e && e.parameter) || {}));
  try {
    const accion = (e && e.parameter && e.parameter.accion) ? String(e.parameter.accion) : '';


    if (accion === 'estado') {
      const totalFilas = contarFilasDatos();
      const tieneDatos = totalFilas > 0;
      console.log('[doGet 2/3] Acción "estado" -> tieneDatos=' + tieneDatos + ', totalFilasDatos=' + totalFilas);
      return jsonResponse({
        success: true,
        tieneDatos: tieneDatos,
        totalFilasDatos: totalFilas
      });
    }
    
    if (accion === 'eliminar') {
      const id = (e && e.parameter && e.parameter.id) ? String(e.parameter.id) : '';
      console.log('[doGet 2/3] Acción "eliminar" -> id=' + id);
      const resultado = eliminarPesaje(id);
      return jsonResponse(resultado);
    }
    
    console.log('[doGet 2/3] Obteniendo todos los pesajes desde "' + SHEET_NAME + '"...');
    const pesajes = obtenerTodosLosPesajes();
    console.log('[doGet 3/3] Total registros devueltos: ' + pesajes.length);
    return jsonResponse(pesajes);


  } catch (error) {
    console.error('[doGet CATCH] Error en doGet: ' + error.toString());
    return jsonResponse({
      error: 'Error al obtener los datos en doGet',
      details: error.toString()
    });
  }
}


/**
 * Inserta una fila en la pestaña SHEET_NAME mapeando cada campo del JSON
 * según el orden fijo de columnas definido en `headers`.
 */



function guardarPesaje(data) {
  console.log('[guardarPesaje 1/5] Abriendo planilla activa con SpreadsheetApp.getActiveSpreadsheet()...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    throw new Error('No se pudo obtener la planilla activa. Revisa que el script esté vinculado a un Google Sheet.');
  }
  console.log('[guardarPesaje 1b/5] Planilla abierta: "' + ss.getName() + '" (ID: ' + ss.getId() + ')'); 
  
  let sheet = ss.getSheetByName(SHEET_NAME);


  // Encabezados de la hoja Pesajes_ERP (orden fijo de columnas)
  const headers = [
    'ID',
    'Recibido',
    'idraM',
    'Patente',
    'Tipo',
    'Tara',
    'UbicacionOUT',
    'PesajeEnServidor',
    'Cliente1',
    'RUT Cliente1',
    'Fono Cliente1',
    'Proceso',
    'Producto1 Code',
    'Producto1',
    'Producto1 Valor',
    'Producto1 Cantidad',
    'Producto1 Valor Total',
    'Producto2',
    'Producto2 Valor',
    'Producto2 Cantidad',
    'Producto2 Valor Total',
    'Productos Valor Total',
    'Guia Despacho',
    'Conductor Salida Apellido',
    'Conductor Salida Nombre',
    'Conductor Salida RUT',
    'Conductor Salida Fono',
    'Humedad',
    'Gluten',
    'Categoria',
    'Falling Number',
    'Especifico',
    'Recibe',
    'Almacenaje',
    'N Muestra',
    'Condicion',
    'Fecha Out1',
    'Hora Out1',
    'Obs Entrada',
    'Obs Salida',
    'Peso In1',
    'Peso Out1',
    'Peso Neto1',
    'User Out',
    'Pesaje Tipo',
    'Pesaje Valor',
    'Pesaje Proceso'
  ];


  // Crea la pestaña o los encabezados si aún no existen
  if (!sheet) {
    console.log('[guardarPesaje 2/5] La pestaña "' + SHEET_NAME + '" no existía. Creándola...');
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    console.log('[guardarPesaje 2b/5] Pestaña creada con ' + headers.length + ' encabezados.');
  } else if (sheet.getLastRow() === 0) {
    console.log('[guardarPesaje 2/5] La pestaña "' + SHEET_NAME + '" estaba vacía (fila 0). Escribiendo encabezados...');
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    console.log('[guardarPesaje 2/5] Pestaña "' + SHEET_NAME + '" encontrada. Última fila actual: ' + sheet.getLastRow() + ', columnas: ' + sheet.getLastColumn());
  }


  const lastRow = sheet.getLastRow();
  const nuevoId = lastRow;// Fila 1 es encabezado; si hay 1 fila, el primer dato recibe ID = 1
  const recibido = new Date();
  console.log('[guardarPesaje 3/5] Generando nuevoId=' + nuevoId + ' | timestamp recibido=' + recibido.toISOString());


  // Mapeo seguro: si una clave no viene en el JSON (por estar comentada en Gambas), queda ''
  // Mapeo seguro: si una clave no viene en el JSON (por estar comentada en Gambas), queda ''
  const fila = [
    nuevoId,
    recibido,
    data.idraM ?? '',
    data.patente ?? '',
    data.tipo ?? '',
    data.tara ?? '',
    data.ubicacionOUT ?? '',
    data.PesajeEnServidor ?? '',
    data.cliente1 ?? '',
    data.rutCliente1 ?? '',
    data.fonoCliente1 ?? '',
    data.Proceso ?? '',
    data.producto1code ?? '',
    data.producto1 ?? '',
    data.producto1valor ?? '',
    data.producto1cantidad ?? '',
    data.producto1ValorTotal ?? '',
    data.producto2 ?? '',
    data.producto2valor ?? '',
    data.producto2cantidad ?? '',
    data.producto2ValorTotal ?? '',
    data.productosValorTotal ?? '',
    data.gDespacho1 ?? '',
    data.cOutAp ?? '',
    data.cOutNom ?? '',
    data.cOutRut ?? '',
    data.cOutFono ?? '',
    data.humedad ?? '',
    data.gluten ?? '',
    data.categoria ?? '',
    data.fallingNumber ?? '',
    data.especifico ?? '',
    data.recibe ?? '',
    data.almacenaje ?? '',
    data.nMuestra ?? '',
    data.condicion ?? '',
    data.fechaOut1 ?? '',
    data.horaOut1 ?? '',
    data.oBsEntrada ?? '',
    data.oBsSalida ?? '',
    data.pIn1 ?? '',
    data.pOut1 ?? '',
    data.pN1 ?? '',
    data.UserOut ?? '',
    data.PesajeTipo ?? '',
    data.PesajeValor ?? '',
    data.PesajeProceso ?? ''
  ];



  console.log('[guardarPesaje 4/5] Longitud de fila preparada: ' + fila.length + ' (esperados: ' + headers.length + '). Insertando con appendRow...');
  if (fila.length !== headers.length) {
    console.warn('[guardarPesaje AVISO] ¡Desfase entre fila (' + fila.length + ') y headers (' + headers.length + ')!');
  }


  sheet.appendRow(fila);
  const filaInsertada = sheet.getLastRow();
  sheet.getRange(filaInsertada, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  SpreadsheetApp.flush(); // Fuerza escritura inmediata antes de responder
  console.log('[guardarPesaje 5/5] Fila insertada en posición ' + filaInsertada + ' con ID=' + nuevoId);
  
  return {
    id: nuevoId,
    fila: filaInsertada
  };
}


/**
 * Indica si existe al menos una fila con datos en Pesajes_ERP.
 */
function tieneDatosPesajesERP() {
  const total = contarFilasDatos();
  console.log('[tieneDatosPesajesERP] Total filas con datos: ' + total);
  return total > 0;
}


/**
 * Cuenta cuántas filas por debajo del encabezado tienen al menos un valor no vacío.
 */
function contarFilasDatos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    console.log('[contarFilasDatos] Hoja "' + SHEET_NAME + '" no existe -> 0');
    return 0;
  }


  const ultimaFila = sheet.getLastRow();
  const ultimaCol = sheet.getLastColumn();
  if (ultimaFila <= 1 || ultimaCol === 0) {
    console.log('[contarFilasDatos] Sin filas de datos (ultimaFila=' + ultimaFila + ', ultimaCol=' + ultimaCol + ') -> 0');
    return 0;
  }


  const valores = sheet.getRange(2, 1, ultimaFila - 1, ultimaCol).getValues();
  const conDatos = valores.filter(row => row.some(cell => cell !== '' && cell !== null)).length;
  console.log('[contarFilasDatos] Filas evaluadas: ' + valores.length + ' | Filas no vacías: ' + conDatos);
  return conDatos;
}


/**
 * Devuelve todos los registros de Pesajes_ERP como arreglo de objetos con claves normalizadas.
 */
function obtenerTodosLosPesajes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);


  if (!sheet || sheet.getLastRow() <= 1) {
    console.log('[obtenerTodosLosPesajes] Hoja vacía o inexistente; se devuelve []');
    return [];
  }


  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  console.log('[obtenerTodosLosPesajes] Leyendo ' + rows.length + ' filas y ' + headers.length + ' columnas.');


  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      const key = String(header).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      obj[key] = row[i];
    });
    return obj;
  });
}


/**
 * Elimina el registro cuyo ID (columna A) coincida con `id`.
 */
function eliminarPesaje(id) {
  console.log('[eliminarPesaje] Buscando registro con ID="' + id + '"...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);


  if (!sheet) {
    console.warn('[eliminarPesaje] Hoja "' + SHEET_NAME + '" no encontrada.');
    return { success: false, error: 'Hoja no encontrada' };
  }


  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      console.log('[eliminarPesaje] Registro ID="' + id + '" eliminado en fila ' + (i + 1));
      return { success: true, message: 'Pesaje eliminado' };
    }
  }


  console.warn('[eliminarPesaje] No se encontró ningún registro con ID="' + id + '".');
  return { success: false, error: 'Pesaje no encontrado' };
}


/**
 * Construye una respuesta JSON estándar para Web App.
 */
function jsonResponse(payload) {
  const texto = JSON.stringify(payload);
  console.log('[jsonResponse] Enviando respuesta (' + texto.length + ' chars): ' + texto.slice(0, 300));
  return ContentService
    .createTextOutput(texto)
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Devuelve la URL de despliegue configurada del servicio.
 */
function getScriptURL() {
  const url = ScriptApp.getService().getUrl();
  console.log('[getScriptURL] URL del servicio: ' + url);
  return url;
}
