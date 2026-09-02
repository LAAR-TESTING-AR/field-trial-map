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
  },

  error: error => {
    console.error("Error cargando Sitios.csv", error);
  }
});
