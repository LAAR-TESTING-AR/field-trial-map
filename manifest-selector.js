(function () {
  "use strict";

  const viewer =
    new URLSearchParams(window.location.search)
      .get("mode") === "viewer";

  const manifest = document.querySelector(
    'link[rel="manifest"]'
  );

  if (!manifest) return;

  manifest.href = viewer
    ? "manifest-viewer.webmanifest"
    : "manifest.webmanifest";

})();
