console.log("app.js iniciado correctamente");

const mapa = L.map("mapa").setView([-34.5, -63.0], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

const capaMarcadores = L.layerGroup().addTo(mapa);

const busqueda = document.getElementById("busqueda");
const filtroCultivo = document.getElementById("filtroCultivo");
const filtroProvincia = document.getElementById("filtroProvincia");
const filtroRegion = document.getElementById("filtroRegion");
const filtroFTS = document.getElementById("filtroFTS");
const limpiarFiltros = document.getElementById("limpiarFiltros");
const contadorSitios = document.getElementById("contadorSitios");

let sitios = [];

function limpiarTexto(valor) {
    return String(valor ?? "").trim();
}

function escaparHTML(valor) {
    return limpiarTexto(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function convertirNumero(valor) {
    if (typeof valor === "number") {
        return valor;
    }

    let texto = limpiarTexto(valor);

    if (!texto) {
        return NaN;
    }

    texto = texto.replace(/\s/g, "");

    if (texto.includes(",") && !texto.includes(".")) {
        texto = texto.replace(",", ".");
    }

    return Number(texto);
}

function esVisible(sitio) {
  
