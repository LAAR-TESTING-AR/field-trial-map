(function () {
  "use strict";

  const FORM_BASE_URL = "https://forms.cloud.microsoft/Pages/ResponsePage.aspx";
  const FORM_ID = "suwgPrCc8U2te5FOMdzdpCxUfKtsO4dHmIGDSDmC5vdUOUg2SDZZSUdHTEJUVUE0MkxKRE9WVklFVi4u";
  const ACCESS_ID_FIELD = "r7a72e2f762b74f7099bc3df7da194874";
  const LOCATION_FIELD = "r845419d35b094ab9a8c5d4752ee6b234";
  const ARCHIVO_FOTOS = "AccessPhotos.csv";

  let fotosAccess = [];
  let fotosCargadas = false;

  const limpiar = valor => String(valor ?? "").trim();
  const normalizarId = valor => limpiar(valor).toLowerCase();

  function limpiarValorFormulario(valor) {
    return limpiar(valor).replaceAll("+", " ").replaceAll("%20", " ");
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

  function formatearFecha(valor) {
    const fecha = convertirFecha(valor);
    if (!fecha) return limpiar(valor);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
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

  function obtenerUltimaFoto(accessId) {
    return fotosAccess
      .filter(foto => normalizarId(foto.accessId) === normalizarId(accessId))
      .sort((a, b) => {
        const fa = convertirFecha(a.captureDate);
        const fb = convertirFecha(b.captureDate);
        return (fb ? fb.getTime() : 0) - (fa ? fa.getTime() : 0);
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
    const botones = popup?.querySelector(".botones-navegacion");
    if (!popup || !botones) return;

    if (!popup.querySelector(".boton-foto-access")) {
      botones.insertBefore(crearBoton(
        "boton-foto-access",
        construirUrlFormulario(sitio),
        '<span aria-hidden="true">📷</span> Cargar foto',
        "Cargar una foto del acceso"
      ), botones.firstChild);
    }

    popup.querySelector(".ultima-foto-access")?.remove();
    const ultimaFoto = obtenerUltimaFoto(sitio.aoiId);

    if (!ultimaFoto) {
      if (!fotosCargadas) {
        const estado = document.createElement("div");
        estado.className = "ultima-foto-access estado-foto-access";
        estado.textContent = "Buscando última foto...";
        botones.parentNode.insertBefore(estado, botones);
      }
      return;
    }

    const bloque = document.createElement("div");
    bloque.className = "ultima-foto-access";

    const comentario = ultimaFoto.comments
  ? `<p><strong>Comentario:</strong> ${ultimaFoto.comments}</p>`
  : "";

bloque.innerHTML = comentario;


    const enlaceMiniatura = document.createElement("a");
    enlaceMiniatura.className = "enlace-miniatura-access";
    enlaceMiniatura.href = ultimaFoto.photoLink;
    enlaceMiniatura.target = "_blank";
    enlaceMiniatura.rel = "noopener noreferrer";
    enlaceMiniatura.setAttribute("aria-label", "Abrir la última foto del acceso");

    const miniatura = document.createElement("img");
    miniatura.className = "miniatura-access";
    miniatura.src = ultimaFoto.photoLink;
    miniatura.alt = `Última foto del acceso ${limpiar(sitio.location)}`;
    miniatura.loading = "lazy";

    miniatura.addEventListener("error", () => {
      enlaceMiniatura.remove();
      bloque.classList.add("sin-miniatura");
    });

    enlaceMiniatura.appendChild(miniatura);
    bloque.appendChild(enlaceMiniatura);
    const filaFotos = document.createElement("div");
filaFotos.className = "fila-botones-foto";

filaFotos.appendChild(
  crearBoton(
    "boton-ver-foto-access",
    ultimaFoto.photoLink,
    '<span aria-hidden="true">🖼️</span> Ver foto',
    "Ver foto"
  )
);

filaFotos.appendChild(
  crearBoton(
    "boton-foto-access",
    construirUrlFormulario(sitio),
    '<span aria-hidden="true">📷</span> Cargar foto',
    "Cargar foto"
  )
);

bloque.appendChild(filaFotos);
      '<span aria-hidden="true">🖼️</span> Ver foto'
      "Ver la última foto del acceso en tamaño completo"
    ));

    botones.parentNode.insertBefore(bloque, botones);
  }

  function cargarFotosAccess() {
    Papa.parse(`${ARCHIVO_FOTOS}?v=${Date.now()}`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.replace(/^\uFEFF/, "").trim(),
      complete: resultado => {
        fotosAccess = resultado.data.map(transformarFoto)
          .filter(foto => foto.accessId && foto.photoLink);
        fotosCargadas = true;
        if (mapa._popup) agregarContenidoAlPopup({ popup: mapa._popup });
      },
      error: error => {
        fotosCargadas = true;
        console.error("No fue posible cargar AccessPhotos.csv:", error);
      }
    });
  }

  if (typeof mapa === "undefined" || !mapa?.on) {
    console.error("foto-access-addon.js debe cargarse después de app.js.");
    return;
  }

  mapa.on("popupopen", agregarContenidoAlPopup);
  cargarFotosAccess();
})();
