console.log("Planting Tracker");

const mapa = L.map("mapa").setView([-34.5, -63.0], 5);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(mapa);

let sitios = [];

Papa.parse("../Sitios.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,

  complete: resultado => {

    sitios = resultado.data;

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

  marcador.addTo(mapa);

};
  
  error: error => {
    console.error("Error cargando Sitios.csv", error);
  }
});
