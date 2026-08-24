/* Boton para cargar fotos de Access desde Microsoft Forms.
   Cargar este archivo DESPUES de app.js en index.html. */
(function () {
  "use strict";

  const FORM_URL = "https://forms.cloud.microsoft/r/Xy2k2YvNBk";

  if (typeof window.crearPopup !== "function") {
    console.error("foto-access-addon.js: no se encontro crearPopup. Verifique que este archivo se cargue despues de app.js.");
    return;
  }

  const crearPopupOriginal = window.crearPopup;

  window.crearPopup = function (sitio) {
    let html = crearPopupOriginal(sitio);

    const tipo = String(sitio && sitio.siteType ? sitio.siteType : "")
      .trim()
      .toLowerCase();

    const esPuntoAccess = ["access", "acceso", "bajada", "bajada de ruta"].includes(tipo);
    if (!esPuntoAccess) return html;

    const botonFoto = `
      <a
        class="boton-foto-access"
        href="${FORM_URL}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Cargar una foto del acceso"
      >
        <span aria-hidden="true">📷</span> Cargar foto
      </a>`;

    const marcadorBotones = '<div class="botones-navegacion">';

    if (html.includes(marcadorBotones)) {
      html = html.replace(marcadorBotones, `${marcadorBotones}${botonFoto}`);
    } else {
      html += botonFoto;
    }

    return html;
  };

  console.log("Boton de fotos para Access habilitado correctamente.");
})();
