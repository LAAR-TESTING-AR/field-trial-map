(function () {
  "use strict";

  const ftsSeleccionados = new Set();
  let contenedorMultiFTS = null;
  let botonMultiFTS = null;
  let panelMultiFTS = null;
  let listaMultiFTS = null;
  let iniciado = false;

  const limpiar = valor => String(valor ?? "").trim();

function normalizar(valor) {
  return limpiar(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerPalabras(valor) {
  return normalizar(valor)
    .match(/[a-z0-9]+/g) || [];
}
  
  function obtenerBusquedaEspecial() {
    const q = limpiar(busqueda.value).toLowerCase();
    return ["trial", "access", "drop"].includes(q) ? q : "";
  }

  window.obtenerBusquedaEspecial = obtenerBusquedaEspecial;

function coincideBusqueda(sitio) {

  const palabras =
    obtenerPalabras(
      busqueda.value
    );

  if (palabras.length === 0) {
    return true;
  }

  const consultaCompleta =
    normalizar(busqueda.value);

  /*
   * Búsquedas especiales.
   */
  if (consultaCompleta === "tri*l") {
    return tieneTrial(sitio)*
  }

  if (consultaCompleta === "*ccess") {
    return tieneAccess(s*tio);
  }

  if (consultaCompleta *== "drop") {
    return (
      ti*neTrial(sitio) &&
      normalizar*
        sitio.description
      ).includes("drop")
    );
  }

  const cropActual =
    normalizar(sitio.crop);

  const palabrasLaarActual =
    obtenerPalabras(
      sitio.laarStatus
    );

  /*
   * Palabras de campos informativos.
   * Permite buscar por comienzos:
   * "tres a" = Tres Arroyos
   * "tres i" = Tres Isletas
   */
  const palabrasGenerales =
    obtenerPalabras([
      sitio.location,
      sitio.description,
      sitio.season,
      sitio.station,
      sitio.province,
      sitio.region,
      sitio.fts,
      sitio.spa,
      sitio.operations
    ].join(" "));

  const aoiActual =
    normalizar(sitio.aoiId);

  const cultivosDisponibles =
    sitios
      .map(item =>
        normalizar(item.crop)
      )
      .filter(Boolean);

  return palabras.every(
    palabra => {

      /*
       * R1, R2, R3, etc. se buscan
       * exclusivamente en LAAR Status.
       */
      if (/^r\d+$/i.test(palabra)) {
        return palabrasLaarActual.includes(
          palabra
        );
      }

      /*
       * Solo términos de 3 letras o más
       * pueden interpretarse como Crop.
       * Evita clasificar "a" o "i"
       * accidentalmente como cultivo.
       */
      const esTerminoCrop =
        palabra.length >= 3 &&
        cultivosDisponibles.some(
          cultivo =>
            cultivo.includes(palabra)
        );

      if (esTerminoCrop) {
        return cropActual.includes(
          palabra
        );
      }

      /*
       * Búsqueda por prefijo en campos
       * descriptivos.
       */
      const coincideCampoGeneral =
        palabrasGenerales.some(
          valor =>
            valor.startsWith(palabra)
        );

      if (coincideCampoGeneral) {
        return true;
      }

      /*
       * AOI continúa siendo buscable,
       * pero no con una sola letra para
       * evitar falsos positivos.
       */
      return (
        palabra.length >= 3 &&
        aoiActual.includes(palabra)
      );

    }
  );
}

  function coincideSeleccionFTS(sitio) {
    return ftsSeleccionados.size === 0 || ftsSeleccionados.has(limpiar(sitio.fts));
  }

  function reemplazarFiltroPrincipal() {
    window.coincideConFiltros = function (sitio) {
      return esVisible(sitio)
        && coincideBusqueda(sitio)
        && (!filtroCultivo.value || sitio.crop === filtroCultivo.value)
        && (!filtroRegion.value || sitio.region === filtroRegion.value)
        && (!filtroLocalidad.value || sitio.location === filtroLocalidad.value)
        && coincideSeleccionFTS(sitio);
    };
  }

  function coincideExcepto(sitio, campoExcluido) {
    if (!esVisible(sitio) || !coincideBusqueda(sitio)) return false;
    if (campoExcluido !== "crop" && filtroCultivo.value && sitio.crop !== filtroCultivo.value) return false;
    if (campoExcluido !== "region" && filtroRegion.value && sitio.region !== filtroRegion.value) return false;
    if (campoExcluido !== "location" && filtroLocalidad.value && sitio.location !== filtroLocalidad.value) return false;
    if (campoExcluido !== "fts" && !coincideSeleccionFTS(sitio)) return false;
    return true;
  }

  function valoresDisponibles(campo) {
    return [...new Set(
      sitios
        .filter(sitio => coincideExcepto(sitio, campo))
        .map(sitio => limpiar(sitio[campo]))
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }

  function reconstruirSelect(control, campo, etiquetaTodos) {
    const seleccionAnterior = control.value;
    const valores = valoresDisponibles(campo);
    control.replaceChildren();

    const opcionTodos = document.createElement("option");
    opcionTodos.value = "";
    opcionTodos.textContent = etiquetaTodos;
    control.appendChild(opcionTodos);

    valores.forEach(valor => {
      const opcion = document.createElement("option");
      opcion.value = valor;
      opcion.textContent = valor;
      control.appendChild(opcion);
    });

    control.value = valores.includes(seleccionAnterior) ? seleccionAnterior : "";
  }

  function depurarFTSSeleccionados() {
    const disponibles = new Set(valoresDisponibles("fts"));
    let cambio = false;

    [...ftsSeleccionados].forEach(fts => {
      if (!disponibles.has(fts)) {
        ftsSeleccionados.delete(fts);
        cambio = true;
      }
    });

    return cambio;
  }

  function actualizarTextoBoton() {
    if (!botonMultiFTS) return;

    if (ftsSeleccionados.size === 0) {
      botonMultiFTS.textContent = "Todos los FTS";
      botonMultiFTS.title = "Todos los FTS";
      return;
    }

    if (ftsSeleccionados.size === 1) {
      const unico = [...ftsSeleccionados][0];
      botonMultiFTS.textContent = unico;
      botonMultiFTS.title = unico;
      return;
    }

    botonMultiFTS.textContent = `${ftsSeleccionados.size} FTS seleccionados`;
    botonMultiFTS.title = [...ftsSeleccionados].join(", ");
  }

  function reconstruirOpcionesFTS() {
    if (!listaMultiFTS) return;

    const valores = valoresDisponibles("fts");
    listaMultiFTS.replaceChildren();

    if (!valores.length) {
      const vacio = document.createElement("p");
      vacio.className = "multi-fts-vacio";
      vacio.textContent = "No hay FTS disponibles para los filtros actuales.";
      listaMultiFTS.appendChild(vacio);
      return;
    }

    valores.forEach(fts => {
      const etiqueta = document.createElement("label");
      etiqueta.className = "multi-fts-opcion";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.value = fts;
      check.checked = ftsSeleccionados.has(fts);

      const texto = document.createElement("span");
      texto.textContent = fts;

      check.addEventListener("change", () => {
        if (check.checked) ftsSeleccionados.add(fts);
        else ftsSeleccionados.delete(fts);
        actualizarFiltrosDependientes();
      });

      etiqueta.append(check, texto);
      listaMultiFTS.appendChild(etiqueta);
    });
  }

  function construirMultiSelectorFTS() {
    filtroFTS.classList.add("filtro-fts-original-oculto");
    filtroFTS.value = "";

    contenedorMultiFTS = document.createElement("div");
    contenedorMultiFTS.className = "multi-fts";

    botonMultiFTS = document.createElement("button");
    botonMultiFTS.type = "button";
    botonMultiFTS.className = "multi-fts-boton";
    botonMultiFTS.setAttribute("aria-expanded", "false");
    botonMultiFTS.textContent = "Todos los FTS";

    panelMultiFTS = document.createElement("div");
    panelMultiFTS.className = "multi-fts-panel";
    panelMultiFTS.hidden = true;

    const cabecera = document.createElement("div");
    cabecera.className = "multi-fts-cabecera";

    const titulo = document.createElement("span");
    titulo.className = "multi-fts-titulo";
    titulo.textContent = "Seleccionar FTS";

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "multi-fts-cerrar";
    cerrar.textContent = "×";
    cerrar.setAttribute("aria-label", "Cerrar selector de FTS");

    cerrar.addEventListener("click", () => {
      panelMultiFTS.hidden = true;
      botonMultiFTS.setAttribute("aria-expanded", "false");
    });

    cabecera.append(titulo, cerrar);

    const acciones = document.createElement("div");
    acciones.className = "multi-fts-acciones";

    const seleccionarTodos = document.createElement("button");
    seleccionarTodos.type = "button";
    seleccionarTodos.textContent = "Seleccionar todos";

    const limpiarSeleccion = document.createElement("button");
    limpiarSeleccion.type = "button";
    limpiarSeleccion.textContent = "Limpiar";

    listaMultiFTS = document.createElement("div");
    listaMultiFTS.className = "multi-fts-lista";

    seleccionarTodos.addEventListener("click", () => {
      valoresDisponibles("fts").forEach(fts => ftsSeleccionados.add(fts));
      actualizarFiltrosDependientes();
    });

    limpiarSeleccion.addEventListener("click", () => {
      ftsSeleccionados.clear();
      actualizarFiltrosDependientes();
    });

    botonMultiFTS.addEventListener("click", () => {
      const abrir = panelMultiFTS.hidden;
      panelMultiFTS.hidden = !abrir;
      botonMultiFTS.setAttribute("aria-expanded", String(abrir));
      if (abrir) reconstruirOpcionesFTS();
    });

    document.addEventListener("click", evento => {
      if (!contenedorMultiFTS.contains(evento.target)) {
        panelMultiFTS.hidden = true;
        botonMultiFTS.setAttribute("aria-expanded", "false");
      }
    });

    acciones.append(seleccionarTodos, limpiarSeleccion);
    panelMultiFTS.append(cabecera, acciones, listaMultiFTS);
    contenedorMultiFTS.append(botonMultiFTS, panelMultiFTS);
    filtroFTS.insertAdjacentElement("afterend", contenedorMultiFTS);
  }

  function actualizarFiltrosDependientes() {
    reconstruirSelect(filtroCultivo, "crop", "Todos los cultivos");
    reconstruirSelect(filtroRegion, "region", "Todas las regiones");
    reconstruirSelect(filtroLocalidad, "location", "Todas las localidades");

    if (depurarFTSSeleccionados()) {
      reconstruirSelect(filtroCultivo, "crop", "Todos los cultivos");
      reconstruirSelect(filtroRegion, "region", "Todas las regiones");
      reconstruirSelect(filtroLocalidad, "location", "Todas las localidades");
    }

    filtroFTS.value = "";
    reconstruirOpcionesFTS();
    actualizarTextoBoton();
    actualizarMapa();
  }

  function iniciar() {
    if (iniciado || !Array.isArray(sitios) || !sitios.length) return false;

    iniciado = true;
    reemplazarFiltroPrincipal();
    construirMultiSelectorFTS();

    [filtroCultivo, filtroRegion, filtroLocalidad].forEach(control => {
      control.addEventListener("change", actualizarFiltrosDependientes);
    });

    busqueda.addEventListener("input", actualizarFiltrosDependientes);

    limpiarFiltros.addEventListener("click", () => {
      ftsSeleccionados.clear();
      window.setTimeout(actualizarFiltrosDependientes, 0);
    });

    actualizarFiltrosDependientes();
    console.log("Filtro múltiple, dependiente y búsqueda por Trial/Access/Drop habilitados.");
    return true;
  }

  let intentos = 0;
  const temporizador = window.setInterval(() => {
    intentos += 1;
    if (iniciar() || intentos >= 150) window.clearInterval(temporizador);
  }, 100);
})();
