console.log("Planting Tracker");

const mapa = L.map("mapa").setView([-34.5, -63.0], 5);
const capaMarcadores = L.layerGroup().addTo(mapa);
L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(mapa);

let sitios = [];

const filtroCrop = document.getElementById("filtroCrop");
const filtroSeason = document.getElementById("filtroSeason");
const filtroLaar = document.getElementById("filtroLaar");
const filtroOperation = document.getElementById("filtroOperation");
filtroCrop.addEventListener("change", actualizarVista);

Papa.parse("../Sitios.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,

  complete: resultado => {

    sitios = resultado.data;
    
cargarFiltros();
    
    console.log(
      `Sitios cargados: ${sitios.length}`
    );

    document.getElementById("totalAOI").textContent =
      sitios.length;
    const drops = sitios.filter(sitio =>
  String(sitio.Description || "")
    .toLowerCase()
    .includes("drop")
).length;

const sembradas = sitios.filter(sitio =>
  String(
    sitio["Planting Date (MM/DD/YYYY)"] || ""
  ).trim() !== ""
).length;

const pendientes =
  sitios.length -
  sembradas -
  drops;

const avance =
  sembradas + pendientes > 0
    ? Math.round(
        (sembradas /
          (sembradas + pendientes)) * 100
      )
    : 0;

document.getElementById("sembradas").textContent =
  sembradas;

document.getElementById("pendientes").textContent =
  pendientes;

document.getElementById("drop").textContent =
  drops;

document.getElementById("avance").textContent =
  `${avance}%`;
const coordenadas = [];
  sitios.forEach(sitio => {

  const lat = Number(sitio["Latitude Trial"]);
  const lon = Number(sitio["Longitude Trial"]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return;
  }

  const esDrop =
    String(sitio.Description || "")
      .toLowerCase()
      .includes("drop");

  const sembrado =
    String(
      sitio["Planting Date (MM/DD/YYYY)"] || ""
    ).trim() !== "";

  let color = "#d32f2f";

  if (esDrop) {
    color = "#000000";
  } else if (sembrado) {
    color = "#2e7d32";
  }

  const marcador = L.circleMarker(
    [lat, lon],
    {
      radius: 5,
      fillColor: color,
      color: "#ffffff",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.95
    }
);
  marcador.bindPopup(`
    <b>${sitio["AOI ID"] || ""}</b><br>
    ${sitio.Location || ""}<br>
    ${sitio.Crop || ""}<br>
    ${esDrop ? "DROP" :
      sembrado ? "SEMBRADO" :
      "PENDIENTE"}
  `);

  marcador.addTo(capaMarcadores);
coordenadas.push([lat, lon]);
});
    
if (coordenadas.length > 0) {
  mapa.fitBounds(coordenadas, {
    padding: [30, 30]
  });
}
actualizarVista();
},

error: error => {
    console.error("Error cargando Sitios.csv", error);
  }
})
  
  function obtenerValoresUnicos(campo) {
  return [...new Set(
    sitios
      .map(sitio => String(sitio[campo] || "").trim())
      .filter(Boolean)
  )].sort();
}

function cargarOpciones(select, valores) {

  while (select.options.length > 1) {
    select.remove(1);
  }

  valores.forEach(valor => {

    const opcion = document.createElement("option");

    opcion.value = valor;

    opcion.textContent = valor;

    select.appendChild(opcion);

  });

}

function cargarFiltros() {

  cargarOpciones(
    filtroCrop,
    obtenerValoresUnicos("Crop")
  );

  cargarOpciones(
    filtroSeason,
    obtenerValoresUnicos("Season")
  );

  cargarOpciones(
    filtroLaar,
    obtenerValoresUnicos("LAAR Status 2026-2027")
  );

  cargarOpciones(
    filtroOperation,
    obtenerValoresUnicos("Operations")
  );

}
 function actualizarVista() {

  const cultivoSeleccionado =
    filtroCrop.value;

  capaMarcadores.clearLayers();

  sitios.forEach(sitio => {

    if (
      cultivoSeleccionado &&
      sitio.Crop !== cultivoSeleccionado
    ) {
      return;
    }

    const lat = Number(
      sitio["Latitude Trial"]
    );

    const lon = Number(
      sitio["Longitude Trial"]
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return;
    }

    const esDrop =
      String(sitio.Description || "")
        .toLowerCase()
        .includes("drop");

    const sembrado =
      String(
        sitio["Planting Date (MM/DD/YYYY)"] || ""
      ).trim() !== "";

    let color = "#d32f2f";

    if (esDrop) {
      color = "#000000";
    } else if (sembrado) {
      color = "#2e7d32";
    }

    L.circleMarker(
      [lat, lon],
      {
        radius: 3,
        fillColor: color,
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.95
      }
    ).addTo(capaMarcadores);

  });

}
