/* =========================================================
   COMMINT BUKA — demo data layer (frontend only, no backend)

   Everything lives in this browser's localStorage so the customer site,
   the branch dashboards and the management dashboard can talk to each
   other across tabs. Each order is stored under its OWN key
   ("cb.order.<id>") so two tabs writing at the same time can never
   overwrite each other's orders.

   In the real system this file is replaced by API calls to a server.
   ========================================================= */
const Store = (() => {
  const P = "cb.";
  const VERSION = "3";
  const mem = {};                                  // fallback if storage is blocked
  const raw = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return k in mem ? mem[k] : null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){ mem[k] = v; } },
    del(k){ try { localStorage.removeItem(k); } catch(e){ delete mem[k]; } },
    keys(){ try { return Object.keys(localStorage); } catch(e){ return Object.keys(mem); } }
  };
  const get = (k, d) => { const v = raw.get(P + k); if(v == null) return d; try { return JSON.parse(v); } catch(e){ return d; } };
  const set = (k, v) => { raw.set(P + k, JSON.stringify(v)); emit(k); };

  /* ---------- change notifications (same tab + other tabs) ---------- */
  const subs = new Set();
  function emit(key){ subs.forEach(fn => { try { fn(key); } catch(e){ console.error(e); } }); }
  addEventListener("storage", e => { if(e.key && e.key.startsWith(P)) emit(e.key.slice(P.length)); });
  const onChange = fn => { subs.add(fn); return () => subs.delete(fn); };

  /* ---------- status model (from the proposal, section 7) ---------- */
  const STATUS = {
    new:       { label:"New Order",        tone:"pink"  },
    confirmed: { label:"Confirmed",        tone:"blue"  },
    preparing: { label:"Preparing",        tone:"amber" },
    ready:     { label:"Ready for Pickup", tone:"green" },
    out:       { label:"Out for Delivery", tone:"green" },
    completed: { label:"Completed",        tone:"grey"  },
    cancelled: { label:"Cancelled",        tone:"red"   }
  };
  const flow = o => o.type === "pickup" ? ["new","confirmed","preparing","ready","completed"] : ["new","confirmed","preparing","out","completed"];
  const nextStatus = o => { const f = flow(o), i = f.indexOf(o.status); return i >= 0 && i < f.length - 1 ? f[i + 1] : null; };
  const isOpen = o => o.status !== "completed" && o.status !== "cancelled";
  const ACTION = { confirmed:"Confirm payment & accept", preparing:"Start packing", ready:"Mark ready for pickup", out:"Hand to rider", completed:"Mark completed" };

  /* ---------- branches ---------- */
  const settings = () => get("settings", {});
  function branch(id){
    const b = BRANCHES.find(x => x.id === id); if(!b) return null;
    const s = settings();
    return Object.assign({}, b, { zones: (s.zones && s.zones[id]) || b.zones });
  }
  const branches = () => BRANCHES.map(b => branch(b.id));
  const chosenBranch = () => { const id = raw.get(P + "branch"); return BRANCHES.some(b => b.id === id) ? id : null; };
  const chooseBranch = id => { raw.set(P + "branch", id); emit("branch"); };
  function isOpenNow(b, at = new Date()){
    const [, h] = b.hours[at.getDay()];
    const toMin = t => { const m = t.trim().match(/(\d+)(am|pm)/); let x = +m[1] % 12; if(m[2] === "pm") x += 12; return x * 60; };
    const [a, z] = h.split("–"); const now = at.getHours() * 60 + at.getMinutes();
    return now >= toMin(a) && now < toMin(z);
  }

  /* ---------- menu per branch ---------- */
  const overrides = () => get("menu", {});
  function itemFor(branchId, id){
    const m = byId(id); if(!m) return null;
    const o = (overrides()[branchId] || {})[id] || {};
    return Object.assign({}, m, { price: o.price != null ? o.price : m.base, available: o.available !== false });
  }
  const menuFor = branchId => MENU.map(m => itemFor(branchId, m.id));
  function applyBranch(branchId){                  // mutate the shared MENU in place (used by the customer page)
    const ov = overrides()[branchId] || {};
    MENU.forEach(m => { const o = ov[m.id] || {}; m.price = o.price != null ? o.price : m.base; m.available = o.available !== false; });
  }
  function setMenuItem(branchIds, id, patch, user){
    const all = overrides();
    branchIds.forEach(b => { all[b] = all[b] || {}; all[b][id] = Object.assign({}, all[b][id], patch); });
    set("menu", all);
    const m = byId(id), bits = [];
    if(patch.price != null) bits.push("price " + naira(patch.price));
    if(patch.available != null) bits.push(patch.available ? "available" : "sold out");
    log(user, "menu", `${m.name}: ${bits.join(", ")} (${branchIds.map(b => branch(b).name).join(" & ")})`, branchIds.length > 1 ? "both" : branchIds[0]);
  }

  /* ---------- prices ---------- */
  function optPrice(sel){
    return Object.entries(sel || {}).reduce((t, [g, vals]) => t + vals.reduce((s, v) => s + ((OPT[g] && OPT[g].items.find(x => x[0] === v)) || [0, 0])[1], 0), 0);
  }
  function linePrice(line, branchId){ const m = itemFor(branchId, line.id); return m ? (m.price + optPrice(line.sel)) * line.qty : 0; }

  /* ---------- cart (one per branch) ---------- */
  const getCart = b => get("cart." + b, []).filter(l => byId(l.id));
  const setCart = (b, lines) => set("cart." + b, lines);

  /* ---------- orders (one key each) ---------- */
  const OKEY = "order.";
  function orders(filter){
    const out = [];
    raw.keys().forEach(k => { if(k.startsWith(P + OKEY)){ try { out.push(JSON.parse(raw.get(k))); } catch(e){} } });
    out.sort((a, b) => b.createdAt - a.createdAt);
    return filter ? out.filter(filter) : out;
  }
  const order = id => get(OKEY + id, null);
  const saveOrder = o => set(OKEY + o.id, o);

  function newId(b, at){
    const d = new Date(at), ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    const ctr = get("seq", {}), key = b.code + ymd;
    let n = (ctr[key] || 0) + 1, id;
    do { id = `CB-${b.code}-${ymd}-${String(n).padStart(3, "0")}`; n++; } while(raw.get(P + OKEY + id));
    ctr[key] = n - 1; raw.set(P + "seq", JSON.stringify(ctr));
    return id;
  }

  const CUSTOMER = { name:"Customer", role:"customer" };
  const SYSTEM = { name:"System", role:"system" };

  function createOrder(input, opts = {}){
    const b = branch(input.branch); if(!b) throw new Error("Unknown branch");
    const at = opts.at || Date.now();
    const items = input.items.map(l => {
      const m = itemFor(b.id, l.id);
      const unit = m.price + optPrice(l.sel);
      return { id:l.id, name:m.name, qty:l.qty, sel:l.sel || {}, note:l.note || "", unit, total:unit * l.qty };
    });
    const zone = input.type === "delivery" ? (b.zones.find(z => z.area === (input.address || {}).area) || b.zones[0]) : null;
    const subtotal = items.reduce((t, i) => t + i.total, 0), fee = zone ? zone.fee : 0;
    const o = {
      id:newId(b, at), branch:b.id, createdAt:at, updatedAt:at, type:input.type,
      customer:{ name:input.customer.name, phone:input.customer.phone },
      address: zone ? { area:zone.area, street:input.address.street || "", extra:input.address.extra || "" } : null,
      instructions:input.instructions || "", items, subtotal, fee, total:subtotal + fee,
      payment:{ method:"Bank transfer (Providus)", status:"awaiting" },
      status:"new", statusAt:at, cancelReason:"",
      history:[{ at, from:null, to:"new", by:CUSTOMER, note:"Order placed online" }],
      prints:[], sms:[]
    };
    sms(o, "new", at);
    queuePrintOn(o, "original", SYSTEM, at);
    if(!opts.silent) saveOrder(o);
    return o;
  }

  function setStatus(id, to, user, note){
    const o = order(id); if(!o) return null;
    if(to === "cancelled"){ if(!isOpen(o)) return o; }
    else if(nextStatus(o) !== to) return o;       // only forward, one step at a time
    const at = Date.now();
    o.history.push({ at, from:o.status, to, by:userRef(user), note:note || "" });
    o.status = to; o.statusAt = at; o.updatedAt = at;
    if(to === "confirmed"){ o.payment.status = "paid"; o.payment.confirmedAt = at; o.payment.by = user.name; }
    if(to === "cancelled") o.cancelReason = note || "";
    sms(o, to, at);
    saveOrder(o);
    return o;
  }

  /* ---------- SMS (simulated: stored on the order, shown on screen) ---------- */
  const SMS = {
    new:o => `${STORE.name} ${branch(o.branch).name}: we got order ${o.id} (${naira(o.total)}). Pay by transfer to ${STORE.bank.bank} ${STORE.bank.number} (${STORE.bank.name}), narration ${o.id}.`,
    confirmed:o => `Payment received. Order ${o.id} is confirmed and will be packed shortly.`,
    preparing:o => `Order ${o.id} is being packed now.`,
    ready:o => `Order ${o.id} is ready for pickup at ${branch(o.branch).address}.`,
    out:o => `Order ${o.id} is on its way to ${o.address ? o.address.area : "you"}. Rider will call ${o.customer.phone}.`,
    completed:o => `Order ${o.id} completed. Thank you for choosing ${STORE.name}!`,
    cancelled:o => `Order ${o.id} was cancelled${o.cancelReason ? ": " + o.cancelReason : ""}. Questions? Call ${branch(o.branch).phone}.`
  };
  function sms(o, status, at){ o.sms.push({ at, to:o.customer.phone, status, text:SMS[status](o) }); }

  /* ---------- printing (simulated cloud printer per branch) ----------
     job.state: queued → printed            (printer online)
                queued → pending → printed  (printer comes back)
                pending (> FAIL_AFTER) → failed → "Retry" re-queues it      */
  const FAIL_AFTER = 20000;
  const printers = () => get("printers", { allen:{ online:true }, ikeja:{ online:true } });
  function setPrinter(b, online, user){
    const p = printers(); p[b] = Object.assign({}, p[b], { online }); set("printers", p);
    log(user, "printer", `${branch(b).name} printer switched ${online ? "ON" : "OFF"}`, b);
  }
  function queuePrintOn(o, kind, user, at = Date.now()){
    const n = o.prints.filter(j => j.kind === "reprint").length + (kind === "reprint" ? 1 : 0);
    o.prints.push({ id:o.prints.length + 1, kind, n, state:"queued", at, by:user.name, doneAt:null });
  }
  function reprint(id, user){
    const o = order(id); if(!o) return;
    queuePrintOn(o, "reprint", user); o.updatedAt = Date.now(); saveOrder(o);
    log(user, "reprint", `Reprint requested for ${o.id}`, o.branch, o.id);
  }
  function retryPrint(id, jobId, user){
    const o = order(id); if(!o) return;
    const j = o.prints.find(x => x.id === jobId); if(!j || j.state !== "failed") return;
    j.state = "queued"; j.retries = (j.retries || 0) + 1; o.updatedAt = Date.now(); saveOrder(o);
    log(user, "print", `Retried failed ticket for ${o.id}`, o.branch, o.id);
  }
  /* run by whichever dashboard is open — plays the role of the printer polling the server */
  function processPrinters(onlyBranch){
    const p = printers(), now = Date.now(), printed = [];
    orders(o => o.prints.some(j => j.state === "queued" || j.state === "pending")).forEach(o => {
      if(onlyBranch && o.branch !== onlyBranch) return;
      const online = (p[o.branch] || {}).online !== false;
      let changed = false;
      o.prints.forEach(j => {
        if(j.state === "queued" || j.state === "pending"){
          if(online){ j.state = "printed"; j.doneAt = now; printed.push({ order:o, job:j }); changed = true; }
          else if(j.state === "queued"){ j.state = "pending"; changed = true; }
          else if(now - j.at > FAIL_AFTER){ j.state = "failed"; changed = true; }
        }
      });
      if(changed){ o.updatedAt = now; saveOrder(o); }
    });
    return printed;
  }
  function printState(o){
    const orig = o.prints.filter(j => j.kind === "original").pop();
    if(o.prints.some(j => j.state === "failed")) return "failed";
    if(o.prints.some(j => j.state === "pending" || j.state === "queued")) return "pending";
    return orig && orig.state === "printed" ? "printed" : "pending";
  }

  /* ---------- staff accounts & sessions ---------- */
  const DEFAULT_USERS = [
    { id:"u0", name:"Management", username:"manager", pin:"0000", role:"manager", branches:["allen","ikeja"], active:true },
    { id:"u1", name:"Bola Adeyemi", username:"allen",  pin:"1111", role:"staff", branches:["allen"], active:true },
    { id:"u2", name:"Kemi Okoro",   username:"ikeja",  pin:"2222", role:"staff", branches:["ikeja"], active:true },
    { id:"u3", name:"Tunde Bakare", username:"tunde",  pin:"3333", role:"staff", branches:["allen","ikeja"], active:true }
  ];
  const users = () => get("users", DEFAULT_USERS);
  function saveUser(u, by){
    const all = users(), i = all.findIndex(x => x.id === u.id);
    if(i >= 0) all[i] = u; else { u.id = "u" + Date.now().toString(36); all.push(u); }
    set("users", all);
    log(by, "user", `${i >= 0 ? "Updated" : "Created"} account ${u.name} (${u.role}, ${u.branches.map(b => branch(b).name).join(" & ")})${u.active ? "" : " — deactivated"}`, "both");
    return u;
  }
  function login(username, pin, need){
    const u = users().find(x => x.username.toLowerCase() === String(username).trim().toLowerCase() && x.pin === String(pin).trim());
    if(!u) return { error:"Wrong username or PIN." };
    if(!u.active) return { error:"This account has been deactivated." };
    if(need === "manager" && u.role !== "manager") return { error:"Only management accounts can open this dashboard." };
    try { sessionStorage.setItem(P + "session." + need, u.id); } catch(e){ mem["s." + need] = u.id; }
    log(u, "login", `${u.name} signed in to the ${need === "manager" ? "management" : "branch"} dashboard`, u.role === "manager" ? "both" : u.branches.join(","));
    return { user:u };
  }
  function session(need){
    let id; try { id = sessionStorage.getItem(P + "session." + need); } catch(e){ id = mem["s." + need]; }
    const u = users().find(x => x.id === id);
    return u && u.active ? u : null;
  }
  function logout(need){ try { sessionStorage.removeItem(P + "session." + need); } catch(e){ delete mem["s." + need]; } }
  const canSee = (u, b) => !!u && (u.role === "manager" || u.branches.includes(b));
  const userRef = u => ({ id:u.id, name:u.name, role:u.role });

  /* ---------- activity log (append-only; order changes live on each order) ---------- */
  function log(user, kind, text, branchId, orderId){
    const all = get("activity", []);
    all.push({ at:Date.now(), by:user ? userRef(user) : SYSTEM, kind, text, branch:branchId || "", order:orderId || "" });
    set("activity", all.slice(-800));
  }
  function activity(){
    const out = get("activity", []).slice();
    orders().forEach(o => o.history.forEach((h, i) => out.push({
      at:h.at, by:h.by, kind: h.to === "cancelled" ? "cancel" : "status", branch:o.branch, order:o.id,
      text: i === 0 ? `${o.id} placed (${o.type}, ${naira(o.total)})` : `${o.id}: ${STATUS[h.from].label} → ${STATUS[h.to].label}${h.note ? " — " + h.note : ""}`
    })));
    return out.sort((a, b) => b.at - a.at);
  }

  /* ---------- delay alerts ---------- */
  const DEFAULT_DELAYS = { new:10, confirmed:15, preparing:25, ready:30, out:45 };
  const delays = () => Object.assign({}, DEFAULT_DELAYS, settings().delays || {});
  function delayInfo(o, now = Date.now()){
    const mins = (now - o.statusAt) / 60000, limit = delays()[o.status];
    return { mins, limit, late: isOpen(o) && limit != null && mins > limit };
  }
  function saveSettings(patch, user, text){ set("settings", Object.assign(settings(), patch)); log(user, "settings", text, "both"); }

  /* ---------- seed demo data ---------- */
  function rnd(seed){ return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  const NAMES = ["Tolu Adebayo","Chidi Okafor","Amaka Eze","Seun Balogun","Ifeoma Nwosu","Kunle Ajayi","Zainab Bello","Femi Ogunleye","Ngozi Obi","Yemi Alade","Bukola Sanni","Emeka Uche","Halima Musa","Dayo Akin","Funke Lawal","Ade Johnson","Chioma Okeke","Ibrahim Sule","Tobi Oyelaran","Uche Nnadi"];
  function randomLine(r, b){
    const pool = menuFor(b).filter(m => m.available);
    const weights = { jollof:6, friedrice:4, amala:4, egusi:3, poundedyam:2, suya:3, dodo:4, zobo:4, "c-lunch":2, box:2, puffpuff:2 };
    const bag = []; pool.forEach(m => { for(let i = 0; i < (weights[m.id] || 1); i++) bag.push(m); });
    const m = bag[Math.floor(r() * bag.length)], sel = {};
    (m.opts || []).forEach(g => { const o = OPT[g]; if(o.type === "one") sel[g] = [o.items[Math.floor(r() * o.items.length)][0]]; else if(r() < .35) sel[g] = [o.items[Math.floor(r() * o.items.length)][0]]; });
    return { id:m.id, qty: r() < .75 ? 1 : 2, sel, note:"" };
  }
  function fakeOrder(r, b, at, opts = {}){
    const br = branch(b), type = r() < .62 ? "delivery" : "pickup";
    const lines = []; const k = 1 + Math.floor(r() * 3); for(let i = 0; i < k; i++) lines.push(randomLine(r, b));
    const name = NAMES[Math.floor(r() * NAMES.length)];
    return createOrder({
      branch:b, type, items:lines,
      customer:{ name, phone:"080" + String(Math.floor(r() * 1e8)).padStart(8, "0") },
      address:{ area:br.zones[Math.floor(r() * br.zones.length)].area, street:(1 + Math.floor(r() * 80)) + " " + ["Adeniyi Jones Ave","Toyin St","Opebi Rd","Obafemi Awolowo Way","Kodesoh St","Oba Akran Ave"][Math.floor(r() * 6)], extra:"" },
      instructions: r() < .2 ? ["Extra pepper please","No onions","Call when outside","Pack stew separately"][Math.floor(r() * 4)] : ""
    }, Object.assign({ at, silent:true }, opts));
  }
  function walk(o, toStatus, staff, start, r){
    const f = o.status === "cancelled" ? [] : flow(o);
    let t = start;
    o.prints.forEach(j => { j.state = "printed"; j.doneAt = j.at + 4000; });
    for(const s of f.slice(1)){
      if(s === "cancelled") break;
      t += (3 + r() * 12) * 60000;
      o.history.push({ at:t, from:o.status, to:s, by:userRef(staff), note:"" });
      if(s === "confirmed"){ o.payment.status = "paid"; o.payment.confirmedAt = t; o.payment.by = staff.name; }
      o.status = s; o.statusAt = t; sms(o, s, t);
      if(s === toStatus) break;
    }
    o.updatedAt = t;
  }
  function seed(){
    raw.keys().forEach(k => { if(k.startsWith(P) && k !== P + "branch") raw.del(k); });
    raw.set(P + "menu", JSON.stringify({ allen:{ peppersoup:{ available:false } }, ikeja:{ zobojar:{ available:false }, suya:{ price:3200 } } }));
    const r = rnd(20261014), U = DEFAULT_USERS, now = Date.now();
    const staffFor = b => b === "allen" ? (r() < .8 ? U[1] : U[3]) : (r() < .8 ? U[2] : U[3]);
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    for(let d = 42; d >= 1; d--){
      ["allen","ikeja"].forEach(b => {
        const dow = new Date(day0.getTime() - d * 864e5).getDay();
        const n = Math.round((b === "allen" ? 7 : 5) * (dow === 5 || dow === 6 ? 1.5 : 1) * (.7 + r() * .6));
        for(let i = 0; i < n; i++){
          const at = day0.getTime() - d * 864e5 + (9 + r() * 12) * 36e5;
          const o = fakeOrder(r, b, at);
          if(r() < .05){ o.history.push({ at:at + 6e5, from:"new", to:"cancelled", by:userRef(staffFor(b)), note:["Customer did not pay","Customer cancelled","Item ran out"][Math.floor(r() * 3)] }); o.status = "cancelled"; o.statusAt = at + 6e5; o.cancelReason = o.history[1].note; o.prints.forEach(j => { j.state = "printed"; j.doneAt = j.at + 4000; }); }
          else walk(o, "completed", staffFor(b), at, r);
          raw.set(P + OKEY + o.id, JSON.stringify(o));
        }
      });
    }
    /* today: a realistic live queue for each branch */
    const live = [
      ["allen", 95, "completed"], ["allen", 62, "completed"], ["allen", 38, "preparing"], ["allen", 24, "confirmed"], ["allen", 3, "new"],
      ["ikeja", 80, "completed"], ["ikeja", 41, "out"], ["ikeja", 12, "preparing"], ["ikeja", 6, "new", "failed"]
    ];
    live.forEach(([b, ago, st, print]) => {
      const at = now - ago * 60000, o = fakeOrder(r, b, at);
      if(st !== "new"){
        const steps = flow(o).slice(1, flow(o).indexOf(st) + 1), gap = (ago * 60000) / (steps.length + 1);
        o.prints.forEach(j => { j.state = "printed"; j.doneAt = j.at + 4000; });
        steps.forEach((s, i) => {
          const t = at + gap * (i + 1) * (st === "confirmed" ? .2 : 1);
          o.history.push({ at:t, from:o.status, to:s, by:userRef(staffFor(b)), note:"" });
          if(s === "confirmed"){ o.payment.status = "paid"; o.payment.confirmedAt = t; o.payment.by = staffFor(b).name; }
          o.status = s; o.statusAt = t; sms(o, s, t);
        });
      } else if(print === "failed"){ o.prints[0].state = "failed"; }
      else { o.prints.forEach(j => { j.state = "printed"; j.doneAt = j.at + 4000; }); }
      raw.set(P + OKEY + o.id, JSON.stringify(o));
    });
    raw.set(P + "activity", JSON.stringify([{ at:now - 3 * 36e5, by:SYSTEM, kind:"settings", text:"Demo data loaded", branch:"both", order:"" }]));
    raw.set(P + "v", VERSION);
    emit("seed");
  }
  if(raw.get(P + "v") !== VERSION) seed();

  /* ---------- rush test (proposal section 13) ---------- */
  function rush(count, ms, onTick){
    const r = rnd(Date.now() % 2147483646 + 1), made = [];
    return new Promise(resolve => {
      let i = 0;
      const step = () => {
        const b = r() < .5 ? "allen" : "ikeja";
        const o = fakeOrder(r, b, Date.now(), { silent:false });
        made.push({ id:o.id, branch:b });
        onTick && onTick(++i, o);
        if(i < count) setTimeout(step, ms / count * (.4 + r() * 1.2)); else setTimeout(() => resolve(made), 300);
      };
      step();
    });
  }
  function verifyRush(made){
    const all = orders(), ids = new Set(all.map(o => o.id));
    const lost = made.filter(m => !ids.has(m.id));
    const misrouted = made.filter(m => { const o = all.find(x => x.id === m.id); return o && o.branch !== m.branch; });
    const dupes = made.length - new Set(made.map(m => m.id)).size;
    const byBranch = { allen:made.filter(m => m.branch === "allen").length, ikeja:made.filter(m => m.branch === "ikeja").length };
    return { total:made.length, lost:lost.length, misrouted:misrouted.length, dupes, byBranch };
  }

  return {
    STATUS, ACTION, flow, nextStatus, isOpen,
    branch, branches, chosenBranch, chooseBranch, isOpenNow,
    itemFor, menuFor, applyBranch, setMenuItem, overrides,
    optPrice, linePrice, getCart, setCart,
    orders, order, createOrder, setStatus,
    printers, setPrinter, reprint, retryPrint, processPrinters, printState,
    users, saveUser, login, session, logout, canSee,
    log, activity, delays, delayInfo, settings, saveSettings,
    onChange, reset:seed, rush, verifyRush
  };
})();
