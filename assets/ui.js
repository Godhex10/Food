/* =========================================================
   COMMINT BUKA — shared UI helpers for checkout, tracking and dashboards
   ========================================================= */
const UI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const plate = (img, alt = "") => `<div class="plate"><div class="food"><img src="${img}" alt="${esc(alt)}" loading="lazy" decoding="async"></div></div>`;
  const brandHTML = () => STORE.name.toUpperCase().replace(/^(\S+)/, "<b>$1</b>");

  /* time */
  const time = t => new Date(t).toLocaleTimeString("en-NG", { hour:"numeric", minute:"2-digit" });
  const date = t => new Date(t).toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric" });
  const dateTime = t => date(t) + ", " + time(t);
  function ago(t, now = Date.now()){
    const m = Math.floor((now - t) / 60000);
    if(m < 1) return "just now"; if(m < 60) return m + " min ago";
    const h = Math.floor(m / 60); if(h < 24) return h + "h " + (m % 60) + "m ago";
    return date(t);
  }
  const mins = m => m < 60 ? Math.floor(m) + " min" : Math.floor(m / 60) + "h " + Math.floor(m % 60) + "m";

  /* tags */
  const statusTag = s => `<span class="tag ${Store.STATUS[s].tone}">${Store.STATUS[s].label}</span>`;
  const payTag = o => o.payment.status === "paid" ? `<span class="tag green">Paid</span>` : o.status === "cancelled" ? `<span class="tag grey">Not paid</span>` : `<span class="tag amber">Awaiting transfer</span>`;
  function printTag(o){
    const s = Store.printState(o);
    return s === "printed" ? `<span class="tag grey">Printed</span>` : s === "failed" ? `<span class="tag red">Print failed</span>` : `<span class="tag amber">Print pending</span>`;
  }
  const typeTag = o => o.type === "delivery" ? `<span class="tag plain dark">Delivery</span>` : `<span class="tag plain">Pickup</span>`;
  const optsText = sel => Object.values(sel || {}).flat().join(" · ");

  function itemsHTML(o){
    return `<div class="items">${o.items.map(i => {
      const m = byId(i.id);
      const extra = [optsText(i.sel), i.note ? "“" + i.note + "”" : ""].filter(Boolean).join(" · ");
      return `<div class="item"><div class="mini-plate">${plate(m ? m.img : "", i.name)}</div>
        <div><b>${i.qty} × ${esc(i.name)}</b>${extra ? `<div class="opts">${esc(extra)}</div>` : ""}</div>
        <b>${naira(i.total)}</b></div>`;
    }).join("")}</div>`;
  }
  function totalsHTML(o){
    return `<div class="sum"><span>Subtotal</span><b>${naira(o.subtotal)}</b></div>
      <div class="sum"><span>${o.type === "delivery" ? "Delivery · " + esc(o.address.area) : "Pickup"}</span><b>${o.fee ? naira(o.fee) : "Free"}</b></div>
      <div class="sum total"><span>Total</span><b>${naira(o.total)}</b></div>`;
  }
  function bankHTML(amount, ref){
    const b = STORE.bank;
    return `<div class="bank">
      <div class="row"><span>Bank</span><b>${esc(b.bank)}</b></div>
      <div class="row"><span>Account name</span><b>${esc(b.name)}</b></div>
      <div class="row"><b class="acct mono">${esc(b.number)}</b><button class="copy" data-copy="${esc(b.number)}">Copy</button></div>
      ${amount != null ? `<div class="row"><span>Amount</span><b>${naira(amount)}</b></div>` : ""}
      ${ref ? `<div class="row"><span>Narration</span><b class="mono">${esc(ref)}</b><button class="copy" data-copy="${esc(ref)}">Copy</button></div>` : ""}
    </div>`;
  }
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-copy]"); if(!c) return;
    const t = c.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Copied " + t), () => toast("Copy: " + t));
  });

  /* kitchen ticket — every field the proposal (section 6) asks for */
  function ticketHTML(o, job){
    const b = Store.branch(o.branch);
    const line = (l, r) => `<div class="r"><span>${l}</span><span>${r}</span></div>`;
    return `<div class="ticket">
      <div class="c big">${esc(STORE.name.toUpperCase())}</div>
      <div class="c">${esc(b.name)} branch · ${esc(b.phone)}</div>
      ${job && job.kind === "reprint" ? `<div class="stamp">*** REPRINT #${job.n} ***<br>${esc(job.by)} · ${time(job.at)}</div>` : ""}
      <hr>
      <div class="c xl">${esc(o.id)}</div>
      <div class="c">${dateTime(o.createdAt)}</div>
      <hr>
      <div class="inv">${o.type === "delivery" ? "DELIVERY" : "PICKUP"}</div>
      ${line("Customer", esc(o.customer.name))}
      ${line("Phone", esc(o.customer.phone))}
      ${o.type === "delivery" ? `${line("Area", esc(o.address.area))}<div>${esc(o.address.street)}</div>${o.address.extra ? `<div>${esc(o.address.extra)}</div>` : ""}` : ""}
      <hr>
      ${o.items.map(i => `${line(`<b>${i.qty} x ${esc(i.name)}</b>`, naira(i.total))}${optsText(i.sel) ? `<div class="opt">- ${esc(optsText(i.sel))}</div>` : ""}${i.note ? `<div class="opt">! ${esc(i.note)}</div>` : ""}`).join("")}
      <hr>
      ${o.instructions ? `<div><b>NOTE:</b> ${esc(o.instructions)}</div><hr>` : ""}
      ${line("Subtotal", naira(o.subtotal))}
      ${line(o.type === "delivery" ? "Delivery fee" : "Pickup", o.fee ? naira(o.fee) : "0")}
      ${line("<b>TOTAL</b>", "<b>" + naira(o.total) + "</b>")}
      <hr>
      <div class="stamp">PAYMENT: ${o.payment.status === "paid" ? "PAID" : "AWAITING TRANSFER"}</div>
      <div class="c">Printed ${time(job ? (job.doneAt || job.at) : Date.now())}</div>
    </div>`;
  }
  function printReal(o, job){
    let area = document.querySelector(".print-area");
    if(!area){ area = document.createElement("div"); area.className = "print-area"; document.body.appendChild(area); }
    area.innerHTML = ticketHTML(o, job);
    setTimeout(() => window.print(), 50);
  }

  /* toast */
  let tt;
  function toast(msg){
    let el = $("toast");
    if(!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span>`;
    el.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 3200);
  }

  /* small modal: returns a promise with the form values (or null) */
  function dialog({ title, body = "", fields = [], ok = "Save", okClass = "", cancel = "Cancel" }){
    return new Promise(resolve => {
      const scrim = document.createElement("div"); scrim.className = "scrim";
      const wrap = document.createElement("div"); wrap.className = "modal";
      wrap.innerHTML = `<form class="modal-card" novalidate><h3>${esc(title)}</h3>${body ? `<p class="muted" style="font-size:12.5px;line-height:1.5;margin-bottom:14px">${body}</p>` : ""}
        ${fields.map(f => fieldHTML(f)).join("")}
        <div class="modal-actions">${cancel ? `<button type="button" class="btn ghost" data-x>${esc(cancel)}</button>` : ""}<button class="btn ${okClass}">${esc(ok)}</button></div></form>`;
      document.body.append(scrim, wrap);
      const form = wrap.querySelector("form"), prev = document.activeElement;
      const close = v => { scrim.remove(); wrap.remove(); prev && prev.focus && prev.focus(); resolve(v); };
      scrim.onclick = () => close(null);
      wrap.querySelector("[data-x]") && (wrap.querySelector("[data-x]").onclick = () => close(null));
      wrap.addEventListener("keydown", e => { if(e.key === "Escape") close(null); });
      form.onsubmit = e => {
        e.preventDefault();
        const out = {}; let bad = false;
        fields.forEach(f => {
          const fld = form.querySelector(`[data-f="${f.name}"]`);
          let v;
          if(f.type === "checks") v = [...fld.querySelectorAll("input:checked")].map(i => i.value);
          else if(f.type === "check") v = fld.querySelector("input").checked;
          else v = fld.querySelector("input,select,textarea").value.trim();
          const err = f.required && (Array.isArray(v) ? !v.length : !v) ? "Required" : f.validate ? f.validate(v) : "";
          fld.classList.toggle("err", !!err); if(err){ fld.querySelector(".errmsg").textContent = err; bad = true; }
          out[f.name] = f.type === "number" ? +v : v;
        });
        if(!bad) close(out);
      };
      (form.querySelector("input,select,textarea") || form.querySelector("button:last-child")).focus();
    });
  }
  function fieldHTML(f){
    const v = f.value == null ? "" : f.value;
    let ctl;
    if(f.type === "select") ctl = `<select class="select">${f.options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
    else if(f.type === "textarea") ctl = `<textarea class="textarea" rows="3" placeholder="${esc(f.placeholder || "")}">${esc(v)}</textarea>`;
    else if(f.type === "checks") ctl = `<div style="display:grid;gap:8px">${f.options.map(o => `<label class="check"><input type="checkbox" value="${esc(o[0])}"${(v || []).includes(o[0]) ? " checked" : ""}>${esc(o[1])}</label>`).join("")}</div>`;
    else if(f.type === "check") return `<div class="field" data-f="${f.name}"><label class="check"><input type="checkbox"${v ? " checked" : ""}>${esc(f.label)}</label><div class="errmsg"></div></div>`;
    else ctl = `<input class="input" type="${f.type || "text"}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}"${f.type === "number" ? ' inputmode="numeric" min="0" step="50"' : ""}>`;
    return `<div class="field" data-f="${f.name}"><span>${esc(f.label)}</span>${ctl}<div class="errmsg"></div></div>`;
  }

  /* new-order chime (Web Audio, no files needed) */
  let actx;
  function chime(){
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime;
      [880, 1175, 1568].forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0, t + i * .13); g.gain.linearRampToValueAtTime(.18, t + i * .13 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .13 + .35);
        o.start(t + i * .13); o.stop(t + i * .13 + .4);
      });
    } catch(e){}
  }

  /* Excel-friendly CSV download */
  function downloadCSV(name, rows){
    const csv = "﻿" + rows.map(r => r.map(c => { const s = String(c == null ? "" : c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return { $, esc, plate, brandHTML, time, date, dateTime, ago, mins, statusTag, payTag, printTag, typeTag, optsText,
           itemsHTML, totalsHTML, bankHTML, ticketHTML, printReal, toast, dialog, chime, downloadCSV };
})();
