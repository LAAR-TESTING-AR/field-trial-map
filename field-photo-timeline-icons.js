(function () {
  "use strict";

  function escaparAtributo(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function iconoMazorca(opciones = {}) {
    const color = String(
      opciones.color || "#9aa39e"
    ).trim();

    const clase = String(
      opciones.clase || ""
    ).trim();

    const titulo = String(
      opciones.titulo || "Hito de visita de maíz"
    ).trim();

    return `
      <svg
        class="field-timeline-crop-icon field-timeline-corn-icon ${escaparAtributo(clase)}"
        viewBox="0 0 64 64"
        role="img"
        aria-label="${escaparAtributo(titulo)}"
        xmlns="http://www.w3.org/2000/svg"
        style="color: ${escaparAtributo(color)};"
      >
        <path
          fill="currentColor"
          d="M34.2 7.1c8.7 3.1 14.4 11.3 13.9 20.6-.6 11.5-8.4 22.2-20.1 28.7-2.2 1.2-4.8-.7-4.3-3.2 1.2-6.1.8-11.8-1.2-17.2-2.2-6-2.2-12.1.1-17.4 2.1-4.8 6.1-8.8 11.6-11.5Z"
        />

        <path
          fill="#ffffff"
          fill-opacity="0.38"
          d="M34.6 12.1c5.7 2.4 9.1 8.4 8.7 15.2-.4 8.6-5.6 16.9-14.2 22.7.4-5.4-.4-10.6-2.3-15.6-1.7-4.4-1.7-8.9 0-12.8 1.5-3.7 4.2-6.9 7.8-9.5Z"
        />

        <g
          fill="currentColor"
          stroke="#ffffff"
          stroke-width="1.35"
        >
          <ellipse cx="33.1" cy="17.3" rx="3.1" ry="3.6" />
          <ellipse cx="39.2" cy="20.3" rx="3.1" ry="3.6" />
          <ellipse cx="30.7" cy="24.1" rx="3.1" ry="3.6" />
          <ellipse cx="37.1" cy="27.2" rx="3.1" ry="3.6" />
          <ellipse cx="28.9" cy="31.1" rx="3.1" ry="3.6" />
          <ellipse cx="35.1" cy="34.2" rx="3.1" ry="3.6" />
          <ellipse cx="27.5" cy="38.2" rx="3.1" ry="3.6" />
          <ellipse cx="32.8" cy="41.7" rx="3.1" ry="3.6" />
        </g>

        <path
          fill="currentColor"
          d="M24.8 29.4c-7.7 4.4-12.5 11.3-13.4 19.7-.2 1.8 1.7 3.1 3.2 2.1 5.7-3.7 10-8.4 12.8-14.2-1-2.4-1.8-4.9-2.6-7.6Z"
        />

        <path
          fill="currentColor"
          d="M24.1 34.8c-5.6 5.1-8.4 11.2-8.5 18.2 0 1.6 1.7 2.5 3 1.6 4.6-3.5 8-7.8 10.3-13-1.8-2.1-3.4-4.4-4.8-6.8Z"
        />
      </svg>
    `;
  }

  function obtenerIcono(
    cultivo,
    opciones = {}
  ) {
    const nombre = String(cultivo || "")
      .trim()
      .toLowerCase();

    if (
      nombre.startsWith("corn") ||
      nombre.includes("maiz") ||
      nombre.includes("maíz")
    ) {
      return iconoMazorca(opciones);
    }

    return iconoMazorca({
      ...opciones,
      titulo:
        opciones.titulo ||
        "Hito de visita"
    });
  }

  window.FieldPhotoTimelineIcons = {
    iconoMazorca,
    obtenerIcono
  };

  console.log(
    "Ícono SVG coloreable de mazorca preparado."
  );
})();
