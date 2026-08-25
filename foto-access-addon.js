(function () {
  "use strict";

  const FORM_BASE_URL = "https://forms.cloud.microsoft/Pages/ResponsePage.aspx";
  const FORM_ID = "suwgPrCc8U2te5FOMdzdpCxUfKtsO4dHmIGDSDmC5vdUOUg2SDZZSUdHTEJUVUE0MkxKRE9WVklFVi4u";
  const ACCESS_ID_FIELD = "r7a72e2f762b74f7099bc3df7da194874";
  const LOCATION_FIELD = "r845419d35b094ab9a8c5d4752ee6b234";
  const ARCHIVO_FOTOS = "AccessPhotos.csv";

  let fotosAccess = [];

  const limpiar = valor => String(valor ?? "").trim();
  const normalizarId = valor => limpiar(valor).toLowerCase();

  function limpiarValorFormulario(valor) {
    return limpiar(valor).replaceAll("+", " ").replaceAll("%20", " ");
  }

  function escaparHTML(valor) {
    return limpiar(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function construirUrlFormulario(sitio) {
    return FORM_BASE_URL
      + "?id=" + FORM_ID
      + "&" + ACCESS_ID_FIELD + "=" + limpiarValorFormulario(sitio.aoiId)
      + "&" + LOCATION_FIELD + "=" + limpiarValorFormulario(sitio.location);
  }

  function extraerUrl(valor) {
    const texto = limpiar(valor);
    if (!texto) return "";
    if (/^https?:\/\//i.test(texto)) return texto;

    try {
      const objeto = JSON.parse(texto);
      if (typeof objeto === "string") return objeto;
      if (objeto?.Url) return objeto.Url;
      if (objeto?.url) return objeto.url;
      if (objeto?.link) return objeto.link;
    } catch (_) {}

    const coincidencia = texto.match(/https?:\/\/[^\s"']+/i);
    return coincidencia ? coincidencia[0] : "";
  }

  function convertirFecha(valor) {
    const fecha = new Date(limpiar(valor));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  function transformarFoto(fila) {
    return {
      accessId: limpiar(fila.AccessID),
      comments: limpiar(fila.Comments),
      publicPhotoUrl: extraerUrl(fila.PublicPhotoUrl),
      corporatePhotoUrl: extraerUrl(fila.PhotoLink),
      captureDate: limpiar(fila.CaptureDate)
    };
  }

  function obtenerUltimaFoto(accessId) {
    return fotosAccess
      .filter(foto => normalizarId(foto.accessId) === normalizarId(accessId))
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
    const navegacion = popup?.querySelector(".botones-navegacion");
    if (!popup || !navegacion) return;

    popup.querySelector(".bloque-fotos-access")?.remove();
    navegacion.querySelectorAll(".boton-foto-access, .boton-ver-foto-access")
      .forEach(boton => boton.remove());

    const bloque = document.createElement("div");
    bloque.className = "bloque-fotos-access";

    const ultimaFoto = obtenerUltimaFoto(sitio.aoiId);
    const urlFoto = ultimaFoto?.publicPhotoUrl || ultimaFoto?.corporatePhotoUrl || "";

    if (ultimaFoto?.comments) {
      const comentario = document.createElement("p");
      comentario.className = "comentario-foto-access";
      comentario.innerHTML = `<strong>Comentario:</strong> ${escaparHTML(ultimaFoto.comments)}`;
      bloque.appendChild(comentario);
    }

    if (ultimaFoto?.publicPhotoUrl) {
      const enlaceMiniatura = document.createElement("a");
      enlaceMiniatura.className = "enlace-miniatura-access";
      enlaceMiniatura.href = ultimaFoto.publicPhotoUrl;
      enlaceMiniatura.target = "_blank";
      enlaceMiniatura.rel = "noopener noreferrer";
      enlaceMiniatura.setAttribute("aria-label", "Abrir foto completa del acceso");

      const miniatura = document.createElement("img");
      miniatura.className = "miniatura-access";
      miniatura.src = ultimaFoto.publicPhotoUrl;
      miniatura.alt = `Foto del acceso ${limpiar(sitio.location)}`;
      miniatura.loading = "lazy";

      miniatura.addEventListener("error", () => {
        enlaceMiniatura.remove();
      });

      enlaceMiniatura.appendChild(miniatura);
      bloque.appendChild(enlaceMiniatura);
    }

    const fila = document.createElement("div");
    fila.className = "fila-botones-foto";

    if (urlFoto) {
      fila.appendChild(crearBoton(
        "boton-ver-foto-access",
        urlFoto,
        '<span aria-hidden="true">🖼️</span> Ver foto',
        "Ver foto del acceso"
      ));
    }

    fila.appendChild(crearBoton(
      "boton-foto-access",
      construirUrlFormulario(sitio),
      '<span aria-hidden="true">📷</span> Cargar foto',
      "Cargar foto del acceso"
    ));

    bloque.appendChild(fila);
    navegacion.parentNode.insertBefore(bloque, navegacion);
  }

  function cargarFotosAccess() {
    if (typeof Papa === "undefined") {
      console.error("Papa Parse no esta disponible.");
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
          .filter(foto => foto.accessId && (foto.publicPhotoUrl || foto.corporatePhotoUrl));

        if (mapa._popup) agregarContenidoAlPopup({ popup: mapa._popup });
        console.log(`${fotosAccess.length} fotos de Access cargadas.`);
      },
      error: error => {
        console.error("No fue posible cargar AccessPhotos.csv:", error);
      }
    });
  }

  if (typeof mapa === "undefined" || !mapa?.on) {
    console.error("foto-access-addon.js debe cargarse despues de app.js.");
    return;
  }

  mapa.on("popupopen", evento => {
    agregarContenidoAlPopup(evento);
    window.setTimeout(() => agregarContenidoAlPopup(evento), 100);
  });

  cargarFotosAccess();
  console.log("Miniaturas publicas de Access habilitadas.");
})();
