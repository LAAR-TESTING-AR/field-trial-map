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
const limpiarFiltros = document.getElementById("limpiarFiltros");
const contadorSitios = document.getElementById("contadorSitios");
let sitios = [];

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
  if (!texto) return NaN;
  if (texto.includes(",") && !texto.includes(".")) texto = texto.replace(",", ".");
  return Number(texto);
}
function esVisible(sitio) {
  return ["yes", "si", "sí", "true", "1", "visible"].includes(limpiarTexto(sitio.visible).toLowerCase());
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
    plantingDate: limpiarTexto(fila["Planting Date (MM/DD/YYYY)"]),
    previousCrop: limpiarTexto(fila["Previous Crop"]),
    plantDensity: limpiarTexto(fila["Plant Density (plants/ha)"]),
    fertilization: limpiarTexto(fila["Fertilization"]),
    area: limpiarTexto(fila["Area ( Ha)"]),
    fts: limpiarTexto(fila["Field Testing Specialist"]),
    spa: limpiarTexto(fila["Seed Product Agronomist"]),
    visible: limpiarTexto(fila["Visible"])
  };
}
function valoresUnicos(campo) {
  return [...new Set(sitios.filter(esVisible).map(s => limpiarTexto(s[campo])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}
function completarFiltro(elemento, valores) {
  while (elemento.options.length > 1) elemento.remove(1);
  valores.forEach(valor => {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = valor;
    elemento.appendChild(opcion);
  });
}
function completarFiltros() {
  completarFiltro(filtroCultivo, valoresUnicos("crop"));
  completarFiltro(filtroRegion, valoresUnicos("region"));
  completarFiltro(filtroLocalidad, valoresUnicos("location"));
}
function coincideConFiltros(sitio) {
  const q = limpiarTexto(busqueda.value).toLowerCase();
  const buscable = [sitio.location, sitio.province, sitio.region, sitio.fts, sitio.spa, sitio.aoiId].join(" ").toLowerCase();
  return esVisible(sitio)
    && (!q || buscable.includes(q))
    && (!filtroCultivo.value || sitio.crop === filtroCultivo.value)
    && (!filtroRegion.value || sitio.region === filtroRegion.value)
    && (!filtroLocalidad.value || sitio.location === filtroLocalidad.value);
}
function linea(etiqueta, valor) {
  const contenido = limpiarTexto(valor);
  return contenido ? `<p><strong>${escaparHTML(etiqueta)}:</strong> ${escaparHTML(contenido)}</p>` : "";
}
function crearPopup(sitio) {
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${sitio.latitude},${sitio.longitude}`;
  const waze = `https://waze.com/ul?ll=${sitio.latitude},${sitio.longitude}&navigate=yes`;
  return `
    <h2>${escaparHTML(sitio.location)}</h2>
    ${linea("Cultivo", sitio.crop)}
    ${linea("Temporada", sitio.season)}
    ${linea("Provincia", sitio.province)}
    ${linea("Region", sitio.region)}
    ${linea("Estacion", sitio.station)}
    ${linea("FTS", sitio.fts)}
    ${linea("SPA", sitio.spa)}
    ${linea("Fecha de siembra", sitio.plantingDate)}
    ${linea("Estado LAAR", sitio.laarStatus)}
    ${linea("Cultivo antecesor", sitio.previousCrop)}
    ${linea("Densidad", sitio.plantDensity)}
    ${linea("Area", sitio.area ? `${sitio.area} ha` : "")}
    <div class="botones-navegacion">
      <a class="boton-mapa" href="${gmaps}" target="_blank" rel="noopener noreferrer">Google Maps</a>
      <a class="boton-waze" href="${waze}" target="_blank" rel="noopener noreferrer">Waze</a>
    </div>`;
}

function crearIconoCultivo(cultivo) {
  const nombre = limpiarTexto(cultivo).toLowerCase();
  let clase = "marcador-otro";
  let simbolo = "E";

  if (nombre.includes("sunflower") || nombre.includes("girasol")) {
    clase = "marcador-girasol";
    simbolo = "S";
  } else if (nombre.includes("corn") || nombre.includes("maiz") || nombre.includes("maíz")) {
    clase = "marcador-maiz";
    simbolo = "C";
  } else if (nombre.includes("soybean") || nombre.includes("soja")) {
    clase = "marcador-soja";
    simbolo = "B";
  } else if (nombre.includes("canola") || nombre.includes("colza")) {
    clase = "marcador-canola";
    simbolo = "K";
  }

  return L.divIcon({
    className: "marcador-cultivo-contenedor",
    html: `<div class="marcador-cultivo ${clase}" title="${escaparHTML(cultivo)}">${simbolo}</div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -36]
  });
}

function actualizarMapa() {
  capaMarcadores.clearLayers();
  const coordenadas = [];
  sitios.filter(coincideConFiltros).forEach(sitio => {
    if (!Number.isFinite(sitio.latitude) || !Number.isFinite(sitio.longitude)) return;
    L.marker([sitio.latitude, sitio.longitude], { icon: crearIconoCultivo(sitio.crop) })
      .bindPopup(crearPopup(sitio))
      .addTo(capaMarcadores);
    coordenadas.push([sitio.latitude, sitio.longitude]);
  });
  contadorSitios.textContent = `${coordenadas.length} sitios visibles`;
  if (coordenadas.length) mapa.fitBounds(coordenadas, { padding: [30, 30], maxZoom: 10 });
}
function cargarSitios() {
  console.log("Intentando cargar Sitios.csv");
  Papa.parse("Sitios.csv?v=5", {
    download: true,
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.replace(/^\uFEFF/, "").trim(),
    complete: resultado => {
      console.log("Filas leidas:", resultado.data.length);
      sitios = resultado.data.map(transformarFila).filter(s => s.location);
      completarFiltros();
      actualizarMapa();
      if (resultado.errors.length) console.warn("Advertencias CSV:", resultado.errors);
    },
    error: error => {
      console.error("Error al cargar Sitios.csv:", error);
      contadorSitios.textContent = "No fue posible cargar los sitios.";
    }
  });
}
[filtroCultivo, filtroRegion, filtroLocalidad].forEach(c => c.addEventListener("change", actualizarMapa));
busqueda.addEventListener("input", actualizarMapa);
limpiarFiltros.addEventListener("click", () => {
  busqueda.value = "";
  filtroCultivo.value = "";
  filtroRegion.value = "";
  filtroLocalidad.value = "";
  actualizarMapa();
});

cargarSitios();
