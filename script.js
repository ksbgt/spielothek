// ---------- script.js (komplett) ----------

// URL deines Flows
const FLOW_URL = "https://default28ebaa5f323243f6a9f97bbab24287.04.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/d79c6deba27f45378d447a649b64f1f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LpAN8V30e1596p_AbRLWzimW5KanTiX9U_ojfYHAqoM";

// Globale Variablen
let contacts = [];           // alle geladenen Artikel
let aktuelleAuswahl = [];    // aktuell ausgewählte Artikel

/* ===========================
   Hilfsfunktionen
   =========================== */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function checkFormFields() {
  const formFieldIds = ["contact-name", "contact-email", "date-from", "date-to"];
  const allFilled = formFieldIds.every(id => {
    const el = document.getElementById(id);
    return el && String(el.value).trim() !== "";
  });
  const sendBtn = document.getElementById("sendCartBtn");
  if (sendBtn) sendBtn.disabled = !(allFilled && aktuelleAuswahl.length > 0);
}

function formatDateGerman(isoDateStr) {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (isNaN(d)) return isoDateStr; // falls ungültig
  return d.toLocaleDateString("de-DE"); // z. B. 26.10.2025
}

/* ===========================
   DOMContentLoaded
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn"); // „Liste abrufen“
  const cartIndicator = document.getElementById("cart-indicator");
  const miniCart = document.getElementById("mini-cart");
  const closeMiniCart = document.getElementById("closeMiniCart");
  const sendBtn = document.getElementById("sendCartBtn");

// 1️⃣ Artikel-Liste laden
if (btn) {
  btn.addEventListener("click", async () => {
    // Nur warnen, wenn bereits Daten vorhanden sind
    if (contacts.length > 0 || aktuelleAuswahl.length > 0) {
      const confirmReload = confirm(
        "Die aktuelle Auswahlliste wird gelöscht und neu geladen.\n\nMöchten Sie fortfahren?"
      );
      if (!confirmReload) return; // Abbrechen = nichts tun
    }

    try {
      btn.disabled = true;
      btn.textContent = "Lade...";

      // Alte Auswahl zurücksetzen
      aktuelleAuswahl = [];
      updateCartIndicator();

      // Formulafelder zurücksetzen
      ["contact-name", "contact-email", "date-from", "date-to"].forEach(id => {
        const f = document.getElementById(id);
        if (f) f.value = "";
      });


      const resLocal = await fetch("https://ksbgt.github.io/spielothek/Artikel.json");
      const daten = await res.json();

      const vorherigeLaenge = contacts.length; // merken, ob schon Daten da waren

      contacts = daten.map(item => ({
        barcode: item.barcode || "",
        artikel: item.artikel || "",
        name2: item.name2 || "",
        barcode: item.barcode || "",
        maxAnzahl: parseInt(item.maxAnzahl ?? "1", 10),
        bereich: item.bereich || "",
        bild: item.bild ? (item.bild.startsWith("/") ? item.bild : "/" + item.bild) : ""
      }));

      renderKacheln(contacts);

      // Meldung nur anzeigen, wenn vorher schon Daten vorhanden waren
      if (vorherigeLaenge > 0) {
        alert("Artikelliste wurde neu geladen.");
      }

    } catch (err) {
      console.error("Fehler beim Laden:", err);
      alert("Fehler beim Abrufen der Artikeldaten: " + (err.message || err));
    } finally {
      btn.disabled = false;
      btn.textContent = "Liste erneut abrufen";
    }
  });
}


  // 2️⃣ Warenkorb-Indikator togglen
  if (cartIndicator && miniCart) {
    cartIndicator.addEventListener("click", () => miniCart.classList.toggle("hidden"));
  }

  // 3️⃣ Mini-Cart schließen
  if (closeMiniCart && miniCart) {
    closeMiniCart.addEventListener("click", () => miniCart.classList.add("hidden"));
  }

  // 🕒 Datumsfelder vorbelegen & validieren
  const dateFrom = document.getElementById("date-from");
  const dateTo = document.getElementById("date-to");

  if (dateFrom && dateTo) {
    const today = new Date();
    const isoToday = today.toISOString().split("T")[0];

    dateFrom.min = isoToday;  // frühestes erlaubtes Datum
    dateTo.min = isoToday;

    const validateDates = () => {
      if (dateTo.value < dateFrom.value) {
        dateTo.value = dateFrom.value; // erlauben, dass beides gleich ist
      }
      dateTo.min = dateFrom.value;
      checkFormFields();
    };

    dateFrom.addEventListener("input", validateDates);
    dateTo.addEventListener("input", validateDates);
  }


  // 4️⃣ Formularfelder prüfen
  ["contact-name", "contact-email", "date-from", "date-to"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", checkFormFields);
  });

// 🔍 E-Mailfeld minimal prüfen (nicht leer + muss @ enthalten)
const emailInput = document.getElementById("contact-email");
if (emailInput) {
  emailInput.addEventListener("input", () => {
    const email = emailInput.value.trim();
    if (email === "" || !email.includes("@")) {
      emailInput.classList.add("input-fehler");
    } else {
      emailInput.classList.remove("input-fehler");
    }
    checkFormFields(); // Schaltfläche neu prüfen
  });
}

  // 5️⃣ Auswahl an Flow senden (mit scrollbarem Modal & Statusanzeige)
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      openSummaryModal();
    });
  }

  function openSummaryModal() {
    const name = document.getElementById("contact-name")?.value.trim() || "";
    const email = document.getElementById("contact-email")?.value.trim() || "";
    const von = document.getElementById("date-from")?.value || "";
    const bis = document.getElementById("date-to")?.value || "";

  if (!name || !email || !von || !bis) {
    alert("Bitte alle Pflichtfelder ausfüllen.");
    return;
  }

  if (new Date(bis) < new Date(von)) {
    alert("Das Enddatum darf nicht vor dem Startdatum liegen.");
    return;
  }

  // Zusammenfassung HTML
  let messageHTML = `<strong>Bitte die Eingaben prüfen:</strong><br><br>`;
  messageHTML += `Name: ${escapeHtml(name)}<br>Email: ${escapeHtml(email)}<br>Zeitraum: ${escapeHtml(formatDateGerman(von))} bis: ${escapeHtml(formatDateGerman(bis))}<br><br>`;
  messageHTML += `<strong>Ausgewählte Artikel:</strong><br>`;
  if (aktuelleAuswahl.length === 0) {
    messageHTML += `Keine Artikel ausgewählt.<br>`;
  } else {
    messageHTML += `<ol>`; // geordnete Liste
    aktuelleAuswahl.forEach((a, index) => {
      messageHTML += `<li>${escapeHtml(a.artikel)} (${escapeHtml(String(a.Auswahl_Anzahl))} x)</li>`;
    });
    messageHTML += `</ol>`;
  }

  // Modal erzeugen oder finden
  let modal = document.getElementById("summary-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "summary-modal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true">
        <button class="modal-close">&times;</button>
        <div id="summary-scroll" style="max-height:60vh; overflow-y:auto; margin-bottom:10px; padding-right:4px;"></div>
        <div id="summary-status" style="font-weight:bold; margin-bottom:10px;"></div>
        <div class="modal-actions">
          <button id="confirm-btn">OK</button>
          <button id="cancel-btn">Abbrechen</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const scrollContainer = modal.querySelector("#summary-scroll");
  const statusEl = modal.querySelector("#summary-status");
  const confirmBtn = modal.querySelector("#confirm-btn");
  scrollContainer.innerHTML = messageHTML;
  statusEl.textContent = ""; // Status zurücksetzen

  const closeModal = () => modal.classList.add("hidden");

  // Event-Handler
  modal.querySelector(".modal-close").onclick = closeModal;
  modal.querySelector("#cancel-btn").onclick = closeModal;
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  }, { once: true });

  // OK-Button
    confirmBtn.onclick = async function() {   // normale Function, kein Arrow
    this.disabled = true;                    // Button wird deaktiviert
    const okBtn = this;
    okBtn.disabled = true;      // sofort deaktivieren
    statusEl.textContent = "⏳ Sende Anfrage...";
    statusEl.style.color = "#0680d7";

    const payload = {
      name,
      email,
      ausleih_von: von,
      ausleih_bis: bis,
      ausgewaehlt: aktuelleAuswahl.map(a => ({
        barcode: a.barcode,
        artikel: a.artikel,
        Kategoriename: a.Kategoriename || "",
        Auswahl_Anzahl: a.Auswahl_Anzahl
      }))
    };

    try {
      sendBtn.disabled = true;

      const resFlow = await fetch(FLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const antwort = await resFlow.json();

      if (antwort.success) {
        statusEl.textContent = "✅ Anfrage erfolgreich gesendet!";
        statusEl.style.color = "#06803d";

        // Alles zurücksetzen
        aktuelleAuswahl = [];
        document.querySelectorAll(".select-artikel").forEach(cb => cb.checked = false);
        document.querySelectorAll(".anzahl-input").forEach(input => {
          input.value = 1;
          input.classList.remove("input-fehler");
        });
        ["contact-name","contact-email","date-from","date-to"].forEach(id => {
          const f = document.getElementById(id);
          if(f) f.value="";
        });
        if(miniCart) miniCart.classList.add("hidden");
        updateCartIndicator();

      } else {
        statusEl.textContent = "❌ Anfrage konnte nicht verarbeitet werden: " + (antwort.message || "");
        statusEl.style.color = "#d00";
      }

    } catch(err) {
      console.error(err);
      statusEl.textContent = "❌ Anfrage konnte nicht gesendet werden. Bitte prüfen Sie Ihre Internetverbindung.";
      statusEl.style.color = "#d00";
    } finally {
      sendBtn.disabled = false;
      okBtn.disabled = false;   // Button wieder aktivieren
      checkFormFields();
    }
  };

  modal.classList.remove("hidden");
}


  // Initialer Zustand
  checkFormFields();
});

/* ===========================
   Kacheln rendern
   =========================== */
function renderKacheln(contactsArray) {
  const container = document.getElementById("anzeige");
  if (!container) return;

  container.innerHTML = "";

  if (!contactsArray?.length) {
    container.innerHTML = "<p><em>Keine Artikeldaten vorhanden.</em></p>";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "karten-container";

  contactsArray.forEach(item => {
    const idSafe = escapeHtml(item.id);
    const nameSafe = escapeHtml(item.artikel || "Unbekannt");
    const barcodeSafe = escapeHtml(item.barcode || "");
    const maxAnzahl = item.maxAnzahl || 1;
    const bildSrc = escapeHtml(item.bild || "");

const karte = document.createElement("div");
karte.className = "karte";
karte.innerHTML = `
  <div class="checkbox-wrapper" style="display:flex;align-items:center;justify-content:flex-start;position:relative;">
    <input type="checkbox" class="select-artikel" data-barcode="${barcodeSafe}" aria-label="Artikel auswählen">
    <span class="tooltip-placeholder" data-tooltip="Auswählen:\n${nameSafe}"></span>
  </div>
  <div style="margin-top:10px;">
    ${bildSrc ? `<img src="${bildSrc}" alt="${nameSafe}" style="width:150px;border-radius:8px;">` : ""}
  </div>
  <h4>${nameSafe}</h4>
  <p>${barcodeSafe}</p>
  <p><strong>Max. ${maxAnzahl}</strong>
    <label> : Anzahl</label>
    <input type="number" class="anzahl-input" data-barcode="${barcodeSafe}" value="1" min="1" max="${maxAnzahl}">
  </p>
  <button class="details-btn" data-barcode="${barcodeSafe}">Details</button>
`;
grid.appendChild(karte);
  });

  container.appendChild(grid);
  initCartEvents();
}

/* ===========================
   Event-Handling
   =========================== */
function initCartEvents() {
  const miniCartEl = document.getElementById("mini-cart");

// Checkboxen
document.querySelectorAll(".select-artikel").forEach(cb => {
  const barcode = cb.dataset.barcode;
  const artikelObj = contacts.find(c => c.barcode === barcode);

  // Tooltip hinzufügen (nur wenn Artikel gefunden)
  if (artikelObj) {
    cb.dataset.tooltip = `Auswählen:\n${artikelObj.artikel}`;
  }

  cb.addEventListener("change", () => {
    const karte = cb.closest(".karte");
    const input = karte?.querySelector(".anzahl-input");
    const menge = parseInt(input?.value || 1, 10);
    const artikelObj = contacts.find(c => c.barcode === barcode);
    if (!artikelObj) return;

    if (cb.checked) {
      if (!aktuelleAuswahl.find(a => a.barcode === barcode)) {
        aktuelleAuswahl.push({
          barcode,
          artikel: artikelObj.artikel,
          Kategoriename: artikelObj.bereich || "",
          Auswahl_Anzahl: menge
        });
      }
    } else {
      aktuelleAuswahl = aktuelleAuswahl.filter(a => a.barcode !== barcode);
    }

    updateCartIndicator();
    if (aktuelleAuswahl.length > 0 && miniCartEl?.classList.contains("hidden")) {
      miniCartEl.classList.remove("hidden");
    }
  });
});

  // Anzahl ändern
  document.querySelectorAll(".anzahl-input").forEach(input => {
  input.addEventListener("input", () => {
    const barcode = input.dataset.barcode;
    let wert = parseInt(input.value || 1, 10);
    const max = parseInt(input.max || 1, 10);
    if (isNaN(wert) || wert < 1) wert = 1;
    if (wert > max) {
      wert = max;
      input.classList.add("input-fehler");
    } else {
      input.classList.remove("input-fehler");
    }
    input.value = wert;

    const artikel = aktuelleAuswahl.find(a => a.barcode === barcode);
    if (artikel) artikel.Auswahl_Anzahl = wert;
    updateCartIndicator();
  });
});

  // Details anzeigen
  document.querySelectorAll(".details-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const barcode = btn.dataset.barcode;
      const artikel = contacts.find(c => c.barcode === barcode);
      if (!artikel) return alert("Keine Details gefunden.");
      openDetailsModal(artikel);
    });
  });

  updateCartIndicator();
}

/* ===========================
   Modal: Artikeldetails
   =========================== */
function openDetailsModal(artikel) {
  let modal = document.getElementById("details-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "details-modal";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" role="dialog" aria-modal="true">
        <button class="modal-close">×</button>
        <div id="details-body"></div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector(".modal-close").addEventListener("click", () => modal.remove());
    modal.querySelector(".modal-overlay").addEventListener("click", () => modal.remove());
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") modal.remove();
    });
  }

  const body = modal.querySelector("#details-body");
  const bild = artikel.bild || "";
  body.innerHTML = `
    <h3 class="artikel-titel">${escapeHtml(artikel.artikel || "Artikel")}</h3>
    <h4 class="artikel-subtitel">${escapeHtml(artikel.name2 || "Keine zusätzliche Beschreibung")}</h4>
    <dl class="artikel-details">
      <div>
        <dt>Max. Anzahl:</dt>
        <dd>${escapeHtml(String(artikel.maxAnzahl ?? "—"))}</dd>
      </div>
      <div>
        <dt>Code:</dt>
        <dd>${escapeHtml(artikel.barcode || "—")}</dd>
      </div>
      <div>
        <dt>Bereich:</dt>
        <dd>${escapeHtml(artikel.bereich || "—")}</dd>
      </div>
    </dl>
    ${bild ? `<img class="artikel-bild" src="${escapeHtml(bild)}" alt="${escapeHtml(artikel.name)}">` : ""}
  `;
}

/* ===========================
   Mini-Cart
   =========================== */
function updateCartIndicator() {
  const count = aktuelleAuswahl.length;
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) cartCountEl.textContent = count;
  renderMiniCart();
  checkFormFields();
}

function renderMiniCart() {
  const list = document.getElementById("mini-cart-items");
  if (!list) return;
  list.innerHTML = "";

  if (!aktuelleAuswahl.length) {
    list.innerHTML = "<p><em>Keine Artikel ausgewählt.</em></p>";
    return;
  }

aktuelleAuswahl.forEach(a => {
  const item = document.createElement("div");
  item.className = "cart-item";
  item.innerHTML = `
    <button class="remove-item" data-barcode="${escapeHtml(a.barcode)}">×</button>
    <div class="text-block">
      <div style="font-weight:600;">${escapeHtml(a.artikel)}</div>
      <div style="font-weight:200;">(${escapeHtml(String(a.Auswahl_Anzahl))} x)</div>
    </div>
  `;
  list.appendChild(item);
});


  // Entfernen
  list.querySelectorAll(".remove-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const barcode = btn.dataset.barcode;
      aktuelleAuswahl = aktuelleAuswahl.filter(a => a.barcode !== barcode);

      const cb = document.querySelector(`.select-artikel[data-barcode="${barcode}"]`);
      if (cb) {
        cb.checked = false;
        const input = cb.closest(".karte")?.querySelector(".anzahl-input");
        if (input) {
          input.value = 1;
          input.classList.remove("input-fehler");
        }
      }
      updateCartIndicator();
    });
  });
}

/* ===========================
   Ende script.js
   =========================== */
