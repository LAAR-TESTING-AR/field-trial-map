console.log("Field Trial Platform Dashboard v1");

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
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

function actualizarDashboardPlataforma(sitios) {

  const sitiosValidos =
    sitios.filter(
      sitio =>
        limpiarTexto(sitio["AOI ID"]) &&
        limpiarTexto(sitio.Location)
    );

  const drops =
    sitiosValidos.filter(
      esDrop
    ).length;

  const sembrados =
    sitiosValidos.filter(
      sitio =>
        !esDrop(sitio) &&
        estaSembrado(sitio)
    ).length;

  const pendientes =
    sitiosValidos.filter(
      sitio =>
        !esDrop(sitio) &&
        !estaSembrado(sitio)
    ).length;

  const totalOperativo =
    sembrados + pendientes;

  const avance =
    totalOperativo > 0
      ? Math.round(
          (sembrados / totalOperativo) * 100
        )
      : 0;

  const tarjetasKpi =
    document.querySelectorAll(
      ".kpi-card"
    );

  /*
   * KPI superiores:
   * 0 = AOI
   * 1 = Sown
   * 2 = Pending
   * 3 = Drop
   */
  if (tarjetasKpi.length >= 4) {

    tarjetasKpi[0]
      .querySelector(".kpi-valor")
      .textContent =
        sitiosValidos.length;

    tarjetasKpi[1]
      .querySelector(".kpi-valor")
      .textContent =
        `${avance}%`;

    tarjetasKpi[2]
      .querySelector(".kpi-valor")
      .textContent =
        pendientes;

    tarjetasKpi[3]
      .querySelector(".kpi-valor")
      .textContent =
        drops;
  }

  /*
   * KPI y barra dentro de Sowing.
   */
  const miniKpiValor =
    document.querySelector(
      ".mini-kpi-valor"
    );

  const miniProgressFill =
    document.querySelector(
      ".mini-progress-fill"
    );

  if (miniKpiValor) {
    miniKpiValor.textContent =
      `${avance}%`;
  }

  if (miniProgressFill) {
    miniProgressFill.style.width =
      `${avance}%`;
  }

  console.log(
    "Dashboard actualizado:",
    {
      totalAOI: sitiosValidos.length,
      sembrados,
      pendientes,
      drops,
      avance
    }
  );
}

Papa.parse("Sitios.csv", {

  download: true,

  header: true,

  skipEmptyLines: true,

  transformHeader: encabezado =>
    limpiarTexto(
      encabezado.replace(
        /^\uFEFF/,
        ""
      )
    ),

  complete: resultado => {

    actualizarDashboardPlataforma(
      resultado.data
    );

    if (resultado.errors.length) {
      console.warn(
        "Advertencias leyendo Sitios.csv:",
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
