const mapa = L.map("mapa").setView([-34.5, -63.0], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

// Datos temporales para verificar el funcionamiento del mapa.
// Después serán reemplazados por los datos del Excel.
const sitios = [
    {
        location: "Romang",
        crop: "Sunflower",
        province: "Santa Fe",
        region: "NEA",
        latitude: -29.34436,
        longitude: -59.71408,
        fts: "Puntano",
        station: "AN",
        plantingDate: "",
        plantDensity: "",
        area: 1.48,
        visible: "Yes"
    },
    {
        location: "Las Breñas",
        crop: "Sunflower",
        province: "Chaco",
        region: "NEA",
        latitude: -27.01034,
        longitude: -61.02176,
        fts: "Puntano",
        station: "AN",
        plantingDate: "08/07/2026",
        plantDensity: "D1 - 50000",
        area: 1.48,
        visible: "Yes"
    }
];

const capaMarcadores = L.layerGroup().addTo(mapa);

const busqueda = document.getElementById("busqueda");
const filtroCultivo = document.getElementById("filtroCultivo");
const filtroProvincia = document.getElementById("filtroProvincia");
const filtroRegion = document.getElementById("filtroRegion");
const filtroFTS = document.getElementById("filtroFTS");
const limpiarFiltros = document.getElementById("limpiarFiltros");
const contadorSitios = document.getElementById("contadorSitios");

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

function valoresUnicos(campo) {
    return [...new Set(
        sitios
            .filter((sitio) =>
                limpiarTexto(sitio.visible).toLowerCase() === "yes"
            )
            .map((sitio) => limpiarTexto(sitio[campo]))
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "es"));
}

function completarFiltro(elemento, valores) {
    valores.forEach((valor) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = valor;
        elemento.appendChild(opcion);
    });
}

completarFiltro(filtroCultivo, valoresUnicos("crop"));
completarFiltro(filtroProvincia, valoresUnicos("province"));
completarFiltro(filtroRegion, valoresUnicos("region"));
completarFiltro(filtroFTS, valoresUnicos("fts"));

function coincideConFiltros(sitio) {
    const textoBuscado = limpiarTexto(busqueda.value).toLowerCase();

    const coincideBusqueda =
        !textoBuscado ||
        limpiarTexto(sitio.location)
            .toLowerCase()
            .includes(textoBuscado);

    const coincideCultivo =
        !filtroCultivo.value ||
        sitio.crop === filtroCultivo.value;

    const coincideProvincia =
        !filtroProvincia.value ||
        sitio.province === filtroProvincia.value;

    const coincideRegion =
        !filtroRegion.value ||
        sitio.region === filtroRegion.value;

    const coincideFTS =
        !filtroFTS.value ||
        sitio.fts === filtroFTS.value;

    const esVisible =
        limpiarTexto(sitio.visible).toLowerCase() === "yes";

    return (
        coincideBusqueda &&
        coincideCultivo &&
        coincideProvincia &&
        coincideRegion &&
        coincideFTS &&
        esVisible
    );
}

function crearPopup(sitio) {
    const latitud = Number(sitio.latitude);
    const longitud = Number(sitio.longitude);

    const googleMaps =
        `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;

    const waze =
        `https://waze.com/ul?ll=${latitud},${longitud}&navigate=yes`;

    const fechaSiembra = sitio.plantingDate
        ? `<p><strong>Fecha de siembra:</strong> ${escaparHTML(sitio.plantingDate)}</p>`
        : "";

    const densidad = sitio.plantDensity
        ? `<p><strong>Densidad:</strong> ${escaparHTML(sitio.plantDensity)}</p>`
        : "";

    const superficie =
        sitio.area !== "" && sitio.area !== null
            ? `<p><strong>Área:</strong> ${escaparHTML(sitio.area)} ha</p>`
            : "";

    return `
        <h2>${escaparHTML(sitio.location)}</h2>

        <p><strong>Cultivo:</strong> ${escaparHTML(sitio.crop)}</p>
        <p><strong>Provincia:</strong> ${escaparHTML(sitio.province)}</p>
        <p><strong>Región:</strong> ${escaparHTML(sitio.region)}</p>
        <p><strong>Estación:</strong> ${escaparHTML(sitio.station)}</p>
        <p><strong>FTS:</strong> ${escaparHTML(sitio.fts)}</p>

        ${fechaSiembra}
        ${densidad}
        ${superficie}

        <div class="botones-navegacion">
            ${googleMaps}
                Google Maps
            </a>

            ${waze}
                Waze
            </a>
        </div>
    `;
}

function actualizarMapa() {
    capaMarcadores.clearLayers();

    const sitiosFiltrados = sitios.filter(coincideConFiltros);
    const coordenadas = [];

    sitiosFiltrados.forEach((sitio) => {
        const latitud = Number(sitio.latitude);
        const longitud = Number(sitio.longitude);

        if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
            return;
        }

        const marcador = L.marker([latitud, longitud])
            .bindPopup(crearPopup(sitio));

        marcador.addTo(capaMarcadores);
        coordenadas.push([latitud, longitud]);
    });

    contadorSitios.textContent =
        `${coordenadas.length} sitios visibles`;

    if (coordenadas.length > 0) {
        mapa.fitBounds(coordenadas, {
            padding: [30, 30],
            maxZoom: 10
        });
    }
}

[
    filtroCultivo,
    filtroProvincia,
    filtroRegion,
    filtroFTS
].forEach((control) => {
    control.addEventListener("change", actualizarMapa);
});

busqueda.addEventListener("input", actualizarMapa);

limpiarFiltros.addEventListener("click", () => {
    busqueda.value = "";
    filtroCultivo.value = "";
    filtroProvincia.value = "";
    filtroRegion.value = "";
    filtroFTS.value = "";

    actualizarMapa();
});

actualizarMapa();
