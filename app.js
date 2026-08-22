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
  return ["yes", "si", "sí", "true", "1", "visible"].includes(
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
  const buscable = [sitio.location, sitio.region, sitio.province, sitio.fts, sitio.spa, sitio.aoiId]
    .join(" ").toLowerCase();

  return esVisible(sitio)
    && (!q || buscable.includes(q))
    && (!filtroCultivo.value || sitio.crop === filtroCultivo.value)
    && (!filtroRegion.value || sitio.region === filtroRegion.value)
    && (!filtroLocalidad.value || sitio.location === filtroLocalidad.value);
}

function configuracionCultivo(cultivo) {
  const nombre = limpiarTexto(cultivo).toLowerCase();
  const parent = nombre.includes("parent chr");
  const stewarded = nombre.includes("stewarded");
  const regulated = nombre.includes("regulated");

  let tipo = "otro";
  let icono = "📍";
  let etiqueta = cultivo || "Otro";

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
  if (stewarded) claseEstado = "estado-stewarded";
  if (regulated) claseEstado = "estado-regulated";

  return { tipo, icono, etiqueta, parent, claseEstado };
}

function crearIconoCultivo(cultivo) {
  const cfg = configuracionCultivo(cultivo);
  const insignia = cfg.parent ? '<span class="insignia-pc">PC</span>' : "";

  return L.divIcon({
    className: "marcador-cultivo-contenedor",
    html: `
      <div class="marcador-cultivo cultivo-${cfg.tipo} ${cfg.claseEstado}" title="${escaparHTML(cfg.etiqueta)}">
        <span class="icono-cultivo">${cfg.icono}</span>
        ${insignia}
      </div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -43]
  });
}

function linea(etiqueta, valor) {
  const contenido = limpiarTexto(valor);
  return contenido
    ? `<p><strong>${escaparHTML(etiqueta)}:</strong> ${escaparHTML(contenido)}</p>`
    : "";
}

function crearPopup(sitio) {
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${sitio.latitude},${sitio.longitude}`;
  const waze = `https://waze.com/ul?ll=${sitio.latitude},${sitio.longitude}&navigate=yes`;

  return `
    <h2>${escaparHTML(sitio.location)}</h2>
    ${linea("Cultivo", sitio.crop)}
    ${linea("Temporada", sitio.season)}
    ${linea("Provincia", sitio.province)}
    ${linea("Región", sitio.region)}
    ${linea("Estación", sitio.station)}
    ${linea("FTS", sitio.fts)}
    ${linea("SPA", sitio.spa)}
    ${linea("Fecha de siembra", sitio.plantingDate)}
    ${linea("Estado LAAR", sitio.laarStatus)}
    ${linea("Cultivo antecesor", sitio.previousCrop)}
    ${linea("Densidad", sitio.plantDensity)}
    ${linea("Área", sitio.area ? `${sitio.area} ha` : "")}
    <div class="botones-navegacion">
      <a class="boton-mapa" href="${gmaps}" target="_blank" rel="noopener noreferrer">Google Maps</a>
      <a class="boton-waze" href="${waze}" target="_blank" rel="noopener noreferrer">Waze</a>
    </div>`;
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

function crearMuestraLeyenda(cultivo, texto) {
  const cfg = configuracionCultivo(cultivo);
  const pc = cfg.parent ? '<span class="insignia-pc leyenda-pc">PC</span>' : "";
  return `
    <div class="item-leyenda">
      <span class="muestra-leyenda cultivo-${cfg.tipo} ${cfg.claseEstado}">
        <span>${cfg.icono}</span>${pc}
      </span>
      <span>${texto}</span>
    </div>`;
}

function agregarLeyenda() {
  const control = L.control({ position: "bottomright" });

  control.onAdd = function () {
    const div = L.DomUtil.create("div", "leyenda-mapa");
    div.innerHTML = `
      <button class="boton-leyenda" type="button" aria-expanded="true">Leyenda</button>
      <div class="contenido-leyenda">
        <h4>Cultivos</h4>
        ${crearMuestraLeyenda("Canola", "Canola")}
        ${crearMuestraLeyenda("Corn", "Corn")}
        ${crearMuestraLeyenda("Mustard", "Mustard")}
        ${crearMuestraLeyenda("Soybean", "Soybean")}
        ${crearMuestraLeyenda("Sunflower", "Sunflower")}
        <h4>Clasificación</h4>
        <div class="item-leyenda">
          <span class="muestra-clasificacion muestra-parent">PC</span>
          <span>Parent Chr: ícono del cultivo + PC</span>
        </div>
        <div class="item-leyenda">
          <span class="muestra-clasificacion muestra-stewarded"></span>
          <span>Stewarded: fondo violeta</span>
        </div>
        <div class="item-leyenda">
          <span class="muestra-clasificacion muestra-regulated"></span>
          <span>Regulated: fondo verde</span>
        </div>
      </div>`;

    L.DomEvent.disableClickPropagation(div);
    const boton = div.querySelector(".boton-leyenda");
    const contenido = div.querySelector(".contenido-leyenda");

    boton.addEventListener("click", () => {
      const abierta = !contenido.classList.contains("oculta");
      contenido.classList.toggle("oculta", abierta);
      boton.setAttribute("aria-expanded", String(!abierta));
    });

    return div;
  };

  control.addTo(mapa);
}

function cargarSitios() {
  Papa.parse("Sitios.csv?v=7", {
    download: true,
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.replace(/^\uFEFF/, "").trim(),
    complete: resultado => {
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

[filtroCultivo, filtroRegion, filtroLocalidad].forEach(control =>
  control.addEventListener("change", actualizarMapa)
);

busqueda.addEventListener("input", actualizarMapa);
limpiarFiltros.addEventListener("click", () => {
  busqueda.value = "";
  filtroCultivo.value = "";
  filtroRegion.value = "";
  filtroLocalidad.value = "";
  actualizarMapa();
});

agregarLeyenda();
cargarSitios();
