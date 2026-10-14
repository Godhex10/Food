/* =========================================================
   COMMINT BUKA — shared dashboard pieces (staff + management)
   order cards · order drawer · payment/cancel flows · virtual printer
   ========================================================= */
const Console = (() => {
  const { $, esc } = UI;
  let currentUser = () => null;
  const ICON = {
    warn:`<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>`,
    print:`<svg viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-3"/><path d="M7 14h10v7H7z"/></svg>`,
    close:`<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    lock:`<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
    arrow:`<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    phone:`<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>`
  };

  /* ---------- order card (board) ---------- */
  const lineSummary = o => o.items.map(i => `${i.qty}× ${i.name}`).join(", ");
  function lateText(o){
    const d = Store.delayInfo(o);
    return d.late ? `Late · ${UI.mins(d.mins)} in ${Store.STATUS[o.status].label}` : "";
  }
  function orderCard(o, fresh){
    const late = lateText(o), next = Store.nextStatus(o);
    return `<article class="ocard${late ? " late" : ""}${fresh ? " fresh" : ""}" data-order="${o.id}" tabindex="0">
      <div class="top"><span class="id">${o.id}</span><span class="when${late ? " late" : ""}">${late || UI.ago(o.createdAt)}</span></div>
      <div class="cust">${esc(o.customer.name)}<small>${esc(o.customer.phone)}${o.type === "delivery" ? " · " + esc(o.address.area) : ""}</small></div>
      <div class="tags">${UI.statusTag(o.status)}${UI.typeTag(o)}${UI.payTag(o)}${Store.printState(o) !== "printed" ? UI.printTag(o) : ""}</div>
      <div class="lines">${esc(lineSummary(o))}</div>
      <div class="foot"><b>${naira(o.total)}</b>${next && Store.isOpen(o) ? `<button class="btn sm${next === "confirmed" ? " green" : ""}" data-advance="${o.id}">${Store.ACTION[next]}</button>` : ""}</div>
    </article>`;
  }

  /* ---------- actions ---------- */
  async function advance(id){
    const o = Store.order(id), to = o && Store.nextStatus(o), user = currentUser();
    if(!to || !user) return;
    if(to === "confirmed"){
      const ok = await UI.dialog({
        title:"Confirm payment received",
        body:`Only confirm once <b>${naira(o.total)}</b> from <b>${esc(o.customer.name)}</b> has arrived in the ${esc(STORE.bank.bank)} account with narration <b class="mono">${o.id}</b>. The customer gets a text straight away.`,
        ok:"Payment received · accept order", okClass:"green"
      });
      if(!ok) return;
    }
    Store.setStatus(id, to, user);
    UI.toast(`${o.id} → ${Store.STATUS[to].label} · customer notified`);
  }
  async function cancel(id){
    const o = Store.order(id), user = currentUser(); if(!o || !user) return;
    const r = await UI.dialog({
      title:`Cancel ${o.id}?`, body:"A reason is required and is saved in the order history. The customer gets a text.",
      fields:[
        { name:"reason", label:"Reason", type:"select", value:"Customer did not pay", options:[["Customer did not pay","Customer did not pay"],["Customer requested cancellation","Customer requested cancellation"],["Item unavailable","Item unavailable"],["Duplicate order","Duplicate order"],["Outside delivery area","Outside delivery area"],["Other","Other"]] },
        { name:"note", label:"Details (optional)", type:"textarea", placeholder:"Anything management should know" }
      ],
      ok:"Cancel order", okClass:"rose", cancel:"Keep order"
    });
    if(!r) return;
    Store.setStatus(id, "cancelled", user, r.reason + (r.note ? " — " + r.note : ""));
    UI.toast(`${o.id} cancelled · customer notified`);
  }

  /* ---------- order drawer ---------- */
  let openId = null, showTicket = false;
  function buildDrawer(){
    if($("odrawer")) return;
    document.body.insertAdjacentHTML("beforeend", `<div class="scrim" id="oscrim" hidden></div>
      <aside class="drawer" id="odrawer" aria-hidden="true" aria-labelledby="dTitle">
        <div class="drawer-head" id="dHead"></div><div class="drawer-body" id="dBody"></div><div class="drawer-foot" id="dFoot"></div>
      </aside>`);
    $("oscrim").onclick = close;
    document.addEventListener("keydown", e => { if(e.key === "Escape" && openId && !document.querySelector(".modal")) close(); });
    $("odrawer").addEventListener("click", async e => {
      const t = e.target.closest("[data-act]"); if(!t) return;
      const act = t.dataset.act, user = currentUser();
      if(act === "close") close();
      else if(act === "advance") advance(openId);
      else if(act === "cancel") cancel(openId);
      else if(act === "reprint"){ Store.reprint(openId, user); UI.toast("Reprint sent to the branch printer"); }
      else if(act === "retry"){ Store.retryPrint(openId, +t.dataset.job, user); UI.toast("Retrying print"); }
      else if(act === "local"){ const o = Store.order(openId); UI.printReal(o, o.prints[o.prints.length - 1]); }
      else if(act === "ticket"){ showTicket = !showTicket; render(); }
    });
    Store.onChange(k => { if(openId && (k === "order." + openId || k === "printers")) render(); });
  }
  function open(id){
    openId = id; showTicket = false; render();
    $("oscrim").hidden = false; $("odrawer").classList.add("open"); $("odrawer").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => { const b = $("dHead").querySelector("[data-act=close]"); b && b.focus(); }, 60);
  }
  function close(){
    openId = null; $("oscrim").hidden = true; $("odrawer").classList.remove("open"); $("odrawer").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function render(){
    const o = Store.order(openId); if(!o) return close();
    const b = Store.branch(o.branch), S = Store.STATUS, next = Store.nextStatus(o), late = lateText(o);
    $("dHead").innerHTML = `<div style="flex:1;min-width:0">
        <div class="d-id" id="dTitle">${o.id}</div>
        <div class="d-sub">${b.name} branch · placed ${UI.dateTime(o.createdAt)} (${UI.ago(o.createdAt)})</div>
        <div class="d-tags">${UI.statusTag(o.status)}${UI.typeTag(o)}${UI.payTag(o)}${UI.printTag(o)}${late ? `<span class="tag red">${late}</span>` : ""}</div>
      </div><button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>`;

    const jobs = o.prints.map(j => {
      const st = j.state === "printed" ? `<span class="tag grey">Printed ${UI.time(j.doneAt)}</span>` : j.state === "failed" ? `<span class="tag red">Failed</span>` : `<span class="tag amber">${j.state === "queued" ? "Sending…" : "Waiting for printer"}</span>`;
      return `<div class="job">${ICON.print.replace("<svg", '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2"')}<span>${j.kind === "reprint" ? `Reprint #${j.n}` : "Original ticket"} · ${esc(j.by)}</span>${st}${j.state === "failed" ? `<button class="btn sm" data-act="retry" data-job="${j.id}">Retry</button>` : ""}</div>`;
    }).join("");

    const audit = o.history.map((h, i) => `<li><time>${UI.time(h.at)}</time><div>
        <b>${i === 0 ? "Order placed" : `${S[h.from].label} → ${S[h.to].label}`}</b>
        <small>by ${esc(h.by.name)}${h.by.role && h.by.role !== "customer" ? " (" + h.by.role + ")" : ""} · ${UI.date(h.at)}${h.note ? " · " + esc(h.note) : ""}</small></div></li>`).join("");

    $("dBody").innerHTML = `
      <div class="d-sec"><h4>Customer</h4><dl class="kv">
        <dt>Name</dt><dd>${esc(o.customer.name)}</dd>
        <dt>Phone</dt><dd><a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a></dd>
        <dt>Order type</dt><dd>${o.type === "delivery" ? "Delivery" : "Pickup at " + esc(b.name)}</dd>
        ${o.type === "delivery" ? `<dt>Address</dt><dd>${esc(o.address.street)}, ${esc(o.address.area)}${o.address.extra ? `<br><span class="muted">${esc(o.address.extra)}</span>` : ""}</dd>` : ""}
      </dl></div>
      ${o.instructions ? `<div class="d-sec"><h4>Special instructions</h4><div class="note-box">${esc(o.instructions)}</div></div>` : ""}
      ${o.status === "cancelled" ? `<div class="d-sec"><h4>Cancellation reason</h4><div class="note-box" style="background:var(--red-soft);color:var(--red)">${esc(o.cancelReason || "Not given")}</div></div>` : ""}
      <div class="d-sec"><h4>Items</h4>${UI.itemsHTML(o)}<div style="margin-top:12px">${UI.totalsHTML(o)}</div></div>
      <div class="d-sec"><h4>Payment</h4><dl class="kv">
        <dt>Method</dt><dd>${esc(o.payment.method)}</dd>
        <dt>Status</dt><dd>${o.payment.status === "paid" ? `Paid · confirmed by ${esc(o.payment.by)} at ${UI.time(o.payment.confirmedAt)}` : o.status === "cancelled" ? "Not paid" : "Awaiting transfer · narration " + o.id}</dd>
      </dl></div>
      <div class="d-sec"><h4>Kitchen ticket · ${b.name} printer</h4>
        <div class="jobs">${jobs}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn sm ghost" data-act="reprint">${ICON.print.replace("<svg", '<svg')} Reprint</button>
          <button class="btn sm ghost" data-act="local">Print on this device</button>
          <button class="btn sm ghost" data-act="ticket">${showTicket ? "Hide" : "Preview"} ticket</button>
        </div>
        <p class="lock-note">Reprints are stamped “REPRINT” and never create a new order.</p>
        ${showTicket ? `<div class="ticket-preview" style="margin-top:12px">${UI.ticketHTML(o, o.prints[o.prints.length - 1])}</div>` : ""}
      </div>
      <div class="d-sec"><h4>Order history</h4><ul class="audit">${audit}</ul>
        <p class="lock-note">${ICON.lock} Recorded automatically. Staff can't edit or delete history.</p></div>`;

    $("dFoot").innerHTML = Store.isOpen(o)
      ? `${next ? `<button class="btn${next === "confirmed" ? " green" : ""}" data-act="advance" style="flex:1">${Store.ACTION[next]} ${ICON.arrow}</button>` : ""}<button class="btn danger" data-act="cancel">Cancel order</button>`
      : `<span class="muted small" style="padding:10px 0">This order is ${S[o.status].label.toLowerCase()}. No further actions.</span>`;
  }

  /* ---------- virtual printer ---------- */
  function printerPanel(el, branchId, user){
    const b = Store.branch(branchId);
    const keyOf = l => l ? l.order.id + "#" + l.job.id + "@" + l.job.doneAt : null;
    let lastKey = null;
    function latestPrinted(){
      let best = null;
      Store.orders(o => o.branch === branchId).forEach(o => o.prints.forEach(j => { if(j.state === "printed" && (!best || j.doneAt > best.job.doneAt)) best = { order:o, job:j }; }));
      return best;
    }
    function draw(animate){
      const online = (Store.printers()[branchId] || {}).online !== false;
      const latest = latestPrinted();
      const problems = [];
      Store.orders(o => o.branch === branchId && o.prints.some(j => j.state !== "printed")).forEach(o => o.prints.forEach(j => { if(j.state !== "printed") problems.push({ o, j }); }));
      el.innerHTML = `<section class="panel printer">
        <div class="panel-title"><h3>Kitchen printer</h3><span class="tag ${online ? "green" : "red"}">${online ? "Online" : "Offline"}</span></div>
        <div class="device${online ? "" : " off"}"><div class="body"><div class="slot"></div><span class="lbl">${b.code} · THERMAL 80MM</span><span class="light"></span></div></div>
        <div class="paper">${latest ? `<div class="${animate ? "ticket-in" : ""}">${UI.ticketHTML(latest.order, latest.job)}</div>` : `<div class="idle">No tickets yet today</div>`}</div>
        <div class="pstate"><span>${online ? "Connected · prints automatically" : "Disconnected · tickets are kept"}</span>
          <button class="switch" role="switch" aria-checked="${online}" aria-label="Printer online" data-pswitch></button></div>
        ${problems.length ? `<div class="queue">${problems.map(({ o, j }) => `<div class="q"><span class="tag ${j.state === "failed" ? "red" : "amber"}">${j.state === "failed" ? "Failed" : "Pending"}</span><span class="mono">${o.id}</span>${j.kind === "reprint" ? "<span class='muted'>reprint</span>" : ""}${j.state === "failed" ? `<button class="btn sm" data-retry="${o.id}|${j.id}">Retry</button>` : ""}</div>`).join("")}</div>` : ""}
        <p class="lock-note" style="margin-top:12px">Demo: switch the printer off, place an order, and it waits safely. After 20 s it's flagged as failed.</p>
      </section>`;
      lastKey = keyOf(latest);
    }
    el.addEventListener("click", e => {
      if(e.target.closest("[data-pswitch]")){ const on = (Store.printers()[branchId] || {}).online !== false; Store.setPrinter(branchId, !on, user); UI.toast(`Printer switched ${on ? "OFF" : "ON"}`); }
      const r = e.target.closest("[data-retry]"); if(r){ const [id, job] = r.dataset.retry.split("|"); Store.retryPrint(id, +job, user); }
    });
    draw(false);
    return {
      refresh(){ const k = keyOf(latestPrinted()); draw(!!k && k !== lastKey); },
      destroy(){ el.innerHTML = ""; }
    };
  }

  /* the dashboards act as the "cloud" that hands queued tickets to online printers */
  function startPrinterLoop(onPrinted){
    const tick = () => { const p = Store.processPrinters(); if(p.length) onPrinted && onPrinted(p); };
    tick(); return setInterval(tick, 1500);
  }

  function init(opts){ currentUser = opts.user; buildDrawer(); }
  return { init, orderCard, advance, cancel, open, close, printerPanel, startPrinterLoop, lineSummary, lateText, ICON };
})();
