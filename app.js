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
    const valor = limpiarTexto(sitio.visible).toLowerCase();

    return [
        "yes",
        "si",
        "sí",
        "true",
        "1",
        "visible"
    ].includes(valor);
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

function obtenerValoresUnicos(campo) {
    return [...new Set(
        sitios
            .filter(esVisible)
            .map((sitio) => limpiarTexto(sitio[campo]))
            .filter(Boolean)
    )].sort((a, b) =>
        a.localeCompare(b, "es", {
            sensitivity: "base"
        })
    );
}

function reiniciarFiltro(elemento) {
    while (elemento.options.length > 1) {
        elemento.remove(1);
    }
}

function completarFiltro(elemento, valores) {
    reiniciarFiltro(elemento);

    valores.forEach((valor) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = valor;
        elemento.appendChild(opcion);
    });
}

function completarTodosLosFiltros() {
    completarFiltro(
        filtroCultivo,
        obtenerValoresUnicos("crop")
    );

    completarFiltro(
        filtroProvincia,
        obtenerValoresUnicos("province")
    );

    completarFiltro(
        filtroRegion,
        obtenerValoresUnicos("region")
    );

    completarFiltro(
        filtroFTS,
        obtenerValoresUnicos("fts")
    );
}

function coincideConFiltros(sitio) {
    const textoBuscado =
        limpiarTexto(busqueda.value).toLowerCase();

    const camposBusqueda = [
        sitio.location,
        sitio.province,
        sitio.region,
        sitio.fts,
        sitio.spa,
        sitio.aoiId
    ]
        .join(" ")
        .toLowerCase();

    const coincideBusqueda =
        !textoBuscado ||
        camposBusqueda.includes(textoBuscado);

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

    return (
        esVisible(sitio) &&
        coincideBusqueda &&
        coincideCultivo &&
        coincideProvincia &&
        coincideRegion &&
        coincideFTS
    );
}

function crearLineaPopup(etiqueta, valor) {
    const contenido = limpiarTexto(valor);

    if (!contenido) {
        return "";
    }

    return `
        <p>
            <strong>${escaparHTML(etiqueta)}:</strong>
            ${escaparHTML(contenido)}
        </p>
    `;
}

function crearPopup(sitio) {
    const latitud = sitio.latitude;
    const longitud = sitio.longitude;

    const googleMaps =
        "https://www.google.com/maps/dir/?api=1" +
        `&destination=${latitud},${longitud}`;

    const waze =
        "https://waze.com/ul" +
        `?ll=${latitud},${longitud}` +
        "&navigate=yes";

    return `
        <h2>${escaparHTML(sitio.location)}</h2>

        ${crearLineaPopup("Cultivo", sitio.crop)}
        ${crearLineaPopup("Temporada", sitio.season)}
        ${crearLineaPopup("Provincia", sitio.province)}
        ${crearLineaPopup("Región", sitio.region)}
        ${crearLineaPopup("Estación", sitio.station)}
        ${crearLineaPopup("FTS", sitio.fts)}
        ${crearLineaPopup("SPA", sitio.spa)}
        ${crearLineaPopup(
            "Fecha de siembra",
            sitio.plantingDate
        )}
        ${crearLineaPopup("Estado LAAR", sitio.laarStatus)}
        ${crearLineaPopup(
            "Cultivo antecesor",
            sitio.previousCrop
        )}
        ${crearLineaPopup("Densidad", sitio.plantDensity)}
        ${crearLineaPopup("Área", sitio.area ? `${sitio.area} ha` : "")}

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
        if (
            !Number.isFinite(sitio.latitude) ||
            !Number.isFinite(sitio.longitude)
        ) {
            return;
        }

        const marcador = L.marker([
            sitio.latitude,
            sitio.longitude
        ]);

        marcador.bindPopup(crearPopup(sitio));
        marcador.addTo(capaMarcadores);

        coordenadas.push([
            sitio.latitude,
            sitio.longitude
        ]);
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

function cargarSitios() {
    contadorSitios.textContent = "Cargando sitios...";

    Papa.parse("Sitios.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        transformHeader: (encabezado) => {
            return encabezado
                .replace(/^\uFEFF/, "")
                .trim();
        },

        complete: (resultado) => {
            sitios = resultado.data
                .map(transformarFila)
                .filter((sitio) => {
                    return sitio.location !== "";
                });

            completarTodosLosFiltros();
            actualizarMapa();

            const sinCoordenadas = sitios.filter((sitio) => {
                return (
                    esVisible(sitio) &&
                    (
                        !Number.isFinite(sitio.latitude) ||
                        !Number.isFinite(sitio.longitude)
                    )
                );
            });

            if (sinCoordenadas.length > 0) {
                console.warn(
                    "Sitios visibles sin coordenadas:",
                    sinCoordenadas
                );
            }

            if (resultado.errors.length > 0) {
                console.warn(
                    "Advertencias al interpretar el CSV:",
                    resultado.errors
                );
            }
        },

        error: (error) => {
            console.error("Error al cargar Sitios.csv:", error);

            contadorSitios.textContent =
                "No fue posible cargar los sitios.";
        }
    });
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

cargarSitios();
