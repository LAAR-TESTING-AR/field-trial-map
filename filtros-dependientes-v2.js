(function () {
  "use strict";

  function iniciarFiltrosDependientes() {
    if (
      typeof sitios === "undefined" ||
      !Array.isArray(sitios) ||
      !sitios.length ||
      typeof actualizarMapa !== "function" ||
      typeof esVisible !== "function"
    ) {
      return false;
    }

    const filtros = {
      crop: filtroCultivo,
      region: filtroRegion,
      location: filtroLocalidad,
      fts: filtroFTS
    };

    const etiquetas = {
      crop: "Todos los cultivos",
      region: "Todas las regiones",
      location: "Todas las localidades",
      fts: "Todos los FTS"
    };

    const limpiar = valor => String(valor ?? "").trim();

    function coincideBusqueda(sitio) {
      const q = limpiar(busqueda.value).toLowerCase();
      if (!q) return true;

      return [
        sitio.aoiId,
        sitio.location,
        sitio.description,
        sitio.siteType,
        sitio.crop,
        sitio.region,
        sitio.province,
        sitio.fts,
        sitio.spa,
        sitio.operations
      ].join(" ").toLowerCase().includes(q);
    }

    function coincideConFiltrosExcepto(sitio, campoExcluido) {
      if (!esVisible(sitio) || !coincideBusqueda(sitio)) return false;

      return Object.entries(filtros).every(([campo, control]) => {
        if (campo === campoExcluido || !control.value) return true;
        return limpiar(sitio[campo]) === control.value;
      });
    }

    function obtenerOpciones(campo) {
      return [...new Set(
        sitios
          .filter(sitio => coincideConFiltrosExcepto(sitio, campo))
          .map(sitio => limpiar(sitio[campo]))
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }

    function actualizarUnFiltro(campo) {
      const control = filtros[campo];
      const seleccionado = control.value;
      const opciones = obtenerOpciones(campo);

      const fragmento = document.createDocumentFragment();
      const opcionTodos = document.createElement("option");
      opcionTodos.value = "";
      opcionTodos.textContent = etiquetas[campo];
      fragmento.appendChild(opcionTodos);

      opciones.forEach(valor => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = valor;
        fragmento.appendChild(opcion);
      });

      control.replaceChildren(fragmento);
      control.value = opciones.includes(seleccionado) ? seleccionado : "";
    }

    function actualizarTodo() {
      /* Repetimos dos veces para estabilizar selecciones incompatibles. */
      for (let i = 0; i < 2; i += 1) {
        Object.keys(filtros).forEach(actualizarUnFiltro);
      }
      actualizarMapa();
    }

    Object.values(filtros).forEach(control => {
      control.addEventListener("change", actualizarTodo);
    });

    busqueda.addEventListener("input", actualizarTodo);

    limpiarFiltros.addEventListener("click", () => {
      window.setTimeout(actualizarTodo, 0);
    });

    actualizarTodo();
    console.log("Filtros dependientes v2 activos.");
    return true;
  }

  let intentos = 0;
  const temporizador = window.setInterval(() => {
    intentos += 1;
    try {
      if (iniciarFiltrosDependientes() || intentos >= 100) {
        window.clearInterval(temporizador);
      }
    } catch (error) {
      console.error("Error al iniciar filtros dependientes:", error);
      window.clearInterval(temporizador);
    }
  }, 100);
})();
