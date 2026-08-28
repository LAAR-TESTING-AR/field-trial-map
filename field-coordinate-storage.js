(function () {
  "use strict";

  const DB_NAME = "FieldTrialMapCoordinatesDB";
  const DB_VERSION = 1;
  const STORE_NAME = "pendingCoordinates";

  let databasePromise = null;

  function abrirBaseDeDatos() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const solicitud = indexedDB.open(DB_NAME, DB_VERSION);

      solicitud.onupgradeneeded = evento => {
        const db = evento.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const almacen = db.createObjectStore(STORE_NAME, {
            keyPath: "recordId"
          });

          almacen.createIndex("aoiId", "aoiId", { unique: false });
          almacen.createIndex("pointType", "pointType", { unique: false });
          almacen.createIndex("syncStatus", "syncStatus", { unique: false });
          almacen.createIndex("captureDate", "captureDate", { unique: false });
          almacen.createIndex("sitePoint", ["aoiId", "pointType"], {
            unique: false
          });
        }
      };

      solicitud.onsuccess = evento => {
        const db = evento.target.result;

        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };

        resolve(db);
      };

      solicitud.onerror = () => {
        databasePromise = null;
        reject(
          new Error(
            "No fue posible abrir el almacenamiento local de coordenadas."
          )
        );
      };

      solicitud.onblocked = () => {
        databasePromise = null;
        reject(
          new Error(
            "El almacenamiento de coordenadas está bloqueado por otra pestaña de la aplicación."
          )
        );
      };
    });

    return databasePromise;
  }

  function validarRegistro(registro) {
    const recordId = String(registro?.recordId || "").trim();
    const aoiId = String(registro?.aoiId || "").trim();
    const pointType = String(registro?.pointType || "").trim();
    const latitude = Number(registro?.latitude);
    const longitude = Number(registro?.longitude);
    const accuracy = Number(registro?.accuracy);

    if (!recordId) {
      throw new Error("La coordenada no tiene recordId.");
    }

    if (!aoiId) {
      throw new Error("La coordenada no tiene AOI ID.");
    }

    if (!['Trial', 'Access'].includes(pointType)) {
      throw new Error("El tipo de punto debe ser Trial o Access.");
    }

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error("La latitud capturada no es válida.");
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("La longitud capturada no es válida.");
    }

    if (!Number.isFinite(accuracy) || accuracy < 0) {
      throw new Error("La precisión GPS capturada no es válida.");
    }

    return {
      ...registro,
      recordId,
      aoiId,
      location: String(registro.location || "").trim(),
      pointType,
      latitude,
      longitude,
      accuracy,
      previousLatitude:
        registro.previousLatitude === null ||
        registro.previousLatitude === undefined ||
        registro.previousLatitude === ""
          ? null
          : Number(registro.previousLatitude),
      previousLongitude:
        registro.previousLongitude === null ||
        registro.previousLongitude === undefined ||
        registro.previousLongitude === ""
          ? null
          : Number(registro.previousLongitude),
      captureDate: String(
        registro.captureDate || new Date().toISOString()
      ),
      syncStatus: String(registro.syncStatus || "pending"),
      savedAt: String(registro.savedAt || new Date().toISOString()),
      syncAttempts: Number(registro.syncAttempts || 0),
      lastSyncError: String(registro.lastSyncError || ""),
      lastSyncAttempt: String(registro.lastSyncAttempt || "")
    };
  }

  async function guardarCoordenadaPendiente(registro) {
    const registroCompleto = validarRegistro(registro);
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readwrite");
      const almacen = transaccion.objectStore(STORE_NAME);

      almacen.put(registroCompleto);

      transaccion.oncomplete = () => resolve(registroCompleto);
      transaccion.onerror = () => {
        reject(
          new Error(
            "No fue posible guardar la coordenada en el dispositivo."
          )
        );
      };
    });
  }

  async function obtenerCoordenadasPendientes() {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readonly");
      const almacen = transaccion.objectStore(STORE_NAME);
      const solicitud = almacen.getAll();

      solicitud.onsuccess = () => {
        const registros = solicitud.result
          .filter(registro => registro.syncStatus === "pending")
          .sort(
            (a, b) =>
              new Date(a.captureDate).getTime() -
              new Date(b.captureDate).getTime()
          );

        resolve(registros);
      };

      solicitud.onerror = () => {
        reject(
          new Error(
            "No fue posible consultar las coordenadas pendientes."
          )
        );
      };
    });
  }

  async function contarCoordenadasPendientes() {
    const pendientes = await obtenerCoordenadasPendientes();
    return pendientes.length;
  }

  async function obtenerCoordenadaPorId(recordId) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readonly");
      const almacen = transaccion.objectStore(STORE_NAME);
      const solicitud = almacen.get(String(recordId || ""));

      solicitud.onsuccess = () => resolve(solicitud.result || null);
      solicitud.onerror = () => {
        reject(
          new Error("No fue posible recuperar la coordenada pendiente.")
        );
      };
    });
  }

  async function obtenerPendientesPorSitio(aoiId, pointType) {
    const pendientes = await obtenerCoordenadasPendientes();
    const aoiNormalizado = String(aoiId || "").trim().toLowerCase();
    const tipoNormalizado = String(pointType || "").trim().toLowerCase();

    return pendientes.filter(registro =>
      String(registro.aoiId || "").trim().toLowerCase() === aoiNormalizado &&
      String(registro.pointType || "").trim().toLowerCase() === tipoNormalizado
    );
  }

  async function eliminarCoordenadaLocal(recordId) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readwrite");
      const almacen = transaccion.objectStore(STORE_NAME);

      almacen.delete(String(recordId || ""));

      transaccion.oncomplete = () => resolve(true);
      transaccion.onerror = () => {
        reject(
          new Error(
            "No fue posible eliminar la coordenada local."
          )
        );
      };
    });
  }

  async function marcarIntentoFallido(recordId, errorMessage) {
    const registro = await obtenerCoordenadaPorId(recordId);

    if (!registro) return null;

    registro.syncAttempts = Number(registro.syncAttempts || 0) + 1;
    registro.lastSyncError = String(
      errorMessage || "Error desconocido"
    );
    registro.lastSyncAttempt = new Date().toISOString();
    registro.syncStatus = "pending";

    return guardarCoordenadaPendiente(registro);
  }

  async function reemplazarPendienteDelMismoPunto(registro) {
    const anteriores = await obtenerPendientesPorSitio(
      registro.aoiId,
      registro.pointType
    );

    await Promise.all(
      anteriores
        .filter(item => item.recordId !== registro.recordId)
        .map(item => eliminarCoordenadaLocal(item.recordId))
    );

    return guardarCoordenadaPendiente(registro);
  }

  window.FieldCoordinateStorage = {
    abrirBaseDeDatos,
    guardarCoordenadaPendiente,
    reemplazarPendienteDelMismoPunto,
    obtenerCoordenadasPendientes,
    contarCoordenadasPendientes,
    obtenerCoordenadaPorId,
    obtenerPendientesPorSitio,
    eliminarCoordenadaLocal,
    marcarIntentoFallido
  };

  abrirBaseDeDatos()
    .then(() => {
      console.log(
        "Almacenamiento offline de coordenadas preparado."
      );
    })
    .catch(error => {
      console.error(
        "Error al preparar IndexedDB de coordenadas:",
        error
      );
    });
})();
