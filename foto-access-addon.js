(function () {
  "use strict";

  const FORM_BASE_URL = "https://forms.cloud.microsoft/Pages/ResponsePage.aspx";
  const FORM_ID = "suwgPrCc8U2te5FOMdzdpCxUfKtsO4dHmIGDSDmC5vdUOUg2SDZZSUdHTEJUVUE0MkxKRE9WVklFVi4u";
  const ACCESS_ID_FIELD = "r7a72e2f762b74f7099bc3df7da194874";
  const LOCATION_FIELD = "r845419d35b094ab9a8c5d4752ee6b234";

  function limpiarValorFormulario(valor) {
    return String(valor ?? "")
      .trim()
      .replaceAll("+", " ")
      .replaceAll("%20", " ");
  }

  function construirUrlFormulario(sitio) {
    const accessId = limpiarValorFormulario(sitio.aoiId);
    const location = limpiarValorFormulario(sitio.location);

    return (
      FORM_BASE_URL +
      "?id=" + FORM_ID +
      "&" + ACCESS_ID_FIELD + "=" + accessId +
      "&" + LOCATION_FIELD + "=" + location
    );
  }

  function agregarBotonAlPopup(evento) {
    const sitio = evento?.popup?.options?.sitioAccess;
    if (!sitio) return;

    const popup = document.querySelector(".leaflet-popup-content .popup-access");
    if (!popup || popup.querySelector(".boton-foto-access")) return;

    const contenedor = popup.querySelector(".botones-navegacion");
    if (!contenedor) return;

    const boton = document.createElement("a");
    boton.className = "boton-foto-access";
    boton.href = construirUrlFormulario(sitio);
    boton.target = "_blank";
    boton.rel = "noopener noreferrer";
    boton.setAttribute("aria-label", "Cargar una foto del acceso");
    boton.innerHTML = '<span aria-hidden="true">📷</span> Cargar foto';

    contenedor.insertBefore(boton, contenedor.firstChild);
  }

  if (typeof mapa === "undefined" || !mapa || typeof mapa.on !== "function") {
    console.error(
      "foto-access-addon.js: no se encontro el mapa. " +
      "El archivo debe cargarse despues de app.js."
    );
    return;
  }

  mapa.on("popupopen", agregarBotonAlPopup);
  console.log("Formulario precargado para fotos Access habilitado correctamente.");
})();
