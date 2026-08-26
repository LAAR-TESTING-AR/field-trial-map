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
  abrirPanelCaptura(configuracion = {}) {
    const sitio = {
      aoiId: String(configuracion.aoiId || "").trim(),
      location: String(configuracion.location || "").trim(),
      crop: String(configuracion.crop || "").trim(),
      photoType: String(
        configuracion.photoType || "Trial"
      ).trim()
    };

    document
      .getElementById("fieldPhotoModal")
      ?.remove();

    const esTrial =
      sitio.photoType.toLowerCase() === "trial";

    const fondo = document.createElement("div");

    fondo.id = "fieldPhotoModal";
    fondo.className = "field-photo-modal-fondo";

    fondo.innerHTML = `
      <section
        class="field-photo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fieldPhotoTitulo"
      >
        <button
          class="field-photo-modal-cerrar"
          type="button"
          aria-label="Cerrar"
        >
          ×
        </button>

        <h2 id="fieldPhotoTitulo">
          ${
            esTrial
              ? "Registrar visita al Trial"
              : "Registrar foto del Access"
          }
        </h2>

        <p class="field-photo-contexto">
          <strong>${sitio.location || "Localidad"}</strong>
          ${
            sitio.aoiId
              ? ` · AOI ID: ${sitio.aoiId}`
              : ""
          }
          ${
            sitio.crop
              ? ` · ${sitio.crop}`
              : ""
          }
        </p>

        ${
          esTrial
            ? `
              <div class="field-photo-campo">
                <label for="fieldPhotoCropStage">
                  Estadio del cultivo
                </label>

                <select id="fieldPhotoCropStage">
                  <option value="">
                    Seleccionar estadio
                  </option>

                  <option value="VE">VE</option>
                  <option value="V1">V1</option>
                  <option value="V2">V2</option>
                  <option value="V3">V3</option>
                  <option value="V4">V4</option>
                  <option value="V6">V6</option>
                  <option value="V8">V8</option>
                  <option value="V10">V10</option>
                  <option value="VT">VT</option>
                  <option value="R1">R1</option>
                  <option value="R2">R2</option>
                  <option value="R3">R3</option>
                  <option value="R4">R4</option>
                  <option value="R5">R5</option>
                  <option value="R6">R6</option>
                  <option value="Pre-harvest">
                    Pre-harvest
                  </option>
                  <option value="Harvest">
                    Harvest
                  </option>
                  <option value="Other">
                    Otro
                  </option>
                </select>
              </div>
            `
            : ""
        }

        <div class="field-photo-campo">
          <label for="fieldPhotoComments">
            Comentario u observación
          </label>

          <textarea
            id="fieldPhotoComments"
            maxlength="600"
            placeholder="${
              esTrial
                ? "Ejemplo: crecimiento normal, buena uniformidad y sin síntomas visibles."
                : "Ejemplo: ingreso por tranquera blanca; camino transitable."
            }"
          ></textarea>
        </div>

        <div class="field-photo-campo">
          <label>
            Fotografía
          </label>

          <div class="field-photo-acciones">
  <button
    id="fieldPhotoCameraButton"
    class="field-photo-boton-camara"
    type="button"
  >
    <span aria-hidden="true">📷</span>
    Tomar foto
  </button>

  <button
    id="fieldPhotoGalleryButton"
    class="field-photo-boton-camara"
    type="button"
  >
    <span aria-hidden="true">🖼️</span>
    Elegir foto
  </button>
</div>

<input
  id="fieldPhotoCameraInput"
  class="field-photo-capture-hidden"
  type="file"
  accept="image/*"
  capture="environment"
>

<input
  id="fieldPhotoGalleryInput"
  class="field-photo-capture-hidden"
  type="file"
  accept="image/*"
>

          <img
            id="fieldPhotoPreview"
            class="field-photo-vista-previa"
            alt="Vista previa de la fotografía"
          >

          <div
            id="fieldPhotoFileInfo"
            class="field-photo-info-archivo"
          >
            Todavía no se seleccionó ninguna fotografía.
          </div>
        </div>

        <div
          id="fieldPhotoMessage"
          class="field-photo-aviso"
          role="status"
          aria-live="polite"
        ></div>

        <div class="field-photo-acciones">
          <button
            class="field-photo-cancelar"
            type="button"
          >
            Cancelar
          </button>

          <button
            id="fieldPhotoSaveButton"
            class="field-photo-guardar"
            type="button"
            disabled
          >
            Guardar en el dispositivo
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(fondo);

    const cerrarPanel = () => fondo.remove();

    fondo
      .querySelector(".field-photo-modal-cerrar")
      .addEventListener("click", cerrarPanel);

    fondo
      .querySelector(".field-photo-cancelar")
      .addEventListener("click", cerrarPanel);

    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) {
        cerrarPanel();
      }
    });

   const botonCamara = fondo.querySelector(
  "#fieldPhotoCameraButton"
);

const botonGaleria = fondo.querySelector(
  "#fieldPhotoGalleryButton"
);

const entradaCamara = fondo.querySelector(
  "#fieldPhotoCameraInput"
);

const entradaGaleria = fondo.querySelector(
  "#fieldPhotoGalleryInput"
);

botonCamara.addEventListener("click", () => {
  entradaCamara.click();
});

botonGaleria.addEventListener("click", () => {
  entradaGaleria.click();
});

    console.log(
      "Panel Field Photos abierto:",
      sitio
    );
  }
};
