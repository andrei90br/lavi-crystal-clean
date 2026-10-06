(() => {
  const WA = "393276726509";

  // Menu mobile
  const burger = document.querySelector(".burger");
  const nav = document.getElementById("nav");
  if (burger && nav) {
    const toggle = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
      nav.classList.toggle("open", open);
    };
    burger.addEventListener("click", () => toggle(burger.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) toggle(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  }

  // Le pagine senza modulo mandano i pulsanti "preventivo" alla pagina contatti
  if (!document.getElementById("preventivo")) {
    document.querySelectorAll('a[href="#preventivo"]').forEach((a) => (a.href = "contatti.html#preventivo"));
  }

  const form = document.getElementById("quoteForm");
  if (!form) return;

  // Tipo di cliente preselezionato in base alla pagina
  const tipo = document.body.dataset.tipo;
  const radio = tipo && form.querySelector(`input[name="tipo"][value="${CSS.escape(tipo)}"]`);
  if (radio) radio.checked = true;

  const field = (n) => form.elements[n];

  function validate() {
    let ok = true;
    const checks = [
      ["nome", (v) => v.trim().length >= 2],
      ["telefono", (v) => v.replace(/[^\d]/g, "").length >= 6],
    ];
    for (const [n, test] of checks) {
      const el = field(n);
      const bad = !test(el.value);
      el.closest("label").classList.toggle("invalid", bad);
      el.setAttribute("aria-invalid", String(bad));
      if (bad && ok) { el.focus(); ok = false; }
    }
    const priv = field("privacy");
    priv.closest("label").classList.toggle("invalid", !priv.checked);
    if (!priv.checked && ok) { priv.focus(); ok = false; }
    return ok;
  }

  function message() {
    const v = (n) => (field(n).value || "").trim();
    const rows = [
      "Buongiorno, vorrei un preventivo gratuito.",
      "",
      `Cliente: ${form.querySelector('input[name="tipo"]:checked').value}`,
      `Servizio: ${v("servizio")}`,
      `Nome: ${v("nome")}`,
      `Telefono: ${v("telefono")}`,
    ];
    if (v("comune")) rows.push(`Comune: ${v("comune")}`);
    if (v("mq")) rows.push(`Metri quadri: circa ${v("mq")}`);
    if (v("messaggio")) rows.push("", v("messaggio"));
    return rows.join("\n");
  }

  form.addEventListener("input", (e) => {
    const l = e.target.closest("label.invalid");
    if (l) l.classList.remove("invalid");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(message())}`, "_blank", "noopener");
  });
})();
