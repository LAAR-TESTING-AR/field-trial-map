(function () {
  "use strict";

  function escaparAtributo(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function envolverSVG(contenido, opciones = {}, claseCultivo = "") {
    const color = String(opciones.color || "#9aa39e").trim();
    const clase = String(opciones.clase || "").trim();
    const titulo = String(opciones.titulo || "Hito de visita").trim();

    return `
      <svg
        class="field-timeline-crop-icon ${claseCultivo} ${escaparAtributo(clase)}"
        viewBox="0 0 64 64"
        role="img"
        aria-label="${escaparAtributo(titulo)}"
        xmlns="http://www.w3.org/2000/svg"
        style="color: ${escaparAtributo(color)};"
      >
        ${contenido}
      </svg>
    `;
  }

  function iconoMazorca(opciones = {}) {
    return envolverSVG(`
      <path fill="currentColor" d="M34.2 7.1c8.7 3.1 14.4 11.3 13.9 20.6-.6 11.5-8.4 22.2-20.1 28.7-2.2 1.2-4.8-.7-4.3-3.2 1.2-6.1.8-11.8-1.2-17.2-2.2-6-2.2-12.1.1-17.4 2.1-4.8 6.1-8.8 11.6-11.5Z"/>
      <path fill="#fff" fill-opacity=".38" d="M34.6 12.1c5.7 2.4 9.1 8.4 8.7 15.2-.4 8.6-5.6 16.9-14.2 22.7.4-5.4-.4-10.6-2.3-15.6-1.7-4.4-1.7-8.9 0-12.8 1.5-3.7 4.2-6.9 7.8-9.5Z"/>
      <g fill="currentColor" stroke="#fff" stroke-width="1.35">
        <ellipse cx="33.1" cy="17.3" rx="3.1" ry="3.6"/><ellipse cx="39.2" cy="20.3" rx="3.1" ry="3.6"/>
        <ellipse cx="30.7" cy="24.1" rx="3.1" ry="3.6"/><ellipse cx="37.1" cy="27.2" rx="3.1" ry="3.6"/>
        <ellipse cx="28.9" cy="31.1" rx="3.1" ry="3.6"/><ellipse cx="35.1" cy="34.2" rx="3.1" ry="3.6"/>
        <ellipse cx="27.5" cy="38.2" rx="3.1" ry="3.6"/><ellipse cx="32.8" cy="41.7" rx="3.1" ry="3.6"/>
      </g>
      <path fill="currentColor" d="M24.8 29.4c-7.7 4.4-12.5 11.3-13.4 19.7-.2 1.8 1.7 3.1 3.2 2.1 5.7-3.7 10-8.4 12.8-14.2-1-2.4-1.8-4.9-2.6-7.6Z"/>
      <path fill="currentColor" d="M24.1 34.8c-5.6 5.1-8.4 11.2-8.5 18.2 0 1.6 1.7 2.5 3 1.6 4.6-3.5 8-7.8 10.3-13-1.8-2.1-3.4-4.4-4.8-6.8Z"/>
    `, opciones, "field-timeline-corn-icon");
  }

  function iconoSoja(opciones = {}) {
    return envolverSVG(`
      <path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M32 55V31"/>
      <path fill="currentColor" d="M31 33C16 34 9 25 11 13c12-2 22 5 20 20Z"/>
      <path fill="currentColor" d="M33 33c15 1 22-8 20-20-12-2-22 5-20 20Z"/>
      <path fill="currentColor" d="M32 29C22 22 23 11 32 5c9 6 10 17 0 24Z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.7" d="M15 17c6 3 10 7 14 13M49 17c-6 3-10 7-14 13M32 10v15"/>
    `, opciones, "field-timeline-soybean-icon");
  }

  function iconoGirasol(opciones = {}) {
    const petalos = Array.from({ length: 12 }, (_, i) =>
      `<ellipse fill="currentColor" cx="32" cy="12" rx="5" ry="10" transform="rotate(${i * 30} 32 32)"/>`
    ).join("");

    return envolverSVG(`
      ${petalos}
      <circle fill="currentColor" cx="32" cy="32" r="13"/>
      <circle fill="#fff" fill-opacity=".38" cx="32" cy="32" r="8"/>
      <g fill="currentColor">
        <circle cx="29" cy="29" r="1.5"/><circle cx="35" cy="29" r="1.5"/>
        <circle cx="29" cy="35" r="1.5"/><circle cx="35" cy="35" r="1.5"/>
      </g>
    `, opciones, "field-timeline-sunflower-icon");
  }

  function iconoCanola(opciones = {}) {
    return envolverSVG(`
      <path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M32 56V29M32 40l-12-9M32 46l13-10"/>
      <g fill="currentColor">
        <ellipse cx="32" cy="18" rx="7" ry="12"/>
        <ellipse cx="32" cy="18" rx="7" ry="12" transform="rotate(90 32 18)"/>
        <ellipse cx="18" cy="28" rx="6" ry="10" transform="rotate(-45 18 28)"/>
        <ellipse cx="47" cy="31" rx="6" ry="10" transform="rotate(45 47 31)"/>
      </g>
      <g fill="#fff" fill-opacity=".55">
        <circle cx="32" cy="18" r="4"/><circle cx="18" cy="28" r="3"/><circle cx="47" cy="31" r="3"/>
      </g>
    `, opciones, "field-timeline-canola-icon");
  }

  function iconoMustard(opciones = {}) {
    return envolverSVG(`
      <path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M31 57V20M31 35l-12-8M31 42l14-9"/>
      <path fill="currentColor" d="M30 37C15 39 8 31 10 21c12-2 20 5 20 16ZM33 43c14 1 21-7 20-17-11-2-20 5-20 17Z"/>
      <g fill="currentColor">
        <circle cx="31" cy="13" r="7"/><circle cx="22" cy="16" r="6"/><circle cx="40" cy="17" r="6"/><circle cx="31" cy="22" r="6"/>
      </g>
      <circle fill="#fff" fill-opacity=".55" cx="31" cy="17" r="4"/>
    `, opciones, "field-timeline-mustard-icon");
  }

  function iconoHoja(opciones = {}) {
    return envolverSVG(`
      <path fill="currentColor" d="M53 8C30 9 14 19 10 38c-2 9 5 17 14 15 19-4 29-20 29-45Z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".62" stroke-width="3" stroke-linecap="round" d="M18 47c8-12 17-21 29-31M25 38l-1-11M34 30l10 1"/>
    `, opciones, "field-timeline-generic-icon");
  }

  function obtenerIcono(cultivo, opciones = {}) {
    const nombre = String(cultivo || "").trim().toLowerCase();

    if (nombre.startsWith("corn") || nombre.includes("maiz") || nombre.includes("maíz")) {
      return iconoMazorca(opciones);
    }

    if (nombre.startsWith("soybean") || nombre.includes("soy") || nombre.includes("soja")) {
      return iconoSoja(opciones);
    }

    if (nombre.startsWith("sunflower") || nombre.includes("girasol")) {
      return iconoGirasol(opciones);
    }

    if (nombre.startsWith("canola") || nombre.includes("colza")) {
      return iconoCanola(opciones);
    }

    if (nombre.startsWith("mustard") || nombre.includes("mostaza")) {
      return iconoMustard(opciones);
    }

    return iconoHoja({
      ...opciones,
      titulo: opciones.titulo || "Hito de visita"
    });
  }

  window.FieldPhotoTimelineIcons = {
    iconoMazorca,
    iconoSoja,
    iconoGirasol,
    iconoCanola,
    iconoMustard,
    iconoHoja,
    obtenerIcono
  };

  console.log("Íconos SVG coloreables de cultivos preparados.");
})();
