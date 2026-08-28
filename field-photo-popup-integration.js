(function () {
  "use strict";

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function escaparHTML(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escaparAtributo(valor) {
    return escaparHTML(valor);
  }

  function esDrop(sitio) {
    return texto(sitio?.description)
      .toLowerCase()
      .includes("drop");
  }

  function formatearFechaBreve(valor) {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    }).format(fecha);
  }

  function etiquetaScore(score) {
    const valor = Number(score);

    if (valor === 9) return "Excelente";
    if (valor === 8) return "Muy bueno";
    if (valor === 7) return "Bueno";
    if (valor === 6) return "Aceptable";
    if (valor === 5 || valor === 4) return "Cuestionable";
    if (valor >= 1 && valor <= 3) return "Descartable";

    return "Sin evaluar";
  }

  function botonCaptura(sitio, photoType) {
    const esTrial = photoType === "Trial";

    return `
      <div class="field-photo-popup-action">
        <button
          class="${
            esTrial
              ? "boton-registrar-visita"
              : "boton-registrar-foto-access"
          }"
          type="button"
          data-field-photo-open="true"
          data-aoi-id="${escaparAtributo(sitio.aoiId)}"
          data-location="${escaparAtributo(sitio.location)}"
          data-crop="${escaparAtributo(sitio.crop)}"
          data-photo-type="${photoType}"
        >
          <span aria-hidden="true">📷</span>
          ${
            esTrial
              ? "Registrar visita"
              : "Registrar foto del Access"
          }
        </button>
      </div>
    `;
  }

  function botonHistorial(sitio, photoType) {
    const esTrial = photoType === "Trial";

    return `
      <div class="field-photo-popup-action">
        <button
          class="boton-ver-historial"
          type="button"
          data-field-history-open="true"
          data-aoi-id="${escaparAtributo(sitio.aoiId)}"
          data-location="${escaparAtributo(sitio.location)}"
          data-crop="${escaparAtributo(sitio.crop)}"
          data-photo-type="${photoType}"
        >
          <span aria-hidden="true">🕘</span>
          ${
            esTrial
              ? "Ver historial de visitas"
              : "Ver historial de fotos"
          }
        </button>
      </div>
    `;
  }

  function resumenUltimaVisita(sitio) {
    return `
      <section
        class="field-last-visit-summary"
        data-field-last-visit="true"
        data-aoi-id="${escaparAtributo(sitio.aoiId)}"
        data-crop="${escaparAtributo(sitio.crop)}"
        aria-label="Resumen de la última visita"
      >
        <div class="field-last-visit-loading">
          Cargando última visita...
        </div>
      </section>
    `;
  }

  function insertarAntesDeNavegacion(html, contenido) {
    const referencia = '<div class="botones-navegacion">';

    if (html.includes(referencia)) {
      return html.replace(
        referencia,
        `${contenido}${referencia}`
      );
    }

    return html.replace(
      /<\/div>\s*$/,
      `${contenido}</div>`
    );
  }

  function crearContenidoUltimaVisita(visita, crop) {
    const score = Number(visita?.visitScore);
    const scoreValido =
      Number.isInteger(score) &&
      score >= 1 &&
      score <= 9;

    const color = window.FieldPhotoHistory.colorScore(
      scoreValido ? score : null
    );

    let icono = "🌱";

    if (
      window.FieldPhotoTimelineIcons &&
      typeof window.FieldPhotoTimelineIcons.obtenerIcono === "function"
    ) {
      icono = window.FieldPhotoTimelineIcons.obtenerIcono(crop, {
        color,
        titulo: `${crop || "Cultivo"}, score ${
          scoreValido ? score : "sin evaluar"
        }`
      });
    }

    return `
      <div class="field-last-visit-content">
        <div
          class="field-last-visit-icon"
          style="--last-visit-color: ${escaparAtributo(color)};"
          aria-hidden="true"
        >
          ${icono}
        </div>

        <div class="field-last-visit-score">
          SC ${scoreValido ? score : "–"}
        </div>

        <div class="field-last-visit-score-label">
          ${escaparHTML(etiquetaScore(score))}
        </div>

        <div class="field-last-visit-stage">
          Estadio ${escaparHTML(visita?.cropStage || "Sin estadio")}
        </div>

        <div class="field-last-visit-date">
          ${escaparHTML(formatearFechaBreve(visita?.captureDate))}
        </div>
      </div>
    `;
  }

  async function actualizarResumen(elemento) {
    if (!elemento || elemento.dataset.loading === "true") {
      return;
    }

    if (
      !window.FieldPhotoHistory ||
      typeof window.FieldPhotoHistory.obtenerVisitas !== "function"
    ) {
      elemento.innerHTML = `
        <div class="field-last-visit-empty">
          Historial no disponible
        </div>
      `;
      return;
    }

    elemento.dataset.loading = "true";

    try {
      const aoiId = texto(elemento.dataset.aoiId);
      const crop = texto(elemento.dataset.crop);
      const visitas =
        await window.FieldPhotoHistory.obtenerVisitas(
          aoiId,
          "Trial"
        );

      if (!document.body.contains(elemento)) {
        return;
      }

      if (!visitas.length) {
        elemento.innerHTML = `
          <div class="field-last-visit-empty">
            Sin visitas sincronizadas
          </div>
        `;
        return;
      }

      elemento.innerHTML = crearContenidoUltimaVisita(
        visitas[0],
        crop
      );
    } catch (error) {
      console.warn(
        "No fue posible cargar el resumen de la última visita:",
        error
      );

      if (document.body.contains(elemento)) {
        elemento.innerHTML = `
          <div class="field-last-visit-empty">
            Resumen no disponible
          </div>
        `;
      }
    } finally {
      delete elemento.dataset.loading;
    }
  }

  function actualizarResumenesVisibles(aoiId = "") {
    document
      .querySelectorAll('[data-field-last-visit="true"]')
      .forEach(elemento => {
        if (
          !aoiId ||
          texto(elemento.dataset.aoiId).toLowerCase() ===
            texto(aoiId).toLowerCase()
        ) {
          actualizarResumen(elemento);
        }
      });
  }

  const crearPopupTrialAnterior =
    window.crearPopupTrial;
  const crearPopupAccessAnterior =
    window.crearPopupAccess;

  if (
    typeof crearPopupTrialAnterior !== "function" ||
    typeof crearPopupAccessAnterior !== "function"
  ) {
    console.error(
      "No fue posible integrar Field Photos: faltan las funciones de popup."
    );
    return;
  }

  window.crearPopupTrial = function (sitio) {
    const html = crearPopupTrialAnterior(sitio);
    const historial = botonHistorial(sitio, "Trial");
    const resumen = resumenUltimaVisita(sitio);

    if (esDrop(sitio)) {
      return insertarAntesDeNavegacion(
        html,
        resumen + historial
      );
    }

    return insertarAntesDeNavegacion(
      html,
      resumen + botonCaptura(sitio, "Trial") + historial
    );
  };

  window.crearPopupAccess = function (sitio) {
    const html = crearPopupAccessAnterior(sitio);

    return insertarAntesDeNavegacion(
      html,
      botonCaptura(sitio, "Access") +
        botonHistorial(sitio, "Access")
    );
  };

  document.addEventListener("click", evento => {
    const boton = evento.target.closest(
      '[data-field-photo-open="true"]'
    );

    if (!boton) return;

    evento.preventDefault();
    evento.stopPropagation();

    if (
      !window.FieldPhotoCapture ||
      typeof window.FieldPhotoCapture
        .abrirPanelCaptura !== "function"
    ) {
      window.alert(
        "La captura de fotografías todavía no está disponible."
      );
      return;
    }

    window.FieldPhotoCapture.abrirPanelCaptura({
      aoiId: boton.dataset.aoiId || "",
      location: boton.dataset.location || "",
      crop: boton.dataset.crop || "",
      photoType: boton.dataset.photoType || "Trial"
    });
  });

  document.addEventListener("click", evento => {
    const boton = evento.target.closest(
      '[data-field-history-open="true"]'
    );

    if (!boton) return;

    evento.preventDefault();
    evento.stopPropagation();

    if (
      !window.FieldPhotoHistoryUI ||
      typeof window.FieldPhotoHistoryUI
        .abrirHistorial !== "function"
    ) {
      window.alert(
        "El historial de visitas todavía no está disponible."
      );
      return;
    }

    window.FieldPhotoHistoryUI.abrirHistorial({
      aoiId: boton.dataset.aoiId || "",
      location: boton.dataset.location || "",
      crop: boton.dataset.crop || "",
      photoType: boton.dataset.photoType || "Trial"
    });
  });

  document.addEventListener("DOMContentLoaded", () => {
    actualizarResumenesVisibles();
  });

  document.addEventListener("popupopen", () => {
    window.setTimeout(() => {
      actualizarResumenesVisibles();
    }, 0);
  });

  window.addEventListener("fieldphotos:history-updated", evento => {
    actualizarResumenesVisibles(
      evento.detail?.aoiId || ""
    );
  });

  const observador = new MutationObserver(() => {
    actualizarResumenesVisibles();
  });

  observador.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.FieldPhotoPopupIntegration = {
    actualizarResumenesVisibles
  };

  console.log(
    "Captura, historial y última visita integrados en los popups reales."
  );
})();
