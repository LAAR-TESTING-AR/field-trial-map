console.log("app.js iniciado correctamente");

const mapa = L.map("mapa").setView([-34.5, -63.0], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

const capaMarcadores = L.layerGroup().addTo(mapa);

const busqueda = document.getElementById("busqueda");
const filtroCultivo = document.getElementById("filtroCultivo");
const filtroRegion = document.getElementById("filtroRegion");
const filtroLocalidad = document.getElementById("filtroLocalidad");
const filtroFTS = document.getElementById("filtroFTS");
const limpiarFiltros = document.getElementById("limpiarFiltros");
const contadorSitios = document.getElementById("contadorSitios");

let sitios = [];
let contenidoLeyenda = null;

const limpiarTexto = valor => String(valor ?? "").trim();

function escaparHTML(valor) {
  return limpiarTexto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function convertirNumero(valor) {
  let texto = limpiarTexto(valor).replace(/\s/g, "");

  if (!texto) {
    return NaN;
  }

  if (texto.includes(",") && !texto.includes(".")) {
    texto = texto.replace(",", ".");
  }

  return Number(texto);
}

function esVisible(sitio) {
  const valoresVisibles = [
    "yes",
    "si",
    "sí",
    "true",
    "1",
    "visible"
  ];

  return valoresVisibles.includes(
    limpiarTexto(sitio.visible).toLowerCase()
  );
}

function transformarFila(fila) {
  return {
    aoiId: limpiarTexto(fila["AOI ID"]),
    location: limpiarTexto(fila["Location"]),
    operations: limpiarTexto(fila["Operations"]),
    crop: limpiarTexto(fila["Crop"]),
    season: limpiarTexto(fila["Season"]),
    station: limpiarTexto(fila["Station"]),
    province: limpiarTexto(fila["Province"]),
    region: limpiarTexto(fila["Region"]),
    latitude: convertirNumero(fila["Latitude"]),
    longitude: convertirNumero(fila["Longitude"]),
    plots: limpiarTexto(fila["Number of plots SPD"]),
    laarStatus: limpiarTexto(fila["LAAR Status 2026-2027"]),
    plantingDate: limpiarTexto(
      fila["Planting Date (MM/DD/YYYY)"]
    ),
    previousCrop: limpiarTexto(fila["Previous Crop"]),
    plantDensity: limpiarTexto(
      fila["Plant Density (plants/ha)"]
    ),
    fertilization: limpiarTexto(fila["Fertilization"]),
    area: limpiarTexto(fila["Area ( Ha)"]),
    fts: limpiarTexto(fila["Field Testing Specialist"]),
    spa: limpiarTexto(fila["Seed Product Agronomist"]),
    visible: limpiarTexto(fila["Visible"])
  };
}

function valoresUnicos(campo) {
  return [
    ...new Set(
      sitios
        .filter(esVisible)
        .map(sitio => limpiarTexto(sitio[campo]))
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, "es", {
      sensitivity: "base"
    })
  );
}

function completarFiltro(elemento, valores) {
  while (elemento.options.length > 1) {
    elemento.remove(1);
  }

  valores.forEach(valor => {
    const opcion = document.createElement("option");

    opcion.value = valor;
    opcion.textContent = valor;

    elemento.appendChild(opcion);
  });
}

function completarFiltros() {
  completarFiltro(
    filtroCultivo,
    valoresUnicos("crop")
  );

  completarFiltro(
    filtroRegion,
    valoresUnicos("region")
  );

  completarFiltro(
    filtroLocalidad,
    valoresUnicos("location")
  );

  completarFiltro(
    filtroFTS,
    valoresUnicos("fts")
  );
}

function coincideConFiltros(sitio) {
  const textoBuscado = limpiarTexto(busqueda.value).toLowerCase();

  const contenidoBuscable = [
    sitio.location,
    sitio.region,
    sitio.province,
    sitio.fts,
    sitio.spa,
    sitio.aoiId,
    sitio.operations,
    sitio.crop
  ]
    .join(" ")
    .toLowerCase();

  return (
    esVisible(sitio) &&
    (!textoBuscado ||
      contenidoBuscable.includes(textoBuscado)) &&
    (!filtroCultivo.value ||
      sitio.crop === filtroCultivo.value) &&
    (!filtroRegion.value ||
      sitio.region === filtroRegion.value) &&
    (!filtroLocalidad.value ||
      sitio.location === filtroLocalidad.value) &&
    (!filtroFTS.value ||
      sitio.fts === filtroFTS.value)
  );
}

function configuracionCultivo(cultivo) {
  const nombre = limpiarTexto(cultivo).toLowerCase();

  const parent = nombre.includes("parent chr");
  const stewarded = nombre.includes("stewarded");
  const regulated = nombre.includes("regulated");

  let tipo = "otro";
  let icono = "📍";

  if (nombre.startsWith("canola")) {
    tipo = "canola";
    icono = "🌼";
  } else if (nombre.startsWith("corn")) {
    tipo = "corn";
    icono = "🌽";
  } else if (nombre.startsWith("mustard")) {
    tipo = "mustard";
    icono = "🌿";
  } else if (nombre.startsWith("soybean")) {
    tipo = "soybean";
    icono = "🌱";
  } else if (nombre.startsWith("sunflower")) {
    tipo = "sunflower";
    icono = "🌻";
  }

  let claseEstado = "estado-estandar";

  if (stewarded) {
    claseEstado = "estado-stewarded";
  }

  if (regulated) {
    claseEstado = "estado-regulated";
  }

  return {
    tipo,
    icono,
    parent,
    claseEstado
  };
}

function contenidoMarcador(cultivo, modoLeyenda = false) {
  const configuracion = configuracionCultivo(cultivo);

  const insigniaPC = configuracion.parent
    ? `
      <span class="insignia-pc${
        modoLeyenda ? " leyenda-pc" : ""
      }">
        PC
      </span>
    `
    : "";

  return `
    <span
      class="${
        modoLeyenda
          ? "muestra-leyenda"
          : "marcador-cultivo"
      } cultivo-${configuracion.tipo} ${configuracion.claseEstado}"
    >
      <span class="icono-cultivo">
        ${configuracion.icono}
      </span>
      ${insigniaPC}
    </span>
  `;
}

function crearIconoCultivo(cultivo) {
  return L.divIcon({
    className: "marcador-cultivo-contenedor",
    html: contenidoMarcador(cultivo),
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -43]
  });
}

function linea(etiqueta, valor, sufijo = "") {
  const contenido = limpiarTexto(valor);

  if (!contenido) {
    return "";
  }

  return `
    <p>
      <strong>${escaparHTML(etiqueta)}:</strong>
      ${escaparHTML(contenido)}${escaparHTML(sufijo)}
    </p>
  `;
}

function crearPopup(sitio) {
  const googleMaps =
    `https://www.google.com/maps/dir/?api=1&destination=` +
    `${sitio.latitude},${sitio.longitude}`;

  const waze =
    `https://waze.com/ul?ll=` +
    `${sitio.latitude},${sitio.longitude}` +
    `&navigate=yes`;

  return `
    <div class="popup-sitio">
      <h2>${escaparHTML(sitio.location)}</h2>

      <div class="popup-detalles">
        ${linea("AOI ID", sitio.aoiId)}
        ${linea("Operación", sitio.operations)}
        ${linea("Cultivo", sitio.crop)}
        ${linea("Temporada", sitio.season)}
        ${linea("Estación", sitio.station)}
        ${linea("Provincia", sitio.province)}
        ${linea("Región", sitio.region)}

        ${linea(
          "Field Testing Specialist",
          sitio.fts
        )}

        ${linea(
          "Seed Product Agronomist",
          sitio.spa
        )}

        ${linea(
          "Número de plots SPD",
          sitio.plots
        )}

        ${linea(
          "Estado LAAR 2026-2027",
          sitio.laarStatus
        )}

        ${linea(
          "Fecha de siembra",
          
