(function () {
  "use strict";

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function numero(valor) {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : "";
  }

  function escaparAtributo(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function crearBotonCoordenada(sitio, pointType) {
    const esTrial = pointType === "Trial";
    const latitude = esTrial
      ? numero(sitio.latitudeTrial)
      : numero(sitio.latitudeAccess);
    const longitude = esTrial
      ? numero(sitio.longitudeTrial)
      : numero(sitio.longitudeAccess);

    return `
      <div class="field-coordinate-popup-action">
        <button
          class="field-coordinate-popup-button"
          type="button"
          data-field-coordinate-open="true"
          data-aoi-id="${escaparAtributo(sitio.aoiId)}"
          data-location="${escaparAtributo(sitio.location)}"
          data-point-type="${pointType}"
          data-previous-latitude="${latitude}"
          data-previous-longitude="${longitude}"
        >
          <span aria-hidden="true">📍</span>
          ${
            esTrial
              ? "Actualizar ubicación"
              : "Actualizar ubicación"
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
      "No fue posible integrar la captura de coordenadas: faltan las funciones de popup."
    );
    return;
  }

  window.crearPopupTrial = function (sitio) {
    const html = crearPopupTrialAnterior(sitio);

    return insertarAntesDeNavegacion(
      html,
      crearBotonCoordenada(sitio, "Trial")
    );
  };

  window.crearPopupAccess = function (sitio) {
    const html = crearPopupAccessAnterior(sitio);

    return insertarAntesDeNavegacion(
      html,
      crearBotonCoordenada(sitio, "Access")
    );
  };

  document.addEventListener("click", evento => {
    const boton = evento.target.closest(
      '[data-field-coordinate-open="true"]'
    );

    if (!boton) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();

    if (
      !window.FieldCoordinateCapture ||
      typeof window.FieldCoordinateCapture.abrirPanelCaptura !== "function"
    ) {
      window.alert(
        "La captura GPS todavía no está disponible en este dispositivo."
      );
      return;
    }

    window.FieldCoordinateCapture.abrirPanelCaptura({
      aoiId: boton.dataset.aoiId || "",
      location: boton.dataset.location || "",
      pointType: boton.dataset.pointType || "Trial",
      previousLatitude: boton.dataset.previousLatitude || "",
      previousLongitude: boton.dataset.previousLongitude || ""
    });
  });

  console.log(
    "Captura de coordenadas integrada en los popups Trial y Access."
  );
})();
