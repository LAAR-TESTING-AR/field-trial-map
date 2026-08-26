(function () {
  "use strict";

  const DB_NAME = "FieldTrialMapDB";
  const DB_VERSION = 1;
  const STORE_NAME = "pendingPhotos";

  let databasePromise = null;

  function abrirBaseDeDatos() {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
      const solicitud = indexedDB.open(DB_NAME, DB_VERSION);

      solicitud.onupgradeneeded = evento => {
        const db = evento.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const almacen = db.createObjectStore(STORE_NAME, {
            keyPath: "recordId"
          });

          almacen.createIndex("aoiId", "aoiId", {
            unique: false
          });

          almacen.createIndex("photoType", "photoType", {
            unique: false
          });

          almacen.createIndex("syncStatus", "syncStatus", {
            unique: false
          });

          almacen.createIndex("captureDate", "captureDate", {
            unique: false
          });
        }
      };

      solicitud.onsuccess = evento => {
        resolve(evento.target.result);
      };

      solicitud.onerror = () => {
        reject(
          new Error(
            "No fue posible abrir el almacenamiento local."
          )
        );
      };

      solicitud.onblocked = () => {
        reject(
          new Error(
            "La base local está bloqueada por otra pestaña de la aplicación."
          )
        );
      };
    });

    return databasePromise;
  }

  async function guardarFotoPendiente(registro) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(
        STORE_NAME,
        "readwrite"
      );

      const almacen = transaccion.objectStore(STORE_NAME);

      const registroCompleto = {
        ...registro,
        syncStatus: registro.syncStatus || "pending",
        savedAt: registro.savedAt || new Date().toISOString(),
        syncAttempts: registro.syncAttempts || 0
      };

      almacen.put(registroCompleto);

      transaccion.oncomplete = () => {
        resolve(registroCompleto);
      };

      transaccion.onerror = () => {
        reject(
          new Error(
            "No fue posible guardar la fotografía en el dispositivo."
          )
        );
      };
    });
  }

  async function obtenerFotosPendientes() {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(
        STORE_NAME,
        "readonly"
      );

      const almacen = transaccion.objectStore(STORE_NAME);
      const solicitud = almacen.getAll();

      solicitud.onsuccess = () => {
        const registros = solicitud.result
          .filter(registro => registro.syncStatus === "pending")
          .sort((a, b) => {
            return new Date(a.captureDate) -
              new Date(b.captureDate);
          });

        resolve(registros);
      };

      solicitud.onerror = () => {
        reject(
          new Error(
            "No fue posible consultar las fotografías pendientes."
          )
        );
      };
    });
  }

  async function contarFotosPendientes() {
    const pendientes = await obtenerFotosPendientes();
    return pendientes.length;
  }

  async function obtenerFotoPorId(recordId) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(
        STORE_NAME,
        "readonly"
      );

      const almacen = transaccion.objectStore(STORE_NAME);
      const solicitud = almacen.get(recordId);

      solicitud.onsuccess = () => {
        resolve(solicitud.result || null);
      };

      solicitud.onerror = () => {
        reject(
          new Error(
            "No fue posible recuperar la fotografía."
          )
        );
      };
    });
  }

  async function eliminarFotoLocal(recordId) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(
        STORE_NAME,
        "readwrite"
      );

      const almacen = transaccion.objectStore(STORE_NAME);

      almacen.delete(recordId);

      transaccion.oncomplete = () => {
        resolve(true);
      };

      transaccion.onerror = () => {
        reject(
          new Error(
            "No fue posible eliminar la fotografía local."
          )
        );
      };
    });
  }

  async function marcarIntentoFallido(
    recordId,
    errorMessage
  ) {
    const registro = await obtenerFotoPorId(recordId);

    if (!registro) {
      return null;
    }

    registro.syncAttempts =
      Number(registro.syncAttempts || 0) + 1;

    registro.lastSyncError = String(
      errorMessage || "Error desconocido"
    );

    registro.lastSyncAttempt = new Date().toISOString();
    registro.syncStatus = "pending";

    return guardarFotoPendiente(registro);
  }

  /*
    Exponemos únicamente las funciones necesarias
    para los siguientes módulos de captura y sincronización.
  */
  window.FieldPhotoStorage = {
    abrirBaseDeDatos,
    guardarFotoPendiente,
    obtenerFotosPendientes,
    contarFotosPendientes,
    obtenerFotoPorId,
    eliminarFotoLocal,
    marcarIntentoFallido
  };

  abrirBaseDeDatos()
    .then(() => {
      console.log(
        "Almacenamiento offline Field Photos preparado."
      );
    })
    .catch(error => {
      console.error(
        "Error al preparar IndexedDB:",
        error
      );
    });
})();
window.FieldPhotoCapture = {
  abrirPanelCaptura(configuracion) {
    console.log(
      "Abrir panel captura:",
      configuracion
    );
  }
};

