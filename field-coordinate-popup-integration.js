(function () {
  "use strict";

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function numero(valor) {
    const original = texto(valor);

    if (!original) {
      return "";
    }

    const convertido = Number(original.replace(",", "."));
    return Number.isFinite(convertido) ? convertido : "";
  }

  function coordenadaValida(valor, tipo) {
    const convertido = numero(valor);

    if (convertido === "") {
      return false;
    }

    if (tipo === "latitude") {
      return convertido >= -90 && convertido <= 90;
    }

    return convertido >= -180 && convertido <= 180;
  }

  function tieneAccessRegistrado(sitio) {
    return (
      coordenadaValida(sitio?.latitudeAccess, "latitude") &&
      coordenadaValida(sitio?.longitudeAccess, "longitude")
    );
  }

  function escaparAtributo(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function esModoViewer() {
    return Boolean(
      window.FieldTrialAppMode &&
      window.FieldTrialAppMode.isViewer
    );
  }

  function crearBotonCoordenada(sitio, pointType, opciones = {}) {
    const esTrial = pointType === "Trial";
    const latitude = esTrial
      ? numero(sitio.latitudeTrial)
      : numero(sitio.latitudeAccess);
    const longitude = esTrial
      ? numero(sitio.longitudeTrial)
      : numero(sitio.longitudeAccess);

    const accion = texto(opciones.action || "update");
    const esCreacionAccess =
      pointType === "Access" && accion === "create";

    const etiqueta = esCreacionAccess
      ? "Crear Access"
      : "Actualizar ubicación";

    const icono = esCreacionAccess ? "➕" : "📍";

    const claseAdicional = esCreacionAccess
      ? " field-coordinate-popup-button-create-access"
      : "";

    return `
      <div class="field-coordinate-popup-action">
        <button
          class="field-coordinate-popup-button${claseAdicional}"
          type="button"
          data-field-coordinate-open="true"
          data-coordinate-action="${escaparAtributo(accion)}"
          data-aoi-id="${escaparAtributo(sitio.aoiId)}"
          data-location="${escaparAtributo(sitio.location)}"
          data-point-type="${escaparAtributo(pointType)}"
          data-previous-latitude="${escaparAtributo(latitude)}"
          data-previous-longitude="${escaparAtributo(longitude)}"
        >
          <span aria-hidden="true">${icono}</span>
          ${etiqueta}
        </button>
      </div>
    `;
  }

  function crearEstadoAccess(sitio) {
    const registrado = tieneAccessRegistrado(sitio);

    return `
      <div
        class="field-access-status ${
          registrado
            ? "field-access-status-ok"
            : "field-access-status-missing"
        }"
        role="status"
      >
        <span aria-hidden="true">${registrado ? "✅" : "⚠️"}</span>
        ${
          registrado
            ? "Access registrado"
            : "Access no registrado"
        }
      </div>
    `;
  }

  function crearControlAccessDesdeTrial(sitio) {
    const estado = crearEstadoAccess(sitio);

    if (tieneAccessRegistrado(sitio)) {
      return estado;
    }

    return (
      estado +
      crearBotonCoordenada(sitio, "Access", {
        action: "create"
      })
    );
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

    if (esModoViewer()) {
      return html;
    }

    const controles =
      crearBotonCoordenada(sitio, "Trial") +
      crearControlAccessDesdeTrial(sitio);

    return insertarAntesDeNavegacion(
      html,
      controles
    );
  };

  window.crearPopupAccess = function (sitio) {
    const html = crearPopupAccessAnterior(sitio);

    if (esModoViewer()) {
      return html;
    }

    return insertarAntesDeNavegacion(
      html,
      crearBotonCoordenada(sitio, "Access")
    );
  };

  document.addEventListener("click", evento => {
    const boton = evento.target.closest(
      '[data-field-coordinate-open="true"]'
    );

    if (!boton) return;

    evento.preventDefault();
    evento.stopPropagation();

    if (esModoViewer()) {
      return;
    }

    if (
      !window.FieldCoordinateCapture ||
      typeof window.FieldCoordinateCapture.abrirPanelCaptura !== "function"
    ) {
      window.alert(
        "La captura GPS todavía no está disponible en este dispositivo."
      );
      return;
    }

    const esCreacionAccess =
      boton.dataset.pointType === "Access" &&
      boton.dataset.coordinateAction === "create";

    if (esCreacionAccess) {
      const continuar = window.confirm(
        "Este Trial no tiene coordenadas de Access registradas.\n\n" +
        "¿Querés capturar ahora la ubicación del nuevo Access?"
      );

      if (!continuar) {
        return;
      }
    }

    window.FieldCoordinateCapture.abrirPanelCaptura({
      aoiId: boton.dataset.aoiId || "",
      location: boton.dataset.location || "",
      pointType: boton.dataset.pointType || "Trial",
      previousLatitude: boton.dataset.previousLatitude || "",
      previousLongitude: boton.dataset.previousLongitude || "",
      action: boton.dataset.coordinateAction || "update",
      isNewAccess: esCreacionAccess
    });
  });

  console.log(
    esModoViewer()
      ? "Modo consulta: actualización de coordenadas deshabilitada."
      : "Captura de coordenadas integrada en los popups Trial y Access, con detección de Access no registrado."
  );
})();
