(function () {
  "use strict";

  const controles = {
    crop: filtroCultivo,
    region: filtroRegion,
    location: filtroLocalidad,
    fts: filtroFTS
  };

  const textosIniciales = {
    crop: "Todos los cultivos",
    region: "Todas las regiones",
    location: "Todas las localidades",
    fts: "Todos los FTS"
  };

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function coincideBusqueda(sitio) {
    const q = texto(busqueda.value).toLowerCase();
    if (!q) return true;

    return [
      sitio.location,
      sitio.description,
      sitio.siteType,
      sitio.region,
      sitio.province,
      sitio.fts,
      sitio.spa,
      sitio.aoiId,
      sitio.operations,
      sitio.crop
    ].join(" ").toLowerCase().includes(q);
  }

  function coincideConOtrosFiltros(sitio, campoIgnorado) {
    if (!esVisible(sitio) || !coincideBusqueda(sitio)) return false;

    return Object.entries(controles).every(([campo, control]) => {
      if (campo === campoIgnorado || !control.value) return true;
      return texto(sitio[campo]) === control.value;
    });
  }

  function valoresDisponibles(campo) {
    return [...new Set(
      sitios
        .filter(sitio => coincideConOtrosFiltros(sitio, campo))
        .map(sitio => texto(sitio[campo]))
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }

  function reconstruirSelect(campo) {
    const control = controles[campo];
    const valorAnterior = control.value;
    const valores = valoresDisponibles(campo);

    control.replaceChildren();

    const opcionTodos = document.createElement("option");
    opcionTodos.value = "";
    opcionTodos.textContent = textosIniciales[campo];
    control.appendChild(opcionTodos);

    valores.forEach(valor => {
      const opcion = document.createElement("option");
      opcion.value = valor;
      opcion.textContent = valor;
      control.appendChild(opcion);
    });

    control.value = valores.includes(valorAnterior) ? valorAnterior : "";
    return valorAnterior !== control.value;
  }

  function actualizarFiltrosDependientes() {
    let cambio = false;

    /* Dos pasadas estabilizan combinaciones cuando un valor deja de ser válido. */
    for (let pasada = 0; pasada < 2; pasada += 1) {
      Object.keys(controles).forEach(campo => {
        if (reconstruirSelect(campo)) cambio = true;
      });
    }

    actualizarMapa();
    return cambio;
  }

  Object.values(controles).forEach(control => {
    control.addEventListener("change", actualizarFiltrosDependientes);
  });

  busqueda.addEventListener("input", actualizarFiltrosDependientes);
  limpiarFiltros.addEventListener("click", () => {
    window.setTimeout(actualizarFiltrosDependientes, 0);
  });

  /* Se ejecuta después de que app.js termina de cargar Sitios.csv. */
  const esperarDatos = window.setInterval(() => {
    if (Array.isArray(sitios) && sitios.length) {
      window.clearInterval(esperarDatos);
      actualizarFiltrosDependientes();
    }
  }, 150);

  console.log("Filtros dependientes habilitados.");
})();
