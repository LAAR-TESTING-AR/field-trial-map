console.log("app.js v10 - modelo unificado Trial + Access");

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
const vistaMaster = document.getElementById("vistaMaster");
const vistaSiembra = document.getElementById("vistaSiembra");
const vistaCosecha = document.getElementById("vistaCosecha");

window.vistaMapaActual = "master";
let sitios = [];
let contenidoLeyenda = null;
let panelLeyenda = null;
let botonLeyenda = null;

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

function tieneTrial(sitio) {
  return Number.isFinite(sitio.latitudeTrial) && Number.isFinite(sitio.longitudeTrial);
}

function tieneAccess(sitio) {
  return Number.isFinite(sitio.latitudeAccess) && Number.isFinite(sitio.longitudeAccess);
}

function estaSembrado(sitio) {
  return Boolean(
    limpiarTexto(sitio.plantingDate)
  );
}

function esDrop(sitio) {
  return String(
    sitio.description || ""
  )
    .toLowerCase()
    .includes("drop");
}

function esDrop(sitio) {
  return limpiarTexto(
    sitio.description
  )
    .toLowerCase()
    .includes("drop");
}

function transformarFila(fila) {
  return {
    aoiId: limpiarTexto(fila["AOI ID"]),
    location: limpiarTexto(fila["Location"]),
    operations: limpiarTexto(fila["Operations"]),
    crop: limpiarTexto(fila["Crop"]),
    laarStatus: limpiarTexto(fila["LAAR Status 2026-2027"]),
    season: limpiarTexto(fila["Season"]),
    station: limpiarTexto(fila["Station"]),
    province: limpiarTexto(fila["Province"]),
    region: limpiarTexto(fila["Region"]),
    latitudeTrial: convertirNumero(fila["Latitude Trial"]),
    longitudeTrial: convertirNumero(fila["Longitude Trial"]),
    latitudeAccess: convertirNumero(fila["Latitude Access"]),
    longitudeAccess: convertirNumero(fila["Longitude Access"]),
    plantingDate: limpiarTexto(fila["Planting Date (MM/DD/YYYY)"]),
    plantDensity: limpiarTexto(fila["Plant Density (plants/ha)"]),
    fertilization: limpiarTexto(fila["Fertilization"]),
    area: limpiarTexto(fila["Area ( Ha)"]),
    fts: limpiarTexto(fila["Field Testing Specialist"]),
    spa: limpiarTexto(fila["Seed Product Agronomist"]),
    visible: limpiarTexto(fila["Visible"]),
    description: limpiarTexto(fila["Description"])
  };
}

function valoresUnicos(campo) {
  return [...new Set(
    sitios.filter(esVisible).map(s => limpiarTexto(s[campo])).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
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
  completarFiltro(filtroFTS, valoresUnicos("fts"));
}

function coincideConFiltros(sitio) {
  const q = limpiarTexto(busqueda.value).toLowerCase();
  const buscable = [
    sitio.aoiId, sitio.location, sitio.description, sitio.crop,
    sitio.region, sitio.province, sitio.fts, sitio.spa, sitio.operations
  ].join(" ").toLowerCase();

  return esVisible(sitio)
    && (!q || buscable.includes(q))
    && (!filtroCultivo.value || sitio.crop === filtroCultivo.value)
    && (!filtroRegion.value || sitio.region === filtroRegion.value)
    && (!filtroLocalidad.value || sitio.location === filtroLocalidad.value)
    && (!filtroFTS.value || sitio.fts === filtroFTS.value);
}

function configuracionCultivo(cultivo) {
  const nombre = limpiarTexto(cultivo).toLowerCase();
  const parent = nombre.includes("parent chr");
  const stewarded = nombre.includes("stewarded");
  const regulated = nombre.includes("regulated");
  let tipo = "otro";
  let icono = "📍";

  if (nombre.startsWith("canola")) { tipo = "canola"; icono = "🌼"; }
  else if (nombre.startsWith("corn")) { tipo = "corn"; icono = "🌽"; }
  else if (nombre.startsWith("mustard")) { tipo = "mustard"; icono = "🌿"; }
  else if (nombre.startsWith("soybean")) { tipo = "soybean"; icono = "🌱"; }
  else if (nombre.startsWith("sunflower")) { tipo = "sunflower"; icono = "🌻"; }

  let claseEstado = "estado-estandar";
  if (stewarded) claseEstado = "estado-stewarded";
  if (regulated) claseEstado = "estado-regulated";
  return { tipo, icono, parent, claseEstado };
}

function contenidoMarcador(cultivo, modoLeyenda = false) {
  const cfg = configuracionCultivo(cultivo);
  const pc = cfg.parent
    ? `<span class="insignia-pc${modoLeyenda ? " leyenda-pc" : ""}">PC</span>`
    : "";
  return `<span class="${modoLeyenda ? "muestra-leyenda" : "marcador-cultivo"} cultivo-${cfg.tipo} ${cfg.claseEstado}"><span class="icono-cultivo">${cfg.icono}</span>${pc}</span>`;
}

function contenidoIconoAccess(modoLeyenda = false) {
  return `<span class="${modoLeyenda ? "muestra-access-leyenda" : "marcador-access"}" aria-hidden="true"><span class="pin-access-cabeza"></span><span class="pin-access-punta"></span></span>`;
}

function crearIconoTrial(cultivo,sitio) {
  return L.divIcon({
    className: "marcador-cultivo-contenedor",
    html: contenidoMarcador(cultivo),
    iconSize: [38, 46], iconAnchor: [19, 46], popupAnchor: [0, -43]
  });
}

function crearIconoAccess() {
  return L.divIcon({
    className: "marcador-access-contenedor",
    html: contenidoIconoAccess(false),
    iconSize: [34, 46], iconAnchor: [17, 46], popupAnchor: [0, -43]
  });
}
function crearIconoSiembra(sembrado) {

  return L.divIcon({
    className: "marcador-cultivo-contenedor",

    html: sembrado
      ? `
        <span class="marcador-siembra sembrado">
          ✅
        </span>
      `
      : `
        <span class="marcador-siembra pendiente">
          ⚪
        </span>
      `,

    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -43]
  });
}

function crearIconoDrop(cultivo) {

  const cfg =
    configuracionCultivo(cultivo);

  return L.divIcon({
    className: "marcador-drop-contenedor",

    html: `
      <span class="marcador-drop cultivo-${cfg.tipo}">
        <span class="icono-drop-cultivo">
          ${cfg.icono}
        </span>

        <span class="equis-drop">
          ×
        </span>
      </span>
    `,

    iconSize: [42, 48],
    iconAnchor: [21, 48],
    popupAnchor: [0, -45]
  });
}

function linea(etiqueta, valor, sufijo = "") {
  const contenido = limpiarTexto(valor);
  return contenido
    ? `<p><strong>${escaparHTML(etiqueta)}:</strong> ${escaparHTML(contenido)}${escaparHTML(sufijo)}</p>`
    : "";
}

function enlacesNavegacion(latitude, longitude) {
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
  };
}

function crearPopupTrial(sitio) {
  const lat = sitio.latitudeTrial;
  const lon = sitio.longitudeTrial;
  const { googleMaps, waze } = enlacesNavegacion(lat, lon);

  return `<div class="popup-sitio popup-trial">
    <h2>${escaparHTML(sitio.location)}</h2>
    <div class="popup-detalles">
      ${linea("AOI ID", sitio.aoiId)}
      ${linea("Operación", sitio.operations)}
      ${linea("Cultivo", sitio.crop)}
      ${linea("Estado LAAR 2026-2027", sitio.laarStatus)}
      ${linea("Provincia", sitio.province)}
      ${linea("Región", sitio.region)}
      ${linea("FTS", sitio.fts)}
      ${linea("SPA", sitio.spa)}
      ${linea("Fecha de siembra", sitio.plantingDate)}
      ${linea("Densidad de plantas", sitio.plantDensity, sitio.plantDensity ? " plantas/ha" : "")}
      ${linea("Fertilización", sitio.fertilization)}
      ${linea("Área", sitio.area, sitio.area ? " ha" : "")}
      ${linea("Latitud", lat)}
      ${linea("Longitud", lon)}
    </div>
    <div class="botones-navegacion">
      <a class="boton-mapa" href="${googleMaps}" target="_blank" rel="noopener noreferrer">Google Maps</a>
      <a class="boton-waze" href="${waze}" target="_blank" rel="noopener noreferrer">Waze</a>
    </div>
  </div>`;
}

function crearPopupAccess(sitioAccess) {
  const lat = sitioAccess.latitudeAccess;
  const lon = sitioAccess.longitudeAccess;
  const { googleMaps, waze } = enlacesNavegacion(lat, lon);

  return `<div class="popup-sitio popup-access">
    <h2>${escaparHTML(sitioAccess.location)}</h2>
    <div class="popup-detalles">
      ${linea("Tipo", "Bajada de ruta")}
      ${linea("Descripción", sitioAccess.description)}
      ${linea("Provincia", sitioAccess.province)}
      ${linea("Región", sitioAccess.region)}
      ${linea("Latitud", lat)}
      ${linea("Longitud", lon)}
    </div>
    <div class="botones-navegacion">
      <a class="boton-mapa" href="${googleMaps}" target="_blank" rel="noopener noreferrer">Google Maps</a>
      <a class="boton-waze" href="${waze}" target="_blank" rel="noopener noreferrer">Waze</a>
    </div>
  </div>`;
}

function ocultarLeyenda() {
  if (!panelLeyenda || !botonLeyenda) return;
  panelLeyenda.classList.remove("visible");
  botonLeyenda.classList.remove("activo");
  botonLeyenda.setAttribute("aria-expanded", "false");
  botonLeyenda.setAttribute("aria-label", "Mostrar leyenda");
  botonLeyenda.title = "Mostrar leyenda";
}

function alternarLeyenda() {
  if (!panelLeyenda || !botonLeyenda) return;
  const mostrar = !panelLeyenda.classList.contains("visible");
  panelLeyenda.classList.toggle("visible", mostrar);
  botonLeyenda.classList.toggle("activo", mostrar);
  botonLeyenda.setAttribute("aria-expanded", String(mostrar));
  botonLeyenda.setAttribute("aria-label", mostrar ? "Ocultar leyenda" : "Mostrar leyenda");
  botonLeyenda.title = mostrar ? "Ocultar leyenda" : "Mostrar leyenda";
}

function actualizarLeyenda(sitiosFiltrados) {

  if (!contenidoLeyenda) return;

  if (window.vistaMapaActual === "planting") {

    contenidoLeyenda.innerHTML = `
      <div class="item-leyenda">
        <span class="muestra-siembra sembrado">✅</span>
        <span>Sembrado</span>
      </div>

      <div class="item-leyenda">
        <span class="muestra-siembra pendiente">⚪</span>
        <span>Pendiente</span>
      </div>

      <div class="item-leyenda item-leyenda-drop">
        <span class="muestra-drop-leyenda">
          <span>×</span>
        </span>
        <span>Trial Drop - No visitar</span>
      </div>
    `;

    return;
  }

  if (window.vistaMapaActual === "harvest") {

    contenidoLeyenda.innerHTML = `
      <div class="item-leyenda">
        <span class="muestra-cosecha cosechado">🟤</span>
        <span>Cosechado</span>
      </div>

      <div class="item-leyenda">
        <span class="muestra-cosecha pendiente">⚪</span>
        <span>Pendiente</span>
      </div>

      <div class="item-leyenda item-leyenda-drop">
        <span class="muestra-drop-leyenda">
          <span>×</span>
        </span>
        <span>Trial Drop - No visitar</span>
      </div>
    `;

    return;
  }

  const cultivos = [...new Set(
    sitiosFiltrados
      .filter(tieneTrial)
      .map(s => limpiarTexto(s.crop))
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(
      b,
      "es",
      { sensitivity: "base" }
    )
  );

  const hayAccess =
    sitiosFiltrados.some(tieneAccess);

  let html = cultivos.map(cultivo =>
    `<div class="item-leyenda">
        ${contenidoMarcador(cultivo, true)}
        <span>${escaparHTML(cultivo)}</span>
     </div>`
  ).join("");

  if (hayAccess) {
    html += `
      <div class="item-leyenda item-leyenda-access">
        ${contenidoIconoAccess(true)}
        <span>Bajada de ruta / Access</span>
      </div>
    `;
  }

  html += `
    <div class="item-leyenda item-leyenda-drop">
      <span class="muestra-drop-leyenda">
        <span>×</span>
      </span>
      <span>Trial Drop - No visitar</span>
    </div>
  `;

  contenidoLeyenda.innerHTML =
    html ||
    '<p class="leyenda-vacia">No hay elementos para los filtros seleccionados.</p>';
}

function actualizarMapa() {
  capaMarcadores.clearLayers();
  const sitiosFiltrados = sitios.filter(coincideConFiltros);
  const coordenadas = [];
  let cantidadTrials = 0;
  let cantidadAccess = 0;

  sitiosFiltrados.forEach(sitio => {
    if (tieneTrial(sitio)) {

  const esDrop =
  String(sitio.description || "")
    .toLowerCase()
    .includes("drop");

const iconoTrial =
  String(sitio.description || "")
  .toLowerCase()
  .includes("drop")

    ? crearIconoDrop(
        sitio.crop
      )

    : (

        vistaMapaActual ===
        "planting"

          ? crearIconoSiembra(
              estaSembrado(sitio)
            )

          : crearIconoTrial(
              sitio.crop
            )

      );

  L.marker(
    [sitio.latitudeTrial, sitio.longitudeTrial],
    {
      icon: iconoTrial
    }
  )
        .bindPopup(crearPopupTrial(sitio), {
  maxWidth: 390,
  minWidth: 285,
  maxHeight: 700,
  autoPan: true,
  autoPanPadding: [50, 120]
})
        .addTo(capaMarcadores);
      coordenadas.push([sitio.latitudeTrial, sitio.longitudeTrial]);
      cantidadTrials += 1;
    }

    const mostrarAccess =
  tieneAccess(sitio) &&
  window.vistaMapaActual === "master";
    
    if (mostrarAccess) {
      const sitioAccess = { ...sitio, latitude: sitio.latitudeAccess, longitude: sitio.longitudeAccess };
      L.marker([sitio.latitudeAccess, sitio.longitudeAccess], {
        icon: crearIconoAccess(),
        zIndexOffset: 1000
      })
        .bindPopup(crearPopupAccess(sitioAccess), {
  maxWidth: 390,
  minWidth: 285,
  maxHeight: 700,
  autoPan: true,
  autoPanPadding: [50, 120],
  sitioAccess
})
        .addTo(capaMarcadores);
      coordenadas.push([sitio.latitudeAccess, sitio.longitudeAccess]);
      cantidadAccess += 1;
    }
  });

  const cantidadDrop = sitiosFiltrados.filter(
  sitio =>
    tieneTrial(sitio) &&
    String(sitio.description || "")
      .toLowerCase()
      .includes("drop")
).length;

const cantidadSembrados = sitiosFiltrados.filter(
  sitio =>
    tieneTrial(sitio) &&
    !String(sitio.description || "")
      .toLowerCase()
      .includes("drop") &&
    estaSembrado(sitio)
).length;

const trialsValidos =
  cantidadTrials - cantidadDrop;

const pendientes =
  trialsValidos - cantidadSembrados;

const porcentaje =
  trialsValidos > 0
    ? Math.round(
        (cantidadSembrados / trialsValidos) * 100
      )
    : 0;

const total =
  cantidadTrials + cantidadAccess;

if (window.vistaMapaActual === "planting") {

contadorSitios.innerHTML = `
  <div class="resumen-avance">

    <div class="resumen-avance-cabecera">
      🌱 AVANCE DE SIEMBRA
    </div>

    <div class="resumen-avance-linea">

      <div class="resumen-avance-principal">
        ${cantidadSembrados} / ${trialsValidos} Trials
      </div>

      <div class="barra-avance">
        <div
          class="barra-avance-llenado"
          style="width:${porcentaje}%;">
        </div>
      </div>

      <div class="resumen-avance-porcentaje">
        ${porcentaje}%
      </div>

    </div>

    <div class="resumen-avance-detalle">
      ✅ ${cantidadSembrados} sembrados ·
      ⚪ ${pendientes} pendientes ·
      ⛔ ${cantidadDrop} Drop
    </div>

  </div>
`; 

}
  else {

  contadorSitios.textContent =
    `${total} puntos visibles · ${cantidadTrials} Trials · ${cantidadAccess} Access` +
    (cantidadDrop
      ? ` · ${cantidadDrop} Drop`
      : "");

}

actualizarLeyenda(sitiosFiltrados);

  if (coordenadas.length) mapa.fitBounds(coordenadas, { padding: [30, 30], maxZoom: 10 });
}

function agregarLeyendaPremium() {
  const control = L.control({ position: "bottomright" });
  control.onAdd = function () {
    const contenedor = L.DomUtil.create("div", "control-leyenda-premium");
    contenedor.innerHTML = `<button class="boton-leyenda-flotante" type="button" aria-label="Mostrar leyenda" aria-expanded="false" title="Mostrar leyenda"><span class="icono-leyenda" aria-hidden="true">i</span></button><section class="panel-leyenda-premium" aria-label="Leyenda del mapa"><div class="cabecera-leyenda-premium"><h4>Leyenda</h4><button class="cerrar-leyenda" type="button" aria-label="Cerrar leyenda">×</button></div><div class="contenido-leyenda"></div></section>`;
    L.DomEvent.disableClickPropagation(contenedor);
    L.DomEvent.disableScrollPropagation(contenedor);
    botonLeyenda = contenedor.querySelector(".boton-leyenda-flotante");
    panelLeyenda = contenedor.querySelector(".panel-leyenda-premium");
    contenidoLeyenda = contenedor.querySelector(".contenido-leyenda");
    botonLeyenda.addEventListener("click", alternarLeyenda);
    contenedor.querySelector(".cerrar-leyenda").addEventListener("click", ocultarLeyenda);
    return contenedor;
  };
  control.addTo(mapa);
}

function cargarSitios() {
  Papa.parse("Sitios.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,

    transformHeader: encabezado =>
      encabezado
        .replace(/^\uFEFF/, "")
        .trim(),

    complete: resultado => {
      sitios = resultado.data
        .map(transformarFila)
        .filter(
          sitio =>
            sitio.aoiId &&
            sitio.location
        );

      completarFiltros();
      actualizarMapa();

      if (resultado.errors.length) {
        console.warn(
          "Advertencias CSV:",
          resultado.errors
        );
      }

      console.log(
        `${sitios.length} sitios cargados desde Sitios.csv.`
      );
    },

    error: error => {
      console.error(
        "Error al cargar Sitios.csv:",
        error
      );

      contadorSitios.textContent =
        navigator.onLine
          ? "No fue posible cargar los sitios."
          : "No hay una copia offline de los sitios disponible.";
    }
  });
}

[filtroCultivo, filtroRegion, filtroLocalidad, filtroFTS].forEach(control => {
  control.addEventListener("change", actualizarMapa);
});
busqueda.addEventListener("input", actualizarMapa);
limpiarFiltros.addEventListener("click", () => {
  busqueda.value = "";
  filtroCultivo.value = "";
  filtroRegion.value = "";
  filtroLocalidad.value = "";
  filtroFTS.value = "";
  actualizarMapa();
});

mapa.on("popupopen", ocultarLeyenda);
mapa.on("click", ocultarLeyenda);
agregarLeyendaPremium();
vistaMaster?.addEventListener("click", () => {
  window.vistaMapaActual = "master";

  vistaMaster.classList.add("activo");
  vistaSiembra.classList.remove("activo");
  vistaCosecha.classList.remove("activo");

  actualizarMapa();
});

vistaSiembra?.addEventListener("click", () => {
  window.vistaMapaActual = "planting";

  vistaMaster.classList.remove("activo");
  vistaSiembra.classList.add("activo");
  vistaCosecha.classList.remove("activo");

  actualizarMapa();
});

vistaCosecha?.addEventListener("click", () => {
  window.vistaMapaActual = "harvest";

  vistaMaster.classList.remove("activo");
  vistaSiembra.classList.remove("activo");
  vistaCosecha.classList.add("activo");

  actualizarMapa();
});
cargarSitios();
