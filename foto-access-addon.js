(function () {
  "use strict";

  const FORM_URL = "https://forms.cloud.microsoft/r/Xy2k2YvNBk";

  function agregarBotonAlPopup() {
    const popup = document.querySelector(".leaflet-popup-content .popup-access");
    if (!popup || popup.querySelector(".boton-foto-access")) return;

    const contenedor = popup.querySelector(".botones-navegacion");
    if (!contenedor) return;

    const boton = document.createElement("a");
    boton.className = "boton-foto-access";
    boton.href = FORM_URL;
    boton.target = "_blank";
    boton.rel = "noopener noreferrer";
    boton.setAttribute("aria-label", "Cargar una foto del acceso");
    boton.innerHTML = '<span aria-hidden="true">📷</span> Cargar foto';

    contenedor.insertBefore(boton, contenedor.firstChild);
  }

  if (typeof mapa === "undefined" || !mapa || typeof mapa.on !== "function") {
    console.error("foto-access-addon.js: no se encontro el mapa. El archivo debe cargarse despues de app.js.");
    return;
  }

  mapa.on("popupopen", agregarBotonAlPopup);
  console.log("Boton de fotos para Access habilitado correctamente.");
})();
