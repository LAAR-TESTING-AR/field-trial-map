(function () {
  "use strict";

  const DB_NAME = "FieldTrialMapDB";
  const DB_VERSION = 1;
  const STORE_NAME = "pendingPhotos";
  const MAX_PHOTOS_PER_VISIT = 3;

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
          almacen.createIndex("photoType", "photoType", { unique: false });
          almacen.createIndex("syncStatus", "syncStatus", { unique: false });
          almacen.createIndex("captureDate", "captureDate", { unique: false });
        }
      };

      solicitud.onsuccess = evento => resolve(evento.target.result);

      solicitud.onerror = () => {
        reject(new Error("No fue posible abrir el almacenamiento local."));
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
      const transaccion = db.transaction(STORE_NAME, "readwrite");
      const almacen = transaccion.objectStore(STORE_NAME);

      const registroCompleto = {
        ...registro,
        syncStatus: registro.syncStatus || "pending",
        savedAt: registro.savedAt || new Date().toISOString(),
        syncAttempts: registro.syncAttempts || 0
      };

      almacen.put(registroCompleto);

      transaccion.oncomplete = () => resolve(registroCompleto);
      transaccion.onerror = () => {
        reject(
          new Error("No fue posible guardar la fotografía en el dispositivo.")
        );
      };
    });
  }

  async function guardarFotosPendientes(registros) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readwrite");
      const almacen = transaccion.objectStore(STORE_NAME);
      const fechaGuardado = new Date().toISOString();

      registros.forEach(registro => {
        almacen.put({
          ...registro,
          syncStatus: registro.syncStatus || "pending",
          savedAt: registro.savedAt || fechaGuardado,
          syncAttempts: registro.syncAttempts || 0
        });
      });

      transaccion.oncomplete = () => resolve(registros);
      transaccion.onerror = () => {
        reject(
          new Error("No fue posible guardar la visita en el dispositivo.")
        );
      };
    });
  }

  async function obtenerFotosPendientes() {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readonly");
      const almacen = transaccion.objectStore(STORE_NAME);
      const solicitud = almacen.getAll();

      solicitud.onsuccess = () => {
        const registros = solicitud.result
          .filter(registro => registro.syncStatus === "pending")
          .sort((a, b) => new Date(a.captureDate) - new Date(b.captureDate));

        resolve(registros);
      };

      solicitud.onerror = () => {
        reject(
          new Error("No fue posible consultar las fotografías pendientes.")
        );
      };
    });
  }

  async function contarFotosPendientes() {
    const pendientes = await obtenerFotosPendientes();
    const visitas = new Set(
      pendientes.map(registro => registro.visitId || registro.recordId)
    );
    return visitas.size;
  }

  async function obtenerFotoPorId(recordId) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readonly");
      const almacen = transaccion.objectStore(STORE_NAME);
      const solicitud = almacen.get(recordId);

      solicitud.onsuccess = () => resolve(solicitud.result || null);
      solicitud.onerror = () => {
        reject(new Error("No fue posible recuperar la fotografía."));
      };
    });
  }

  async function eliminarFotoLocal(recordId) {
    const db = await abrirBaseDeDatos();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(STORE_NAME, "readwrite");
      const almacen = transaccion.objectStore(STORE_NAME);
      almacen.delete(recordId);

      transaccion.oncomplete = () => resolve(true);
      transaccion.onerror = () => {
        reject(new Error("No fue posible eliminar la fotografía local."));
      };
    });
  }

  async function eliminarVisitaLocal(visitId) {
    const pendientes = await obtenerFotosPendientes();
    const registrosVisita = pendientes.filter(
      registro => (registro.visitId || registro.recordId) === visitId
    );

    await Promise.all(
      registrosVisita.map(registro => eliminarFotoLocal(registro.recordId))
    );

    return true;
  }

  async function marcarIntentoFallido(recordId, errorMessage) {
    const registro = await obtenerFotoPorId(recordId);
    if (!registro) return null;

    registro.syncAttempts = Number(registro.syncAttempts || 0) + 1;
    registro.lastSyncError = String(errorMessage || "Error desconocido");
    registro.lastSyncAttempt = new Date().toISOString();
    registro.syncStatus = "pending";

    return guardarFotoPendiente(registro);
  }

  window.FieldPhotoStorage = {
    abrirBaseDeDatos,
    guardarFotoPendiente,
    guardarFotosPendientes,
    obtenerFotosPendientes,
    contarFotosPendientes,
    obtenerFotoPorId,
    eliminarFotoLocal,
    eliminarVisitaLocal,
    marcarIntentoFallido
  };

  abrirBaseDeDatos()
    .then(() => {
      console.log("Almacenamiento offline Field Photos preparado.");
    })
    .catch(error => {
      console.error("Error al preparar IndexedDB:", error);
    });
})();

(function () {
  "use strict";

  const MAX_PHOTOS_PER_VISIT = 3;

  const STAGES_BY_CROP = {
    corn: ["VE", "V2", "V4", "V6", "V8", "V10", "VT", "R1", "R2", "R3", "R4", "R5", "R6"],
    maize: ["VE", "V2", "V4", "V6", "V8", "V10", "VT", "R1", "R2", "R3", "R4", "R5", "R6"],
    soybean: ["VE", "VC", "V1", "V2", "V3", "V4", "V5", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
    sunflower: ["VE", "V2", "V4", "V6", "V8", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"],
    canola: ["Cotiledón", "2 hojas", "4 hojas", "6 hojas", "Roseta", "Botón floral", "Inicio de floración", "Floración plena", "Llenado", "Madurez"],
    mustard: ["Cotiledón", "2 hojas", "4 hojas", "6 hojas", "Roseta", "Botón floral", "Inicio de floración", "Floración plena", "Llenado", "Madurez"]
  };

  function escaparHTML(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function obtenerEtapas(crop) {
    const nombre = String(crop || "").trim().toLowerCase();
    const clave = Object.keys(STAGES_BY_CROP).find(item =>
      nombre.includes(item)
    );

    const etapas = clave ? STAGES_BY_CROP[clave] : [];

    return [
      ...etapas,
      "Pre-harvest",
      "Harvest",
      "No determinado",
      "No aplica",
      "Otro"
    ];
  }

  function crearOpcionesEtapa(crop) {
    return [
      '<option value="">Seleccionar estadio (opcional)</option>',
      ...obtenerEtapas(crop).map(
        etapa => `<option value="${escaparHTML(etapa)}">${escaparHTML(etapa)}</option>`
      )
    ].join("");
  }

  window.FieldPhotoCapture = {
    abrirPanelCaptura(configuracion = {}) {
      const sitio = {
        aoiId: String(configuracion.aoiId || "").trim(),
        location: String(configuracion.location || "").trim(),
        crop: String(configuracion.crop || "").trim(),
        photoType: String(configuracion.photoType || "Trial").trim()
      };

      document.getElementById("fieldPhotoModal")?.remove();

      const esTrial = sitio.photoType.toLowerCase() === "trial";
      const fondo = document.createElement("div");
      fondo.id = "fieldPhotoModal";
      fondo.className = "field-photo-modal-fondo";

      fondo.innerHTML = `
        <section class="field-photo-modal" role="dialog" aria-modal="true" aria-labelledby="fieldPhotoTitulo">
          <button class="field-photo-modal-cerrar" type="button" aria-label="Cerrar">×</button>

          <h2 id="fieldPhotoTitulo">
            ${esTrial ? "Registrar visita al Trial" : "Registrar foto del Access"}
          </h2>

          <p class="field-photo-contexto">
            <strong>${escaparHTML(sitio.location || "Localidad")}</strong>
            ${sitio.aoiId ? ` · AOI ID: ${escaparHTML(sitio.aoiId)}` : ""}
            ${sitio.crop ? ` · ${escaparHTML(sitio.crop)}` : ""}
          </p>

          ${
            esTrial
              ? `
                <div class="field-photo-campo">
                  <label for="fieldPhotoCropStage">Estadio del cultivo</label>
                  <select id="fieldPhotoCropStage">
                    ${crearOpcionesEtapa(sitio.crop)}
                  </select>
                </div>
              `
              : ""
          }

          <div class="field-photo-campo">
            <label for="fieldPhotoComments">Comentario u observación</label>
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
            <label>Fotografías (máximo 3)</label>

            <div class="field-photo-acciones">
              <button id="fieldPhotoCameraButton" class="field-photo-boton-camara" type="button">
                <span aria-hidden="true">📷</span> Tomar foto
              </button>

              <button id="fieldPhotoGalleryButton" class="field-photo-boton-camara" type="button">
                <span aria-hidden="true">🖼️</span> Elegir foto
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
              multiple
            >

            <div id="fieldPhotoPreviewGrid" class="field-photo-preview-grid"></div>

            <div id="fieldPhotoFileInfo" class="field-photo-info-archivo">
              Todavía no se seleccionó ninguna fotografía.
            </div>
          </div>

          <div id="fieldPhotoMessage" class="field-photo-aviso" role="status" aria-live="polite"></div>

          <div class="field-photo-acciones">
            <button class="field-photo-cancelar" type="button">Cancelar</button>
            <button id="fieldPhotoSaveButton" class="field-photo-guardar" type="button" disabled>
              Guardar visita en el dispositivo
            </button>
          </div>
        </section>
      `;

      document.body.appendChild(fondo);

      const botonCamara = fondo.querySelector("#fieldPhotoCameraButton");
      const botonGaleria = fondo.querySelector("#fieldPhotoGalleryButton");
      const entradaCamara = fondo.querySelector("#fieldPhotoCameraInput");
      const entradaGaleria = fondo.querySelector("#fieldPhotoGalleryInput");
      const previewGrid = fondo.querySelector("#fieldPhotoPreviewGrid");
      const informacionArchivo = fondo.querySelector("#fieldPhotoFileInfo");
      const botonGuardar = fondo.querySelector("#fieldPhotoSaveButton");
      const mensaje = fondo.querySelector("#fieldPhotoMessage");

      let archivosSeleccionados = [];
      const urlsVistaPrevia = new Map();

      function liberarVistaPrevia(archivo) {
        const url = urlsVistaPrevia.get(archivo);
        if (url) URL.revokeObjectURL(url);
        urlsVistaPrevia.delete(archivo);
      }

      function liberarTodasLasVistas() {
        urlsVistaPrevia.forEach(url => URL.revokeObjectURL(url));
        urlsVistaPrevia.clear();
      }

      function cerrarPanel() {
        liberarTodasLasVistas();
        fondo.remove();
      }

      fondo
        .querySelector(".field-photo-modal-cerrar")
        .addEventListener("click", cerrarPanel);

      fondo
        .querySelector(".field-photo-cancelar")
        .addEventListener("click", cerrarPanel);

      fondo.addEventListener("click", evento => {
        if (evento.target === fondo) cerrarPanel();
      });

      function mostrarMensaje(texto, tipo) {
        mensaje.textContent = texto;
        mensaje.className =
          "field-photo-aviso visible " +
          (tipo === "error"
            ? "field-photo-aviso-error"
            : "field-photo-aviso-exito");
      }

      function claveArchivo(archivo) {
        return [archivo.name, archivo.size, archivo.lastModified].join("-");
      }

      function renderizarPreviews() {
        previewGrid.replaceChildren();

        archivosSeleccionados.forEach((archivo, indice) => {
          let url = urlsVistaPrevia.get(archivo);

          if (!url) {
            url = URL.createObjectURL(archivo);
            urlsVistaPrevia.set(archivo, url);
          }

          const tarjeta = document.createElement("div");
          tarjeta.className = "field-photo-preview-item";

          tarjeta.innerHTML = `
            <img src="${url}" alt="Vista previa de la fotografía ${indice + 1}">
            <span class="field-photo-preview-order">${indice + 1}</span>
            <button type="button" aria-label="Quitar fotografía ${indice + 1}">×</button>
          `;

          tarjeta.querySelector("button").addEventListener("click", () => {
            liberarVistaPrevia(archivo);
            archivosSeleccionados = archivosSeleccionados.filter(
              item => item !== archivo
            );
            renderizarPreviews();
          });

          previewGrid.appendChild(tarjeta);
        });

        const totalMB = archivosSeleccionados.reduce(
          (total, archivo) => total + archivo.size,
          0
        ) / 1024 / 1024;

        informacionArchivo.textContent = archivosSeleccionados.length
          ? `${archivosSeleccionados.length} de ${MAX_PHOTOS_PER_VISIT} fotografías · ${totalMB.toFixed(2)} MB`
          : "Todavía no se seleccionó ninguna fotografía.";

        botonGuardar.disabled = archivosSeleccionados.length === 0;
        botonCamara.disabled =
          archivosSeleccionados.length >= MAX_PHOTOS_PER_VISIT;
        botonGaleria.disabled =
          archivosSeleccionados.length >= MAX_PHOTOS_PER_VISIT;
      }

      function agregarArchivos(archivos) {
        const imagenesValidas = [...archivos].filter(
          archivo => archivo.type.startsWith("image/")
        );

        const clavesExistentes = new Set(
          archivosSeleccionados.map(claveArchivo)
        );

        for (const archivo of imagenesValidas) {
          if (archivosSeleccionados.length >= MAX_PHOTOS_PER_VISIT) break;
          if (clavesExistentes.has(claveArchivo(archivo))) continue;

          archivosSeleccionados.push(archivo);
          clavesExistentes.add(claveArchivo(archivo));
        }

        if ([...archivos].length > imagenesValidas.length) {
          mostrarMensaje("Se ignoraron archivos que no son imágenes.", "error");
        } else if (
          imagenesValidas.length + archivosSeleccionados.length >
          MAX_PHOTOS_PER_VISIT
        ) {
          mostrarMensaje("Se pueden guardar como máximo 3 fotografías por visita.", "error");
        }

        renderizarPreviews();
      }

      botonCamara.addEventListener("click", () => {
        entradaCamara.value = "";
        entradaCamara.click();
      });

      botonGaleria.addEventListener("click", () => {
        entradaGaleria.value = "";
        entradaGaleria.click();
      });

      entradaCamara.addEventListener("change", evento => {
        agregarArchivos(evento.target.files || []);
      });

      entradaGaleria.addEventListener("change", evento => {
        agregarArchivos(evento.target.files || []);
      });

      botonGuardar.addEventListener("click", async () => {
        const comentarios = String(
          fondo.querySelector("#fieldPhotoComments")?.value || ""
        ).trim();

        const cropStage = esTrial
          ? String(
              fondo.querySelector("#fieldPhotoCropStage")?.value || ""
            ).trim()
          : "";

        if (!archivosSeleccionados.length) {
          mostrarMensaje("Primero seleccioná o tomá al menos una fotografía.", "error");
          return;
        }

        if (
          !window.FieldPhotoStorage ||
          typeof window.FieldPhotoStorage.guardarFotosPendientes !== "function"
        ) {
          mostrarMensaje("El almacenamiento offline no está disponible.", "error");
          return;
        }

        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando visita...";

        try {
          const fechaCaptura = new Date();
          const fechaId = fechaCaptura
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}Z$/, "Z");

          const aoiLimpio = (sitio.aoiId || "SIN-AOI").replace(
            /[\/\\\s]+/g,
            "-"
          );

          const visitId = `${aoiLimpio}-${sitio.photoType}-${fechaId}`;

          const registros = archivosSeleccionados.map((archivo, indice) => {
            const photoOrder = indice + 1;
            const recordId = `${visitId}-${photoOrder}`;
            const extensionOriginal = archivo.name
              .split(".")
              .pop()
              ?.toLowerCase();

            const extension = ["jpg", "jpeg", "png", "webp"].includes(
              extensionOriginal
            )
              ? extensionOriginal
              : "jpg";

            return {
              recordId,
              visitId,
              photoOrder,
              aoiId: sitio.aoiId,
              location: sitio.location,
              photoType: sitio.photoType,
              crop: sitio.crop,
              cropStage,
              comments: comentarios,
              captureDate: fechaCaptura.toISOString(),
              fileName: `${recordId}.${extension}`,
              mimeType: archivo.type || "image/jpeg",
              originalFileName: archivo.name,
              originalFileSize: archivo.size,
              photoBlob: archivo,
              syncStatus: "pending",
              syncAttempts: 0
            };
          });

          await window.FieldPhotoStorage.guardarFotosPendientes(registros);

          const cantidadPendientes =
            await window.FieldPhotoStorage.contarFotosPendientes();

          window.dispatchEvent(
            new CustomEvent("fieldphotos:pending-updated", {
              detail: { count: cantidadPendientes }
            })
          );

          mostrarMensaje(
            `Visita guardada con ${registros.length} fotografía${
              registros.length === 1 ? "" : "s"
            }. Visitas pendientes de sincronización: ${cantidadPendientes}.`,
            "success"
          );

          botonGuardar.textContent = "Guardado";

          console.log("Visita guardada localmente:", {
            visitId,
            photos: registros.length,
            pendingVisits: cantidadPendientes
          });

          window.setTimeout(() => cerrarPanel(), 1800);
        } catch (error) {
          console.error("Error al guardar la visita:", error);

          mostrarMensaje(
            error?.message || "No fue posible guardar la visita.",
            "error"
          );

          botonGuardar.disabled = false;
          botonGuardar.textContent = "Guardar visita en el dispositivo";
        }
      });

      console.log("Panel Field Photos abierto:", sitio);
    }
  };
})();
