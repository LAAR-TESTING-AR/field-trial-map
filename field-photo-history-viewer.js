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

  function cerrarVisorHistorial() {
    const visor = document.getElementById(
      "fieldHistoryPhotoViewer"
    );

    if (!visor) {
      return;
    }

    const imagen = visor.querySelector(
      ".field-history-viewer-image"
    );

    if (imagen) {
      imagen.removeAttribute("src");
    }

    visor.remove();
  }

  function abrirVisorHistorial(url, descripcion) {
    cerrarVisorHistorial();

    const visor = document.createElement("div");

    visor.id = "fieldHistoryPhotoViewer";
    visor.setAttribute("role", "dialog");
    visor.setAttribute("aria-modal", "true");
    visor.setAttribute(
      "aria-label",
      "Vista ampliada de fotografía histórica"
    );

    /*
      Los estilos críticos se aplican directamente para evitar
      que otras reglas del mapa o de Leaflet desplacen el visor.
    */
    Object.assign(visor.style, {
      position: "fixed",
      inset: "0",
      zIndex: "50000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100vw",
      height: "100dvh",
      padding: "12px",
      boxSizing: "border-box",
      overflow: "hidden",
      background: "rgba(0, 0, 0, 0.94)"
    });

    visor.innerHTML = `
      <section
        class="field-history-viewer-dialog"
        style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: min(100%, 1100px);
          height: min(100%, 900px);
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent;
        "
      >
        <button
          class="field-history-viewer-close"
          type="button"
          aria-label="Cerrar fotografía y volver al historial"
          style="
            position: absolute;
            top: max(10px, env(safe-area-inset-top));
            right: 10px;
            z-index: 50002;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 46px;
            height: 46px;
            margin: 0;
            padding: 0;
            border: 2px solid rgba(255,255,255,.88);
            border-radius: 50%;
            color: #ffffff;
            background: #0b6b3a;
            font-family: Arial, sans-serif;
            font-size: 30px;
            line-height: 1;
            cursor: pointer;
          "
        >×</button>

        <img
          class="field-history-viewer-image"
          src="${escaparHTML(url)}"
          alt="${escaparHTML(descripcion)}"
          style="
            display: block;
            width: auto;
            max-width: 100%;
            height: auto;
            max-height: calc(100dvh - 90px);
            margin: auto;
            border-radius: 8px;
            object-fit: contain;
            object-position: center;
            user-select: none;
            -webkit-user-select: none;
          "
        >

        <p
          style="
            position: absolute;
            right: 12px;
            bottom: max(8px, env(safe-area-inset-bottom));
            left: 12px;
            z-index: 50002;
            width: fit-content;
            max-width: calc(100% - 24px);
            margin: 0 auto;
            padding: 7px 12px;
            border-radius: 999px;
            color: #ffffff;
            background: rgba(0,0,0,.62);
            font-size: 12px;
            text-align: center;
            pointer-events: none;
          "
        >
          Tocá la X para volver al historial
        </p>
      </section>
    `;

    document.body.appendChild(visor);

    visor
      .querySelector(".field-history-viewer-close")
      .addEventListener("click", evento => {
        evento.preventDefault();
        evento.stopPropagation();
        cerrarVisorHistorial();
      });

    visor.addEventListener("click", evento => {
      if (
        evento.target === visor ||
        evento.target.classList.contains(
          "field-history-viewer-dialog"
        )
      ) {
        cerrarVisorHistorial();
      }
    });
  }

  document.addEventListener(
    "click",
    evento => {
      const boton = evento.target.closest(
        ".field-history-foto"
      );

      if (!boton) {
        return;
      }

      const url = texto(boton.dataset.photoUrl);

      if (!url) {
        return;
      }

      evento.preventDefault();
      evento.stopPropagation();
      evento.stopImmediatePropagation();

      const imagen = boton.querySelector("img");
      const descripcion =
        imagen?.getAttribute("alt") ||
        "Fotografía histórica";

      abrirVisorHistorial(url, descripcion);
    },
    true
  );

  window.FieldPhotoHistoryViewer = {
    abrir: abrirVisorHistorial,
    cerrar: cerrarVisorHistorial
  };

  console.log(
    "Visor modal del historial Field Photos preparado."
  );
})();
