
(() => {
  "use strict";

  const PAGE_SIZE = 10;

  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const clearButton = document.getElementById("clearSearch");
  const results = document.getElementById("results");
  const count = document.getElementById("resultCount");
  const label = document.getElementById("resultLabel");
  const pagination = document.getElementById("pagination");

  const viewer = document.getElementById("viewer");
  const frame = document.getElementById("pdfFrame");
  const viewerTitle = document.getElementById("viewerTitle");
  const viewerMeta = document.getElementById("viewerMeta");
  const closeButton = document.getElementById("closeViewer");

  let certificates = [];
  let filtered = [];
  let currentPage = 1;
  let previousFocus = null;

  document.getElementById("year").textContent =
    new Date().getFullYear();

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s_-]+/g, " ")
      .trim();
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function safePDFPath(path) {
    if (typeof path !== "string") return null;
    if (!path.startsWith("certificates/")) return null;
    if (path.startsWith("/") || path.includes("\\")) return null;
    if (path.split("/").includes("..")) return null;
    if (!path.toLowerCase().endsWith(".pdf")) return null;

    return "./" + path.split("/")
      .map(encodeURIComponent)
      .join("/");
  }

  function searchCertificates() {
    const query = normalize(input.value);
    const terms = query.split(" ").filter(Boolean);

    filtered = certificates.filter(cert => {
      const text = normalize([
        cert.title,
        cert.tmNumber,
        cert.serialNumber,
        cert.owner,
        cert.classNumber,
        cert.id
      ].join(" "));

      return terms.every(term => text.includes(term));
    });

    currentPage = 1;
    renderResults();
  }

  function renderResults() {
    const total = filtered.length;
    const pages = Math.max(
      1, Math.ceil(total / PAGE_SIZE)
    );

    currentPage = Math.min(currentPage, pages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(
      start, start + PAGE_SIZE
    );

    count.textContent =
      `${total.toLocaleString()} certificate${total === 1 ? "" : "s"} found`;

    label.textContent = input.value.trim()
      ? "Matching certificates"
      : "Ready to search";

    clearButton.hidden = !input.value.trim();

    if (pageItems.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <strong>No certificate found</strong>
          Try another TM number, serial number or owner name.
        </div>`;

      pagination.innerHTML = "";
      return;
    }

    results.innerHTML = pageItems.map((cert, index) => `
      <article class="certificate-card"
        style="animation-delay:${Math.min(index * 25, 200)}ms">

        <div class="pdf-icon" aria-hidden="true">TM · PDF</div>

        <div class="certificate-info">
          <h3 class="certificate-title"
              title="${escapeHTML(cert.title)}">
            ${escapeHTML(cert.title)}
          </h3>

          <div class="certificate-meta">
            <span>TM No. ${escapeHTML(cert.tmNumber || "N/A")}</span>
            <span>Serial ${escapeHTML(cert.serialNumber || "N/A")}</span>
            <span>${escapeHTML(cert.owner || "")}</span>
          </div>
        </div>

        <button class="open-certificate"
          type="button"
          data-id="${escapeHTML(cert.id)}">
          Open Certificate ↗
        </button>
      </article>
    `).join("");

    renderPagination(pages);
  }

  function renderPagination(pages) {
    if (pages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    const visible = [...new Set([
      1, pages, currentPage - 1,
      currentPage, currentPage + 1
    ])]
      .filter(page => page >= 1 && page <= pages)
      .sort((a, b) => a - b);

    const buttons = [];
    buttons.push(`
      <button class="page-button"
        data-page="${currentPage - 1}"
        ${currentPage === 1 ? "disabled" : ""}>
        ‹
      </button>
    `);

    let previous = 0;

    for (const page of visible) {
      if (previous && page - previous > 1) {
        buttons.push(`<span>…</span>`);
      }

      buttons.push(`
        <button class="page-button"
          data-page="${page}"
          ${page === currentPage
            ? 'aria-current="page"' : ""}>
          ${page}
        </button>
      `);

      previous = page;
    }

    buttons.push(`
      <button class="page-button"
        data-page="${currentPage + 1}"
        ${currentPage === pages ? "disabled" : ""}>
        ›
      </button>
    `);

    pagination.innerHTML = buttons.join("");
  }

  function openCertificate(cert) {
    const path = safePDFPath(cert.path);

    if (!path) {
      alert("Invalid certificate PDF path.");
      return;
    }

    previousFocus = document.activeElement;

    viewerTitle.textContent = cert.title;
    viewerMeta.textContent =
      `TM No. ${cert.tmNumber || "N/A"} · Serial No. ${cert.serialNumber || "N/A"}`;

    // No separate download button is added.
    // Browser PDF controls may still allow saving the public PDF.
    frame.src = path + "#view=FitH";

    viewer.hidden = false;
    document.body.style.overflow = "hidden";
    closeButton.focus();
  }

  function closeViewer() {
    viewer.hidden = true;
    frame.src = "about:blank";
    document.body.style.overflow = "";

    if (previousFocus) previousFocus.focus();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    searchCertificates();
  });

  input.addEventListener("input", searchCertificates);

  clearButton.addEventListener("click", () => {
    input.value = "";
    searchCertificates();
    input.focus();
  });

  results.addEventListener("click", event => {
    const button = event.target.closest("[data-id]");
    if (!button) return;

    const cert = certificates.find(
      item => item.id === button.dataset.id
    );

    if (cert) openCertificate(cert);
  });

  pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;

    const page = Number(button.dataset.page);
    const pages = Math.max(
      1, Math.ceil(filtered.length / PAGE_SIZE)
    );

    if (!Number.isInteger(page) || page < 1 || page > pages) return;

    currentPage = page;
    renderResults();
    document.getElementById("resultsTitle")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  closeButton.addEventListener("click", closeViewer);

  viewer.addEventListener("click", event => {
    if (event.target === viewer) closeViewer();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !viewer.hidden) {
      closeViewer();
    }
  });

  fetch("/certificates.json", { cache: "no-cache" })
    .then(response => {
      if (!response.ok) {
        throw new Error("Certificate index could not be loaded.");
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error("Certificate index must be a JSON array.");
      }

      const ids = new Set();

      certificates = data.filter(cert => {
        if (!cert ||
            typeof cert.id !== "string" ||
            typeof cert.title !== "string" ||
            !safePDFPath(cert.path) ||
            ids.has(cert.id)) {
          return false;
        }

        ids.add(cert.id);
        return true;
      });

      certificates.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: "base"
        })
      );

      filtered = [...certificates];
      renderResults();
    })
    .catch(error => {
      console.error(error);
      count.textContent = "Archive unavailable";

      results.innerHTML = `
        <div class="message">
          Certificate archive could not be loaded.
          Please check certificates.json and redeploy.
        </div>`;

      pagination.innerHTML = "";
    });
})();
