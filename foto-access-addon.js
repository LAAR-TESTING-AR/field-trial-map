(function () {
  "use strict";

  const FORM_BASE_URL = "https://forms.cloud.microsoft/Pages/ResponsePage.aspx";
  const FORM_ID = "suwgPrCc8U2te5FOMdzdpCxUfKtsO4dHmIGDSDmC5vdUOUg2SDZZSUdHTEJUVUE0MkxKRE9WVklFVi4u";
  const ACCESS_ID_FIELD = "r7a72e2f762b74f7099bc3df7da194874";
  const LOCATION_FIELD = "r845419d35b094ab9a8c5d4752ee6b234";
  const ARCHIVO_FOTOS = "AccessPhotos.csv";

  let fotosAccess = [];
  let fotosCargadas = false;

  function limpiar(valor) {
    return String(valor ?? "").trim();
  }

  function normalizarId(valor) {
    return limpiar(valor).toLowerCase();
  }

  function limpiarValorFormulario(valor) {
    return limpiar(valor).replaceAll("+", " ").replaceAll("%20", " ");
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

  function extraerUrl(valor) {
    const texto = limpiar(valor);
    if (!texto) return "";

    if (/^https?:\/\//i.test(texto)) return texto;

    try {
      const objeto = JSON.parse(texto);
      if (typeof objeto === "string") return objeto;
      if (objeto && typeof objeto.Url === "string") return objeto.Url;
      if (objeto && typeof objeto.url === "string") return objeto.url;
      if (objeto && typeof objeto.link === "string") return objeto.link;
    } catch (_) {
      // El valor no es JSON; se intenta extraer una URL del texto.
    }

    const coincidencia = texto.match(/https?:\/\/[^\s"']+/i);
    return coincidencia ? coincidencia[0] : "";
  }

  function convertirFecha(valor) {
    const texto = limpiar(valor);
    if (!texto) return null;

    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  function formatearFecha(valor) {
    const fecha = convertirFecha(valor);
    if (!fecha) return limpiar(valor);

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(fecha);
  }

  function transformarFoto(fila) {
    return {
      accessId: limpiar(fila.AccessID),
      location: limpiar(fila.Location),
      comments: limpiar(fila.Comments),
      photoLink: extraerUrl(fila.PhotoLink),
      captureDate: limpiar(fila.CaptureDate)
    };
  }

  function cargarFotosAccess() {
    if (typeof Papa === "undefined") {
      console.error("foto-access-addon.js: Papa Parse no esta disponible.");
      return;
    }

    Papa.parse(`${ARCHIVO_FOTOS}?v=${Date.now()}`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: encabezado => encabezado.replace(/^\uFEFF/, "").trim(),
      complete: resultado => {
        fotosAccess = resultado.data
          .map(transformarFoto)
          .filter(foto => foto.accessId && foto.photoLink);

        fotosCargadas = true;
        console.log(`${fotosAccess.length} fotos de accesos cargadas.`);

        const popupAbierto = mapa && mapa._popup;
        if (popupAbierto) agregarContenidoAlPopup({ popup: popupAbierto });
      },
      error: error => {
        fotosCargadas = true;
        console.error("No fue posible cargar AccessPhotos.csv:", error);
      }
    });
  }

  function obtenerUltimaFoto(accessId) {
    const idBuscado = normalizarId(accessId);

    return fotosAccess
      .filter(foto => normalizarId(foto.accessId) === idBuscado)
      .sort((a, b) => {
        const fechaA = convertirFecha(a.captureDate);
        const fechaB = convertirFecha(b.captureDate);
        return (fechaB ? fechaB.getTime() : 0) - (fechaA ? fechaA.getTime() : 0);
      })[0] || null;
  }

  function crearBoton(clase, href, contenido, etiqueta) {
    const boton = document.createElement("a");
    boton.className = clase;
    boton.href = href;
    boton.target = "_blank";
    boton.rel = "noopener noreferrer";
    boton.setAttribute("aria-label", etiqueta);
    boton.innerHTML = contenido;
    return boton;
  }

  function agregarContenidoAlPopup(evento) {
    const sitio = evento?.popup?.options?.sitioAccess;
    if (!sitio) return;

    const popup = document.querySelector(".leaflet-popup-content .popup-access");
    if (!popup) return;

    const contenedor = popup.querySelector(".botones-navegacion");
    if (!contenedor) return;

    if (!popup.querySelector(".boton-foto-access")) {
      const botonCargar = crearBoton(
        "boton-foto-access",
        construirUrlFormulario(sitio),
        '<span aria-hidden="true">📷</span> Cargar foto',
        "Cargar una foto del acceso"
      );
      contenedor.insertBefore(botonCargar, contenedor.firstChild);
    }

    const bloqueAnterior = popup.querySelector(".ultima-foto-access");
    if (bloqueAnterior) bloqueAnterior.remove();

    const ultimaFoto = obtenerUltimaFoto(sitio.aoiId);
    if (!ultimaFoto) {
      if (!fotosCargadas) {
        const estado = document.createElement("div");
        estado.className = "ultima-foto-access estado-foto-access";
        estado.textContent = "Buscando última foto...";
        contenedor.parentNode.insertBefore(estado, contenedor);
      }
      return;
    }

    const bloque = document.createElement("div");
    bloque.className = "ultima-foto-access";

    const fecha = ultimaFoto.captureDate
      ? `<p><strong>Última foto:</strong> ${formatearFecha(ultimaFoto.captureDate)}</p>`
      : "";

    const comentario = ultimaFoto.comments
      ? `<p><strong>Comentario:</strong> ${ultimaFoto.comments}</p>`
      : "";

    bloque.innerHTML = `${fecha}${comentario}`;

    const botonVer = crearBoton(
      "boton-ver-foto-access",
      ultimaFoto.photoLink,
      '<span aria-hidden="true">🖼️</span> Ver última foto',
      "Ver la última foto del acceso"
    );

    bloque.appendChild(botonVer);
    contenedor.parentNode.insertBefore(bloque, contenedor);
  }

  if (typeof mapa === "undefined" || !mapa || typeof mapa.on !== "function") {
    console.error(
      "foto-access-addon.js: no se encontro el mapa. " +
      "El archivo debe cargarse despues de app.js."
    );
    return;
  }

  mapa.on("popupopen", agregarContenidoAlPopup);
  cargarFotosAccess();
  console.log("Fotos e historial de Access habilitados correctamente.");
})();
