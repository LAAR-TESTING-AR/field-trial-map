console.log("Planting Tracker v2 - filtros dependientes");

const mapa = L.map("mapa").setView([-34.5, -63.0], 5);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(mapa);

const capaMarcadores = L.layerGroup().addTo(mapa);

let sitios = [];

const filtroCrop =
  document.getElementById("filtroCrop");

const filtroSeason =
  document.getElementById("filtroSeason");

const filtroLaar =
  document.getElementById("filtroLaar");

const filtroOperation =
  document.getElementById("filtroOperation");
const busqueda =
  document.getElementById("busqueda");

const limpiarFiltros =
  document.getElementById("limpiarFiltros");

const configuracionFiltros = [
  {
    elemento: filtroCrop,
    campo: "Crop",
    textoInicial: "Todos los cultivos"
  },
  {
    elemento: filtroSeason,
    campo: "Season",
    textoInicial: "Todas las seasons"
  },
  {
    elemento: filtroLaar,
    campo: "LAAR Status 2026-2027",
    textoInicial: "Todos los LAAR Status"
  },
  {
    elemento: filtroOperation,
    campo: "Operations",
    textoInicial: "Todas las operaciones"
  }
];

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function ordenarValores(valores) {
  return [...new Set(
    valores
      .map(limpiarTexto)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(
      b,
      "es",
      { sensitivity: "base" }
    )
  );
}

function esDrop(sitio) {
  return limpiarTexto(sitio.Description)
    .toLowerCase()
    .includes("drop");
}

function estaSembrado(sitio) {
  return Boolean(
    limpiarTexto(
      sitio["Planting Date (MM/DD/YYYY)"]
    )
  );
}

function coincideConFiltros(
  sitio,
  campoIgnorado = null
) {
  return configuracionFiltros.every(
    ({ elemento, campo }) => {
      if (campo === campoIgnorado) {
        return true;
      }

      const valorSeleccionado =
        limpiarTexto(elemento.value);

      return (
        !valorSeleccionado ||
        limpiarTexto(sitio[campo]) === valorSeleccionado
      );
    }
  );
}

function obtenerSitiosFiltrados() {
  return sitios.filter(sitio =>
    coincideConFiltros(sitio)
  );
}

function obtenerValoresDisponibles(campo) {
  return ordenarValores(
    sitios
      .filter(sitio =>
        coincideConFiltros(sitio, campo)
      )
      .map(sitio => sitio[campo])
  );
}

function reconstruirFiltro(
  elemento,
  valores,
  textoInicial
) {
  const valorActual = elemento.value;

  elemento.innerHTML = "";

  const opcionTodos =
    document.createElement("option");

  opcionTodos.value = "";
  opcionTodos.textContent = textoInicial;

  elemento.appendChild(opcionTodos);

  valores.forEach(valor => {
    const opcion =
      document.createElement("option");

    opcion.value = valor;
    opcion.textContent = valor;

    elemento.appendChild(opcion);
  });

  if (valores.includes(valorActual)) {
    elemento.value = valorActual;
  } else {
    elemento.value = "";
  }
}

function actualizarFiltrosDependientes() {
  configuracionFiltros.forEach(
    ({ elemento, campo, textoInicial }) => {
      reconstruirFiltro(
        elemento,
        obtenerValoresDisponibles(campo),
        textoInicial
      );
    }
  );
}

function actualizarDashboard(sitiosFiltrados) {
  const drops = sitiosFiltrados.filter(
    esDrop
  ).length;

  const sembradas = sitiosFiltrados.filter(
    sitio =>
      !esDrop(sitio) &&
      estaSembrado(sitio)
  ).length;

  const pendientes = sitiosFiltrados.filter(
    sitio =>
      !esDrop(sitio) &&
      !estaSembrado(sitio)
  ).length;

  const totalOperativo =
    sembradas + pendientes;

  const avance =
    totalOperativo > 0
      ? Math.round(
          (sembradas / totalOperativo) * 100
        )
      : 0;

  document.getElementById("totalAOI").textContent =
    sitiosFiltrados.length;

  document.getElementById("sembradas").textContent =
    sembradas;

  document.getElementById("pendientes").textContent =
    pendientes;

  document.getElementById("drop").textContent =
    drops;

  document.getElementById("avance").textContent =
    `${avance}%`;
}

function crearPopup(sitio, estado) {
  return `
    <strong>${limpiarTexto(
      sitio["AOI ID"]
    )}</strong><br>

    ${limpiarTexto(sitio.Location)}<br>

    ${limpiarTexto(sitio.Crop)}<br>

    ${limpiarTexto(sitio.Season)}<br>

    ${limpiarTexto(
      sitio["LAAR Status 2026-2027"]
    )}<br>

    ${limpiarTexto(sitio.Operations)}<br>

    <strong>${estado}</strong>
  `;
}

function actualizarMapa(sitiosFiltrados) {
  capaMarcadores.clearLayers();

  const coordenadas = [];

  sitiosFiltrados.forEach(sitio => {
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

    const drop = esDrop(sitio);
    const sembrado = estaSembrado(sitio);

    let color = "#d32f2f";
    let estado = "PENDIENTE";

    if (drop) {
      color = "#000000";
      estado = "DROP";
    } else if (sembrado) {
      color = "#2e7d32";
      estado = "SEMBRADO";
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

    marcador.bindPopup(
      crearPopup(sitio, estado)
    );

    marcador.addTo(capaMarcadores);

    coordenadas.push([lat, lon]);
  });

  if (coordenadas.length > 0) {
    mapa.fitBounds(
      coordenadas,
      {
        padding: [30, 30],
        maxZoom: 9
      }
    );
  }
}

function actualizarVista() {
  actualizarFiltrosDependientes();

  const sitiosFiltrados =
    obtenerSitiosFiltrados();

  actualizarDashboard(sitiosFiltrados);
  actualizarMapa(sitiosFiltrados);
}

configuracionFiltros.forEach(
  ({ elemento }) => {
    elemento.addEventListener(
      "change",
      actualizarVista
    );
  }
);

limpiarFiltros.addEventListener(
  "click",
  () => {
    configuracionFiltros.forEach(
      ({ elemento }) => {
        elemento.value = "";
      }
    );

    actualizarVista();
  }
);

Papa.parse("../Sitios.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,

  transformHeader: encabezado =>
    limpiarTexto(
      encabezado.replace(/^\uFEFF/, "")
    ),

  complete: resultado => {
    sitios = resultado.data.filter(
      sitio =>
        limpiarTexto(sitio["AOI ID"]) &&
        limpiarTexto(sitio.Location)
    );

    console.log(
      `Sitios cargados: ${sitios.length}`
    );

    actualizarVista();

    if (resultado.errors.length) {
      console.warn(
        "Advertencias del CSV:",
        resultado.errors
      );
    }
  },

  error: error => {
    console.error(
      "Error cargando Sitios.csv:",
      error
    );
  }
});
