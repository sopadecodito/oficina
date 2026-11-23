// Capa de red: Firebase Realtime Database (producción) o BroadcastChannel (demo local).
// Ambas exponen la misma API mínima basada en rutas.

export async function createBackend(config, room) {
  if (config.firebase) return firebaseBackend(config.firebase, room);
  return localBackend(room);
}

const FB = "https://www.gstatic.com/firebasejs/10.12.2";

async function firebaseBackend(fbConfig, room) {
  const { initializeApp } = await import(`${FB}/firebase-app.js`);
  const db = await import(`${FB}/firebase-database.js`);
  const app = initializeApp(fbConfig);
  const d = db.getDatabase(app);
  const r = (p) => db.ref(d, `rooms/${room}/${p}`);
  let offset = 0;
  db.onValue(db.ref(d, ".info/serverTimeOffset"), (s) => (offset = s.val() || 0));

  return {
    kind: "firebase",
    now: () => Date.now() + offset,
    set: (p, v) => db.set(r(p), v),
    update: (p, v) => db.update(r(p), v),
    remove: (p) => db.remove(r(p)),
    push: (p, v) => db.push(r(p), v).key,
    onValue: (p, cb) => db.onValue(r(p), (s) => cb(s.val())),
    onChildAdded: (p, cb, limit) =>
      db.onChildAdded(limit ? db.query(r(p), db.limitToLast(limit)) : r(p), (s) => cb(s.key, s.val())),
    onDisconnectUpdate: (p, v) => db.onDisconnect(r(p)).update(v),
    onConnected: (cb) => db.onValue(db.ref(d, ".info/connected"), (s) => cb(!!s.val())),
  };
}

function localBackend(room) {
  const KEY = "vo-demo-" + room;
  const bc = new BroadcastChannel(KEY);
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  let tree = load();
  const listeners = new Set();
  let scheduled = false;
  const notify = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; for (const l of [...listeners]) l(); });
  };
  const save = () => { localStorage.setItem(KEY, JSON.stringify(tree)); bc.postMessage(1); notify(); };
  bc.onmessage = () => { tree = load(); notify(); };

  const parts = (p) => p.split("/").filter(Boolean);
  const get = (p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), tree);
  const setAt = (p, v) => {
    const ks = parts(p);
    let o = tree;
    for (let i = 0; i < ks.length - 1; i++) {
      if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {};
      o = o[ks[i]];
    }
    const last = ks[ks.length - 1];
    if (v === null || v === undefined) delete o[last];
    else o[last] = clone(v);
  };
  let seq = 0;
  const pushKey = () => Date.now().toString(36).padStart(10, "0") + (seq++).toString(36).padStart(4, "0") + Math.random().toString(36).slice(2, 6);

  const disconnectOps = [];
  addEventListener("pagehide", () => {
    tree = load();
    for (const [p, v] of disconnectOps) for (const k in v) setAt(`${p}/${k}`, v[k]);
    save();
  });

  const api = {
    kind: "local",
    now: () => Date.now(),
    set(p, v) { tree = load(); setAt(p, v); save(); },
    update(p, v) { tree = load(); for (const k in v) setAt(`${p}/${k}`, v[k]); save(); },
    remove(p) { tree = load(); setAt(p, null); save(); },
    push(p, v) { const k = pushKey(); api.set(`${p}/${k}`, v); return k; },
    onValue(p, cb) {
      let last;
      const f = () => {
        const s = JSON.stringify(get(p) ?? null);
        if (s !== last) { last = s; cb(JSON.parse(s)); }
      };
      listeners.add(f); f();
    },
    onChildAdded(p, cb, limit) {
      const seen = new Set();
      let first = true;
      const f = () => {
        const o = get(p) || {};
        let keys = Object.keys(o).sort();
        if (first && limit) { Object.keys(o).forEach((k) => seen.add(k)); keys = keys.slice(-limit); keys.forEach((k) => seen.delete(k)); }
        first = false;
        for (const k of keys) if (!seen.has(k)) { seen.add(k); cb(k, clone(o[k])); }
      };
      listeners.add(f); f();
    },
    onDisconnectUpdate(p, v) { disconnectOps.push([p, v]); },
    onConnected(cb) { cb(true); },
  };
  return api;
}
