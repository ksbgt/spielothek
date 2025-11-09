// ---------- script.js (komplett) ----------

// URL deines Flows
const FLOW_URL = "https://default28ebaa5f323243f6a9f97bbab24287.04.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/d79c6deba27f45378d447a649b64f1f4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LpAN8V30e1596p_AbRLWzimW5KanTiX9U_ojfYHAqoM";

// Globale Variablen
let contacts = [];
let aktuelleAuswahl = [];

// ===========================
// Hilfsfunktionen
// ===========================
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
  const requiredFieldIds = ["contact-name", "contact-email", "date-from", "date-to"];
  const allRequiredFilled = requiredFieldIds.every(id => {
    const el = document.getElementById(id);
    return el && String(el.value).trim() !== "";
  });

  const sendBtn = document.getElementById("sendCartBtn");
  if (sendBtn) sendBtn.disabled = !(allRequiredFilled && aktuelleAuswahl.length > 0);
}

function formatDateGerman(isoDateStr) {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (isNaN(d)) return isoDateStr;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ===========================
// DOMContentLoaded
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 🔍 Bereich aus URL-Parameter lesen
  // ==========================================
  const params = new URLSearchParams(window.location.search);
  // const urlBereich = params.get("bereich") || "";
  const urlBereich = params.get("bereich") || ""; 

  const bereichHinweis = document.getElementById("bereich-hinweis");
    if (bereichHinweis && urlBereich) {
      bereichHinweis.textContent = urlBereich.slice(3); // oder z. B. "01 Spielothek"
    }

  const btn = document.getElementById("btn"); // „Liste abrufen“
  const cartIndicator = document.getElementById("cart-indicator");
  const miniCart = document.getElementById("mini-cart");
  const closeMiniCart = document.getElementById("closeMiniCart");
  const sendBtn = document.getElementById("sendCartBtn");

  // 1️⃣ Artikel-Liste laden
  if (btn) {
    btn.addEventListener("click", async () => {
      if (contacts.length > 0 || aktuelleAuswahl.length > 0) {
        const confirmReload = confirm(
          "Die aktuelle Auswahlliste wird gelöscht und neu geladen.\n\nMöchten Sie fortfahren?"
        );
        if (!confirmReload) return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "Lade...";

        aktuelleAuswahl = [];
        updateCartIndicator();

        ["contact-name", "contact-email", "date-from", "date-to", "contact-info", "contact-organisation"].forEach(id => {
          const f = document.getElementById(id);
          if (f) f.value = "";
        });

        const BASE_URL = "https://ksbgt.github.io/spielothek/";
        const resLocal = await fetch("Exports/Artikel.json");
        const daten = await resLocal.json();

        //Kontrolle für Konsole auf der Webseite
        console.log("👉 Geladene Artikel (1. Datensatz):", daten[0]);
        console.log("👉 Alle Schlüssel im 1. Datensatz:", Object.keys(daten[0]));

        // 🔍 Nur Artikel des aktiven Bereichs laden (wenn Parameter angegeben)
        let gefilterteDaten = daten;
        if (urlBereich) {
          gefilterteDaten = daten.filter(item => item.bereich === urlBereich);
        }

        contacts = gefilterteDaten.map(item => {
          const bildPfad = item.bild
            ? (item.bild.startsWith("/") ? BASE_URL + item.bild : BASE_URL + "/" + item.bild)
            : BASE_URL + "/Standardbilder/standard.jpg";

          const minAnz = parseInt(item.minAnzahl ?? "0", 10);
          const maxAnz = parseInt(item.maxAnzahl ?? "1", 10);

          return {
            barcode: item.barcode || "",
            artikel: item.artikel || item.name || "Unbekannt",
            name2: item.name2 || "",
            minAnzahl: minAnz,
            maxAnzahl: maxAnz,
            bereich: item.bereich || "",
            bild: bildPfad
          };
        });

        renderKacheln(contacts);
      } catch (err) {
        console.error("Fehler beim Abrufen der Artikeldaten:", err);
        alert("Fehler beim Abrufen der Artikeldaten: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Liste abrufen";
      }
    });

    // ✅ Auto-Load gehört HIERHIN (außerhalb des Eventlisteners)
    if (urlBereich) {
      console.log("Auto-Load aktiv für Bereich:", urlBereich);
      btn.click();                // Klickt automatisch
      btn.style.display = "none"; // Optional: Button ausblenden
    }
  }

  // 2️⃣ Warenkorb-Indikator togglen
  if (cartIndicator && miniCart) {
    cartIndicator.addEventListener("click", () => miniCart.classList.toggle("hidden"));
  }

  // 3️⃣ Mini-Cart schließen
  if (closeMiniCart && miniCart) {
    closeMiniCart.addEventListener("click", () => miniCart.classList.add("hidden"));
  }

  // 4️⃣ Datumsfelder & Validierung
  const dateFrom = document.getElementById("date-from");
  const dateTo = document.getElementById("date-to");

  if (dateFrom && dateTo) {
    const today = new Date();
    const isoToday = today.toISOString().split("T")[0];
    dateFrom.min = isoToday;
    dateTo.min = isoToday;

    const validateDates = () => {
      const from = dateFrom.value;
      const to = dateTo.value;
      if (from && from < isoToday) dateFrom.value = isoToday;
      if (to && from && to < from) dateTo.value = from;
      if (to && to < isoToday) dateTo.value = isoToday;
      dateTo.min = dateFrom.value || isoToday;
      checkFormFields();
    };

    dateFrom.addEventListener("input", validateDates);
    dateTo.addEventListener("input", validateDates);
    dateFrom.addEventListener("change", validateDates);
    dateTo.addEventListener("change", validateDates);
  }

  // 5️⃣ Formularfelder prüfen
  ["contact-name", "contact-email", "date-from", "date-to", "contact-info", "contact-organisation"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", checkFormFields);
  });

  // 6️⃣ Minimalprüfung E-Mail
  const emailInput = document.getElementById("contact-email");
  if (emailInput) {
    emailInput.addEventListener("input", () => {
      const email = emailInput.value.trim();
      if (email === "" || !email.includes("@")) emailInput.classList.add("input-fehler");
      else emailInput.classList.remove("input-fehler");
      checkFormFields();
    });
  }

  // 7️⃣ Zusammenfassung + Modal + Versand
  if (sendBtn) sendBtn.addEventListener("click", openSummaryModal);

  // Initial
  checkFormFields();
}); // Ende DOMContentLoaded

// ===========================
// Modal & Versand
// ===========================
function openSummaryModal() {
  const name = document.getElementById("contact-name")?.value.trim() || "";
  const email = document.getElementById("contact-email")?.value.trim() || "";
  const orga = document.getElementById("contact-organisation")?.value.trim() || "";
  const info = document.getElementById("contact-info")?.value.trim() || "";
  const von = document.getElementById("date-from")?.value || "";
  const bis = document.getElementById("date-to")?.value || "";

  if (!name || !email || !von || !bis) return alert("Bitte alle Pflichtfelder ausfüllen.");
  if (new Date(bis) < new Date(von)) return alert("Das Enddatum darf nicht vor dem Startdatum liegen.");

  let messageHTML = `<strong>Bitte die Eingaben prüfen:</strong><br>`;
  messageHTML += `<p><strong>Name:</strong><br> ${escapeHtml(name)}<br></p>`;
  messageHTML += `<p><strong>E-Mail:</strong><br> ${escapeHtml(email)}<br></p>`;
  messageHTML += `<p><strong>Organisation:</strong><br> ${escapeHtml(orga)}<br></p>`;
  messageHTML += `<p><strong>Zeitraum:</strong><br> ${escapeHtml(formatDateGerman(von))} bis ${escapeHtml(formatDateGerman(bis))}<br></p>`;
  const formattedInfo = info ? escapeHtml(info).replace(/\n/g,"<br>") : "—";
  messageHTML += `<strong>Mitteilung:</strong><br>${formattedInfo}<br><br>`;
  messageHTML += `<strong>Ausgewählte Artikel:</strong><br>`;
  if (aktuelleAuswahl.length === 0) messageHTML += `Keine Artikel ausgewählt.<br>`;
  else {
    messageHTML += `<ol>`;
    aktuelleAuswahl.forEach(a => messageHTML += `<li>${escapeHtml(a.artikel)} (${escapeHtml(String(a.Auswahl_Anzahl))} x)</li>`);
    messageHTML += `</ol>`;
  }

  // Modal erzeugen/finden
  let modal = document.getElementById("summary-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "summary-modal";
    modal.className = "modal hidden";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content" role="dialog" aria-modal="true">
        <button class="modal-close">&times;</button>
        <div id="summary-scroll" style="max-height:60vh; overflow-y:auto; margin-bottom:10px; padding-right:4px;"></div>
        <div id="summary-status" style="font-weight:bold; margin-bottom:10px;"></div>
        <div class="modal-actions">
          <button id="confirm-btn">Senden</button>
          <button id="cancel-btn">Abbrechen</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const scrollContainer = modal.querySelector("#summary-scroll");
  const statusEl = modal.querySelector("#summary-status");
  const confirmBtn = modal.querySelector("#confirm-btn");
  const closeBtn = modal.querySelector(".modal-close");
  const cancelBtn = modal.querySelector("#cancel-btn");

  scrollContainer.innerHTML = messageHTML;
  statusEl.textContent = "";
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const closeModal = () => {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = () => { resetFormAndCart(); closeModal(); };
  document.addEventListener("keydown", e => { if(e.key==="Escape") closeModal(); }, { once:true });

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    statusEl.textContent = "⏳ Sende Anfrage...";
    statusEl.style.color = "#d7060aff";

    const ausgewaehltSortiert = [...aktuelleAuswahl].sort((a,b) => a.artikel.localeCompare(b.artikel,"de",{sensitivity:"base"}));
    const payload = { name, email, ausleih_von: von, ausleih_bis: bis, info, ausgewaehlt: ausgewaehltSortiert.map(a => ({
      barcode: a.barcode,
      artikel: a.artikel,
      Kategoriename: a.Kategoriename||"",
      Auswahl_Anzahl: a.Auswahl_Anzahl
    }))};

    try {
      const resFlow = await fetch(FLOW_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const antwort = await resFlow.json();

      if (antwort.success) {
        statusEl.textContent = "✅ Anfrage erfolgreich gesendet!";
        statusEl.style.color = "#06803d";
        // Senden-Button ausblenden
        confirmBtn.style.display = "none";

        // Die Auswahl wird **noch nicht** zurückgesetzt – passiert erst bei Abbrechen
      } else {
        statusEl.textContent = "❌ Anfrage konnte nicht verarbeitet werden: " + (antwort.message||"");
        statusEl.style.color = "#d00";
        confirmBtn.disabled=false;
      }
    } catch(err) {
      console.error(err);
      statusEl.textContent="❌ Anfrage konnte nicht gesendet werden. Bitte prüfen Sie Ihre Internetverbindung.";
      statusEl.style.color="#d00";
      confirmBtn.disabled=false;
    } finally { checkFormFields(); }
  };
}

// ===========================
// Mini-Cart & Events
// ===========================
function updateCartIndicator() {
  const count = aktuelleAuswahl.length;
  const cartCountEl = document.getElementById("cart-count");
  if(cartCountEl) cartCountEl.textContent=count;
  renderMiniCart();
  checkFormFields();
}

function renderMiniCart() {
  const list = document.getElementById("mini-cart-items");
  if(!list) return;
  list.innerHTML="";
  if(!aktuelleAuswahl.length) { list.innerHTML="<p><em>Keine Artikel ausgewählt.</em></p>"; return; }

  aktuelleAuswahl.forEach(a => {
    const item=document.createElement("div");
    item.className="cart-item";
    item.innerHTML=`
      <button class="remove-item" data-barcode="${escapeHtml(a.barcode)}">×</button>
      <div class="text-block">
        <div style="font-weight:600;">${escapeHtml(a.artikel)}</div>
        <div style="font-weight:200;">(${escapeHtml(String(a.Auswahl_Anzahl))} x)</div>
      </div>`;
    list.appendChild(item);
  });

  list.querySelectorAll(".remove-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const barcode = btn.dataset.barcode;
      aktuelleAuswahl = aktuelleAuswahl.filter(a => a.barcode!==barcode);
      const cb = document.querySelector(`.select-artikel[data-barcode="${barcode}"]`);
      if(cb){ cb.checked=false; const input=cb.closest(".karte")?.querySelector(".anzahl-input"); if(input){input.value=1; input.classList.remove("input-fehler");} }
      updateCartIndicator();
    });
  });
}

// ===========================
// Kacheln rendern
// ===========================
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
    const nameSafe = escapeHtml(item.artikel || "Unbekannt");
    const barcodeSafe = escapeHtml(item.barcode || "");
    const maxAnz = item.maxAnzahl || 0;

    // ✅ Startwert für Inputfeld berechnen: 1, wenn maxAnz > 0, sonst 0
    const startWert = maxAnz > 0 ? 1 : 0;

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
      <p>
        <strong>Max. ${maxAnz}</strong>
        <label> : Anzahl</label>
        <input type="number" class="anzahl-input" data-barcode="${barcodeSafe}" 
               value="${startWert}" min="0" max="${maxAnz}">
      </p>
      <button class="details-btn" data-barcode="${barcodeSafe}">Details</button>
    `;
    grid.appendChild(karte);
  });

  container.appendChild(grid);
  initCartEvents();
}
// renderKacheln Ende

// ===========================
// Events für Kacheln / Warenkorb
// ===========================
function initCartEvents() {
  const miniCartEl = document.getElementById("mini-cart");

  document.querySelectorAll(".select-artikel").forEach(cb => {
    const barcode = cb.dataset.barcode;
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
            artikel: artikelObj.artikel || artikelObj.name || "Unbekannt",
            Kategoriename: artikelObj.bereich || "",
            Auswahl_Anzahl: menge
          });
        }
      } else {
        aktuelleAuswahl = aktuelleAuswahl.filter(a => a.barcode !== barcode);
      }

      updateCartIndicator();
      if (aktuelleAuswahl.length > 0 && miniCartEl?.classList.contains("hidden")) miniCartEl.classList.remove("hidden");
    });
  });

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

  document.querySelectorAll(".details-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const barcode = btn.dataset.barcode;
      const artikelObj = contacts.find(c => c.barcode === barcode);
      if (!artikelObj) return alert("Keine Details gefunden.");
      openDetailsModal(artikelObj);
    });
  });

  updateCartIndicator();

  // 🩹 Fix für Tablets: letzte "1" löschen erlauben
  document.querySelectorAll(".anzahl-input").forEach(input => {
    input.addEventListener("beforeinput", e => {
      if (e.inputType === "deleteContentBackward" && input.value.length === 1) {
        input.value = "";
        e.preventDefault();
      }
    });
  });
}

// ===========================
// Artikeldetails-Modal
// ===========================
function openDetailsModal(artikel){
  let modal=document.getElementById("details-modal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="details-modal";
    modal.innerHTML=`
      <div class="modal-overlay"></div>
      <div class="modal-content" role="dialog" aria-modal="true">
        <button class="modal-close">×</button>
        <div id="details-body"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".modal-close").addEventListener("click",()=>modal.remove());
    modal.querySelector(".modal-overlay").addEventListener("click",()=>modal.remove());
    document.addEventListener("keydown",e=>{if(e.key==="Escape") modal.remove();});
  }
  const body=modal.querySelector("#details-body");
  const bild=artikel.bild||"";
  body.innerHTML=`
    <h3 class="artikel-titel">${escapeHtml(artikel.artikel||"Artikel")}</h3>
    <h4 class="artikel-subtitel">${escapeHtml(artikel.name2||"Keine zusätzliche Beschreibung")}</h4>
    <dl class="artikel-details">
      <div><dt>Max. Anzahl:</dt><dd>${escapeHtml(String(artikel.maxAnzahl??"—"))}</dd></div>
      <div><dt>Code:</dt><dd>${escapeHtml(artikel.barcode||"—")}</dd></div>
      <div><dt>Bereich:</dt><dd>${escapeHtml(artikel.bereich||"—")}</dd></div>
    </dl>
    ${bild? `<img class="artikel-bild" src="${escapeHtml(bild)}" alt="${escapeHtml(artikel.name)}">`:""}
  `;
}

// ===========================
// Formular & Warenkorb zurücksetzen
// ===========================
function resetFormAndCart(){
  ["contact-name","contact-email","date-from","date-to","contact-info","contact-organisation"].forEach(id=>{
    const f=document.getElementById(id); if(f) f.value="";
  });
  aktuelleAuswahl=[];
  document.querySelectorAll(".select-artikel").forEach(cb=>cb.checked=false);
  document.querySelectorAll(".anzahl-input").forEach(input=>{input.value=1; input.classList.remove("input-fehler");});
  const miniCart=document.getElementById("mini-cart");
  if(miniCart) miniCart.classList.add("hidden");
  updateCartIndicator();
}

// ===========================
// Ende script.js
