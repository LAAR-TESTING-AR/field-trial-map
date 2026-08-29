(function () {
  "use strict";

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function escaparAtributo(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function esDrop(sitio) {
    return texto(sitio?.description)
      .toLowerCase()
      .includes("drop");
  }

  function esModoViewer() {
    return Boolean(
      window.FieldTrialAppMode &&
      window.FieldTrialAppMode.isViewer
    );
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
          class="${
            esTrial
              ? "boton-registrar-visita"
              : "boton-registrar-foto-access"
          } boton-ver-historial"
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
              ? "Historial de visitas"
              : "Historial de fotos"
          }
        </button>
      </div>
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

  const crearPopupTrialAnterior = window.crearPopupTrial;
  const crearPopupAccessAnterior = window.crearPopupAccess;

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

    if (esDrop(sitio) || esModoViewer()) {
      return insertarAntesDeNavegacion(
        html,
        historial
      );
    }

    return insertarAntesDeNavegacion(
      html,
      botonCaptura(sitio, "Trial") + historial
    );
  };

  window.crearPopupAccess = function (sitio) {
    const html = crearPopupAccessAnterior(sitio);
    const historial = botonHistorial(sitio, "Access");

    if (esModoViewer()) {
      return insertarAntesDeNavegacion(
        html,
        historial
      );
    }

    return insertarAntesDeNavegacion(
      html,
      botonCaptura(sitio, "Access") + historial
    );
  };

  document.addEventListener("click", evento => {
    const boton = evento.target.closest(
      '[data-field-photo-open="true"]'
    );

    if (!boton) return;

    evento.preventDefault();
    evento.stopPropagation();

    if (esModoViewer()) return;

    if (
      !window.FieldPhotoCapture ||
      typeof window.FieldPhotoCapture.abrirPanelCaptura !== "function"
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
      typeof window.FieldPhotoHistoryUI.abrirHistorial !== "function"
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

  console.log(
    esModoViewer()
      ? "Modo consulta: historiales integrados en los popups."
      : "Captura e historial Field Photos integrados en los popups."
  );
})();
