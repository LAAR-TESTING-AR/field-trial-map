(function () {
  "use strict";

  const urlsTemporales = new Set();

  function escaparHTML(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatearFecha(valor) {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(fecha);
  }

  function liberarUrlsTemporales() {
    urlsTemporales.forEach(url => URL.revokeObjectURL(url));
    urlsTemporales.clear();
  }

  function crearTarjetaPendiente(registro, refrescarPanel) {
    const item = document.createElement("article");
    item.className = "field-pending-item";
    item.dataset.recordId = registro.recordId;

    let urlFoto = "";

    if (registro.photoBlob instanceof Blob) {
      urlFoto = URL.createObjectURL(registro.photoBlob);
      urlsTemporales.add(urlFoto);
    }

    const esAccess =
      String(registro.photoType || "").toLowerCase() === "access";

    const claseTipo = esAccess
      ? "field-pending-tipo field-pending-tipo-access"
      : "field-pending-tipo";

    item.innerHTML = `
      ${
        urlFoto
          ? `<img
              class="field-pending-miniatura"
              src="${urlFoto}"
              alt="Fotografía pendiente de ${escaparHTML(registro.location)}"
            >`
          : `<div class="field-pending-miniatura"></div>`
      }

      <div class="field-pending-contenido">
        <div class="field-pending-cabecera">
          <span class="${claseTipo}">
            ${escaparHTML(registro.photoType || "Foto")}
          </span>

          <span class="field-pending-fecha">
            ${escaparHTML(formatearFecha(registro.captureDate))}
          </span>
        </div>

        <h3 class="field-pending-localidad">
          ${escaparHTML(registro.location || "Localidad sin informar")}
        </h3>

        <p class="field-pending-detalle">
          <strong>AOI ID:</strong>
          ${escaparHTML(registro.aoiId || "Sin AOI ID")}
        </p>

        ${
          registro.crop
            ? `<p class="field-pending-detalle">
                <strong>Cultivo:</strong>
                ${escaparHTML(registro.crop)}
              </p>`
            : ""
        }

        ${
          registro.cropStage
            ? `<p class="field-pending-detalle">
                <strong>Estadio:</strong>
                ${escaparHTML(registro.cropStage)}
              </p>`
            : ""
        }

        ${
          registro.comments
            ? `<p class="field-pending-comentario">
                ${escaparHTML(registro.comments)}
              </p>`
            : ""
        }

        <div class="field-pending-acciones-item">
          <button class="field-pending-ver" type="button">
            Ver foto
          </button>

          <button class="field-pending-eliminar" type="button">
            Eliminar
          </button>
        </div>
      </div>
    `;

item
  .querySelector(".field-pending-ver")
  .addEventListener("click", () => {
    if (!urlFoto) {
      window.alert(
        "La fotografía no está disponible."
      );

      return;
    }

    document
      .getElementById("fieldPhotoViewer")
      ?.remove();

    const visor = document.createElement("div");

    visor.id = "fieldPhotoViewer";
    visor.className =
      "field-photo-viewer-fondo";

    visor.innerHTML = `
      <div
        class="field-photo-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Vista ampliada de la fotografía"
      >
        <button
          class="field-photo-viewer-cerrar"
          type="button"
          aria-label="Cerrar fotografía"
        >
          ×
        </button>

        <img
          class="field-photo-viewer-imagen"
          src="${urlFoto}"
          alt="s para ampliar o reducir la imagen
        </p>
      </div>
    `;

    document.body.appendChild(visor);

    const cerrarVisor = () => {
      visor.remove();
    };

    visor
      .querySelector(
        ".field-photo-viewer-cerrar"
      )
      .addEventListener(
        "click",
        cerrarVisor
      );

    visor.addEventListener(
      "click",
      evento => {
        if (
          evento.target === visor ||
          evento.target.classList.contains(
            "field-photo-viewer"
          )
        ) {
          cerrarVisor();
        }
      }
    );
  });

    item
      .querySelector(".field-pending-eliminar")
      .addEventListener("click", async () => {
        const confirmar = window.confirm(
          "¿Eliminar esta fotografía pendiente del dispositivo?"
        );

        if (!confirmar) return;

        try {
          await window.FieldPhotoStorage.eliminarFotoLocal(
            registro.recordId
          );

          window.dispatchEvent(
            new CustomEvent("fieldphotos:pending-updated")
          );

          await refrescarPanel();
        } catch (error) {
          console.error(
            "No fue posible eliminar la fotografía pendiente:",
            error
          );

          window.alert(
            "No fue posible eliminar la fotografía pendiente."
          );
        }
      });

    return item;
  }

  async function abrirPanelPendientes() {
    if (
      !window.FieldPhotoStorage ||
      typeof window.FieldPhotoStorage.obtenerFotosPendientes !== "function"
    ) {
      console.error(
        "El almacenamiento offline de Field Photos no está disponible."
      );

      return;
    }

    document.getElementById("fieldPendingModal")?.remove();
    liberarUrlsTemporales();

    const fondo = document.createElement("div");
    fondo.id = "fieldPendingModal";
    fondo.className = "field-pending-modal-fondo";

    fondo.innerHTML = `
      <section
        class="field-pending-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fieldPendingTitulo"
      >
        <button
          class="field-pending-modal-cerrar"
          type="button"
          aria-label="Cerrar"
        >
          ×
        </button>

        <h2 id="fieldPendingTitulo">
          Pendientes de sincronización
        </h2>

        <p id="fieldPendingResumen" class="field-pending-resumen">
          Consultando registros guardados en este dispositivo...
        </p>

        <div id="fieldPendingLista" class="field-pending-lista"></div>

        <div class="field-pending-pie">
          <button class="field-pending-cerrar" type="button">
            Cerrar
          </button>

          <button
            id="fieldPendingSyncButton"
            class="field-pending-sincronizar"
            type="button"
            disabled
          >
            Sincronizar todo
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(fondo);

    const cerrarPanel = () => {
      liberarUrlsTemporales();
      fondo.remove();
    };

    fondo
      .querySelector(".field-pending-modal-cerrar")
      .addEventListener("click", cerrarPanel);

    fondo
      .querySelector(".field-pending-cerrar")
      .addEventListener("click", cerrarPanel);

    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) cerrarPanel();
    });

    async function refrescarPanel() {
      liberarUrlsTemporales();

      const lista = fondo.querySelector("#fieldPendingLista");
      const resumen = fondo.querySelector("#fieldPendingResumen");
      const botonSincronizar = fondo.querySelector(
        "#fieldPendingSyncButton"
      );

      const registros =
        await window.FieldPhotoStorage.obtenerFotosPendientes();

      lista.replaceChildren();

      resumen.textContent =
        registros.length === 1
          ? "1 fotografía pendiente en este dispositivo."
          : `${registros.length} fotografías pendientes en este dispositivo.`;

      botonSincronizar.disabled = true;
      botonSincronizar.title =
        "La sincronización se habilitará en el próximo paso.";

      if (!registros.length) {
        const vacio = document.createElement("div");
        vacio.className = "field-pending-vacio";
        vacio.textContent =
          "No hay fotografías pendientes de sincronización.";
        lista.appendChild(vacio);
      } else {
        registros.forEach(registro => {
          lista.appendChild(
            crearTarjetaPendiente(registro, refrescarPanel)
          );
        });
      }

      console.log(
        "Registros pendientes disponibles:",
        registros
      );
    }

    try {
      await refrescarPanel();
    } catch (error) {
      console.error(
        "No fue posible mostrar los registros pendientes:",
        error
      );

      fondo.querySelector("#fieldPendingResumen").textContent =
        "No fue posible consultar los registros pendientes.";
    }
  }

  function conectarBotonPendientes() {
    const boton = document.getElementById("pwaFotosPendientes");

    if (!boton) return false;

    if (boton.dataset.pendingConnected === "true") {
      return true;
    }

    boton.dataset.pendingConnected = "true";
    boton.addEventListener("click", abrirPanelPendientes);

    console.log("Botón de fotografías pendientes conectado.");

    return true;
  }

  function iniciar() {
    if (conectarBotonPendientes()) return;

    let intentos = 0;

    const temporizador = window.setInterval(() => {
      intentos += 1;

      if (conectarBotonPendientes() || intentos >= 100) {
        window.clearInterval(temporizador);
      }
    }, 100);
  }

  window.FieldPhotoPending = {
    abrirPanelPendientes
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
