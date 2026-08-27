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
    return texto(sitio?.description).toLowerCase().includes("drop");
  }

  function botonCaptura(sitio, photoType) {
    const esTrial = photoType === "Trial";

    return `
      <div class="field-photo-popup-action">
        <button
          class="${esTrial ? "boton-registrar-visita" : "boton-registrar-foto-access"}"
          type="button"
          data-field-photo-open="true"
          data-aoi-id="${escaparAtributo(sitio.aoiId)}"
          data-location="${escaparAtributo(sitio.location)}"
          data-crop="${escaparAtributo(sitio.crop)}"
          data-photo-type="${photoType}"
        >
          <span aria-hidden="true">📷</span>
          ${esTrial ? "Registrar visita" : "Registrar foto del Access"}
        </button>
      </div>
    `;
  }

  function insertarAntesDeNavegacion(html, boton) {
    const referencia = '<div class="botones-navegacion">';

    if (html.includes(referencia)) {
      return html.replace(referencia, `${boton}${referencia}`);
    }

    return html.replace(/<\/div>\s*$/, `${boton}</div>`);
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

    if (esDrop(sitio)) {
      return html;
    }

    return insertarAntesDeNavegacion(
      html,
      botonCaptura(sitio, "Trial")
    );
  };

  window.crearPopupAccess = function (sitio) {
    const html = crearPopupAccessAnterior(sitio);

    return insertarAntesDeNavegacion(
      html,
      botonCaptura(sitio, "Access")
    );
  };

  document.addEventListener("click", evento => {
    const boton = evento.target.closest('[data-field-photo-open="true"]');

    if (!boton) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();

    if (
      !window.FieldPhotoCapture ||
      typeof window.FieldPhotoCapture.abrirPanelCaptura !== "function"
    ) {
      window.alert("La captura de fotografías todavía no está disponible.");
      return;
    }

    window.FieldPhotoCapture.abrirPanelCaptura({
      aoiId: boton.dataset.aoiId || "",
      location: boton.dataset.location || "",
      crop: boton.dataset.crop || "",
      photoType: boton.dataset.photoType || "Trial"
    });
  });

  console.log("Captura Field Photos integrada en los popups reales.");
})();
