(function () {
  "use strict";

  function prepararBotonLimpiar() {
    const filaBusqueda = document.querySelector(".fila-busqueda");
    const boton = document.getElementById("limpiarFiltros");
    const resumen = document.querySelector(".resumen");
    const contador = document.getElementById("contadorSitios");

    if (!filaBusqueda || !boton) {
      return false;
    }

    if (resumen) {
      resumen.classList.remove("resumen-compacto");
    }

    if (contador) {
      contador.classList.remove("resumen-contador");
    }

    boton.classList.remove("resumen-limpiar");
    boton.setAttribute("aria-label", "Limpiar todos los filtros");
    boton.title = "Limpiar todos los filtros";

    if (boton.parentElement !== filaBusqueda) {
      filaBusqueda.appendChild(boton);
    }

    return true;
  }

  function iniciar() {
    if (prepararBotonLimpiar()) {
      return;
    }

    let intentos = 0;
    const temporizador = window.setInterval(() => {
      intentos += 1;

      if (prepararBotonLimpiar() || intentos >= 50) {
        window.clearInterval(temporizador);
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, {
      once: true
    });
  } else {
    iniciar();
  }
})();
