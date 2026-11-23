import { CONFIG } from "../config.js";
import { createBackend } from "./net.js";
import { Voice } from "./voice.js";
import { sfx, unlock } from "./sfx.js";
import { person, chair, itemSprite } from "./art.js";
import {
  W, H, DESKS, SLOTS, CHAIR_HOME, LIGHTS, slotRect, deskFront, blocked,
  buildBackground, buildFurniture, drawScreens,
} from "./world.js";
import { currentHours, daylight, applyLighting, drawSky, timeLabel } from "./daylight.js";
import { spotifyConnected, spotifyLogin, spotifyHandleRedirect, spotifyLogout, spotifyNowPlaying } from "./music.js";

const $ = (s) => document.querySelector(s);
const LS = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem("vo:" + k)); return v ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem("vo:" + k, JSON.stringify(v)),
};
const nameOf = (r) => CONFIG.names[r];
const otherOf = (r) => (r === "yo" ? "ella" : "yo");
const giftById = (id) => CONFIG.gifts.find((g) => g.id === id);
const statusOf = (who, id) => CONFIG.statuses[who].find((s) => s.id === id) || CONFIG.statuses[who][0];
const a_o = (who) => (who === "ella" ? "a" : "o");
const COLORS = { yo: "#8fd0ff", ella: "#ff9ec7" };
const MAX_ITEMS = SLOTS.length;
const NEAR = 34, FAR = 120;
const SPEED = 62, ROLL_SPEED = 50;
const SPIN_MS = 1800;
const BASE_TITLE = "Nuestra oficina";
const DIRS = ["up", "right", "down", "left"];

// ============================================================
//  ENTRADA
// ============================================================
let chosenRole = LS.get("role", null);
const roomInput = $("#roomInput");
const hashRoom = new URLSearchParams(location.hash.slice(1)).get("sala");
roomInput.value = hashRoom || LS.get("room", "");
$("#demoNote").hidden = !!CONFIG.firebase;

document.querySelectorAll(".role").forEach((btn) => {
  const r = btn.dataset.role;
  btn.querySelector("span").textContent = nameOf(r);
  const c = btn.querySelector("canvas");
  c.width = 18; c.height = 26;
  c.getContext("2d").drawImage(person(r, "down"), 0, 0);
  btn.onclick = () => { chosenRole = r; refreshLogin(); };
});
$("#genRoom").onclick = () => {
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  roomInput.value = "oficina-" + [...rnd].map((b) => (b % 36).toString(36)).join("");
  refreshLogin();
};
roomInput.oninput = refreshLogin;
const roomOk = (room) => /^[a-zA-Z0-9_-]{12,64}$/.test(room);
function refreshLogin() {
  document.querySelectorAll(".role").forEach((b) => b.classList.toggle("sel", b.dataset.role === chosenRole));
  const room = roomInput.value.trim();
  $("#loginHint").textContent = !room ? "Inventa un código (o usa 🎲) y compártelo con tu pareja."
    : !roomOk(room) ? "Mínimo 12 caracteres: letras, números, - o _" : "";
  $("#enterBtn").disabled = !(chosenRole && roomOk(room));
}
refreshLogin();
function enter() {
  unlock();
  const room = roomInput.value.trim();
  LS.set("role", chosenRole); LS.set("room", room);
  history.replaceState(null, "", location.pathname + location.search + "#sala=" + room);
  start(chosenRole, room).catch((e) => { console.error(e); alert("No se pudo conectar: " + e.message); });
}
$("#enterBtn").onclick = enter;

// Regreso de Spotify: guarda el token y entra directo
if (CONFIG.spotifyClientId) {
  spotifyHandleRedirect(CONFIG.spotifyClientId).then((ok) => {
    if (ok && chosenRole && roomOk(roomInput.value.trim())) enter();
  });
}

// ============================================================
//  ESTADO
// ============================================================
let me, them, net, voice, joinTs;
const pos = { x: 0, y: 0, dir: "up", moving: false };
const remote = { x: 0, y: 0, init: false };
let sitting = false, pendingSit = false;
let myChair;
let spinStart = 0;
let players = {}, desks = {}, inventory = {};
let myStatus, myMusic = null;
let holding = null, holdingNote = "";
let moveTarget = null, stuckT = 0;
const keys = new Set();
const bubbles = {};
const floaters = [];
let userMuted = false;
let autoSilence = LS.get("autoSilence", true);
let unread = 0;
let lastPub = 0, lastPubKey = "";
let S = 4, K = 4;
let voiceToken = 0;
let lastCodeFloat = 0;

const canvas = $("#game");
const g = canvas.getContext("2d");
const buf = document.createElement("canvas");
buf.width = W; buf.height = H;
const b = buf.getContext("2d");
let background, furniture;

// ============================================================
//  ARRANQUE
// ============================================================
async function start(role, room) {
  me = role; them = otherOf(role);
  $("#login").hidden = true;
  $("#app").hidden = false;
  net = await createBackend(CONFIG, room);
  joinTs = net.now();

  myChair = { ...CHAIR_HOME[me], ...(LS.get("chair:" + me, null) || {}) };
  sitting = true;
  Object.assign(pos, { x: myChair.x, y: myChair.y, dir: myChair.dir });
  myStatus = LS.get("status:" + me, CONFIG.statuses[me][0].id);
  if (!CONFIG.statuses[me].some((s) => s.id === myStatus)) myStatus = CONFIG.statuses[me][0].id;
  myMusic = LS.get("music:" + me, null);
  if (myMusic?.src === "spotify") myMusic = null;

  background = buildBackground();
  furniture = buildFurniture();
  await document.fonts.load('8px "Press Start 2P"').catch(() => {});
  resize();
  new ResizeObserver(resize).observe($("#canvasWrap"));

  net.onConnected((c) => {
    $("#connDot").className = "dot " + (c ? "on" : "");
    if (c) {
      net.onDisconnectUpdate("players/" + me, { online: false, voice: 0, moving: false });
      net.update("players/" + me, fullPresence());
    }
  });
  let lastSongSeen = null;
  net.onValue("players", (v) => {
    players = v || {};
    renderPeople(); syncVoice();
    const m = players[them]?.music;
    const key = m ? m.title + m.artist : null;
    if (lastSongSeen !== null && key && key !== lastSongSeen && m.src === "manual") toast(`🎵 ${nameOf(them)} está escuchando: ${m.title}${m.artist ? " — " + m.artist : ""}`);
    lastSongSeen = key || "";
  });

  net.onValue("desks", (v) => { desks = v || {}; });
  net.onValue("inventory/" + me, (v) => { inventory = v || {}; renderInventory(); });
  net.onChildAdded("desks/" + me, (k, it) => {
    if (!it || it.ts < joinTs || it.from === me) return;
    const gift = giftById(it.gift);
    sfx.gift();
    const txt = `${nameOf(them)} te dejó ${gift?.emoji || "🎁"} ${gift?.name || "algo"}`;
    toast(txt + (it.note ? `: “${it.note}”` : ""), true);
    sysMsg(txt);
    sparkleAtDesk(me, gift);
    alertAway(`🎁 ${txt}`, it.note || "Ve a ver tu escritorio");
  });

  net.onChildAdded("chat", (k, m) => addMsg(m), 200);

  let lastPoke = null;
  net.onValue("pokes/" + me, (v) => {
    if (!v || v.id === lastPoke) return;
    lastPoke = v.id;
    if (v.ts < joinTs - 2000) return;
    receivePoke();
  });

  voice = new Voice({
    me, iceServers: CONFIG.iceServers,
    send: (s) => net.push("signal/" + them, { ...s, ts: net.now() }),
    onState: renderVoice,
  });
  await net.remove("signal/" + me);
  net.onChildAdded("signal/" + me, (k, s) => {
    net.remove(`signal/${me}/${k}`);
    if (s && s.ts >= joinTs - 1000) voice.handle(s);
  });
  setInterval(() => { syncVoice(); updateProximity(); }, 1000);

  if (CONFIG.spotifyClientId) { pollSpotify(); setInterval(pollSpotify, 12000); }

  buildHud();
  bindInput();
  document.addEventListener("visibilitychange", () => {
    pub({ tab: document.hidden ? "hidden" : "visible" });
    if (!document.hidden) clearAlerts();
  });
  setInterval(renderPeople, 15000);
  requestAnimationFrame(loop);
}

function fullPresence() {
  return {
    x: Math.round(pos.x), y: Math.round(pos.y), dir: pos.dir, moving: false,
    sit: sitting, chair: { x: Math.round(myChair.x), y: Math.round(myChair.y), dir: myChair.dir },
    status: myStatus, statusTs: LS.get("statusTs:" + me, net.now()),
    online: true, holding, music: myMusic,
    voice: voice?.enabled ? (voiceToken ||= Date.now()) : 0,
    tab: document.hidden ? "hidden" : "visible",
  };
}
const pub = (fields) => net?.update("players/" + me, fields);

// ============================================================
//  BUCLE
// ============================================================
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;
  updateMe(dt);
  updateRemote();
  updateProximity();
  updatePrompt();
  draw(t);
  requestAnimationFrame(loop);
}

function updateMe(dt) {
  let dx = 0, dy = 0;
  if (keys.has("left")) dx -= 1;
  if (keys.has("right")) dx += 1;
  if (keys.has("up")) dy -= 1;
  if (keys.has("down")) dy += 1;
  if (dx || dy) { moveTarget = null; pendingSit = false; }
  else if (moveTarget) {
    const tx = moveTarget.x - pos.x, ty = moveTarget.y - pos.y;
    const d = Math.hypot(tx, ty);
    if (d < 1.5) { moveTarget = null; if (pendingSit) { pendingSit = false; trySit(); } }
    else { dx = tx / d; dy = ty / d; }
  }
  let moving = !!(dx || dy);
  if (moving && sitting && !CONFIG.swivel[me]) standUp();
  if (moving && spinning(performance.now())) moving = false, dx = dy = 0;
  if (moving) {
    const len = Math.hypot(dx, dy);
    const sp = sitting ? ROLL_SPEED : SPEED;
    const vx = (dx / len) * sp * dt, vy = (dy / len) * sp * dt;
    const ox = pos.x, oy = pos.y;
    if (!blocked(pos.x + vx, pos.y, furniture)) pos.x += vx;
    if (!blocked(pos.x, pos.y + vy, furniture)) pos.y += vy;
    pos.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    if (sitting) Object.assign(myChair, { x: pos.x, y: pos.y, dir: pos.dir });
    if (moveTarget) {
      if (Math.hypot(pos.x - ox, pos.y - oy) < 0.05) {
        stuckT += dt;
        if (stuckT > 0.25) { moveTarget = null; if (pendingSit) { pendingSit = false; trySit(); } }
      } else stuckT = 0;
    }
  }
  pos.moving = moving && !sitting;
  const now = performance.now();
  const key = `${Math.round(pos.x)},${Math.round(pos.y)},${pos.dir},${pos.moving},${sitting}`;
  if (key !== lastPubKey && (now - lastPub > 90 || !moving)) {
    lastPub = now; lastPubKey = key;
    pub({
      x: Math.round(pos.x), y: Math.round(pos.y), dir: pos.dir, moving: pos.moving, sit: sitting,
      chair: { x: Math.round(myChair.x), y: Math.round(myChair.y), dir: myChair.dir },
    });
    if (!moving) LS.set("chair:" + me, { x: Math.round(myChair.x), y: Math.round(myChair.y), dir: myChair.dir });
  }
}

function updateRemote() {
  const p = players[them];
  if (!p || p.x == null) return;
  if (!remote.init || Math.hypot(p.x - remote.x, p.y - remote.y) > 80) { remote.x = p.x; remote.y = p.y; remote.init = true; }
  remote.x += (p.x - remote.x) * 0.22;
  remote.y += (p.y - remote.y) * 0.22;
}

// ---------- silla ----------
function trySit() {
  if (Math.hypot(pos.x - myChair.x, pos.y - myChair.y) > 16) {
    pendingSit = true;
    moveTarget = { x: myChair.x, y: myChair.y };
    return;
  }
  sitting = true;
  pos.x = myChair.x; pos.y = myChair.y; pos.dir = myChair.dir;
  sfx.click();
  lastPubKey = "";
  renderChairBtns();
}
function standUp() {
  sitting = false;
  const tries = [[0, 7], [12, 0], [-12, 0], [0, -6], [0, 12]];
  for (const [ox, oy] of tries) {
    if (!blocked(myChair.x + ox, myChair.y + oy, furniture)) { pos.x = myChair.x + ox; pos.y = myChair.y + oy; break; }
  }
  if (myChair.dir === "up") pos.dir = "down";
  lastPubKey = "";
  renderChairBtns();
}
function toggleSit() { if (sitting) standUp(); else trySit(); }
function spin() {
  if (!sitting || !CONFIG.swivel[me] || spinning(performance.now())) return;
  spinStart = performance.now();
  pub({ spinUntil: net.now() + SPIN_MS });
  sfx.spin();
}
const spinning = (now) => spinStart && now - spinStart < SPIN_MS;
function spinDir(base, k) {
  const quarter = Math.floor(12 * (1 - (1 - k) * (1 - k)));
  return DIRS[(DIRS.indexOf(base) + quarter) % 4];
}
function renderChairBtns() {
  $("#sitBtn").textContent = sitting ? "🧍 Pararme" : "🪑 Sentarme";
  $("#spinBtn").hidden = !(sitting && CONFIG.swivel[me]);
}

// ============================================================
//  DIBUJO
// ============================================================
function resize() {
  const wrap = $("#canvasWrap");
  const narrow = innerWidth <= 900;
  const aw = wrap.clientWidth - 6, ah = narrow ? Infinity : wrap.clientHeight - 12;
  const s = Math.min(aw / W, ah / H);
  S = s >= 2 ? Math.floor(s) : Math.max(1, s);
  const dpr = window.devicePixelRatio || 1;
  K = S * dpr;
  canvas.style.width = W * S + "px";
  canvas.style.height = H * S + "px";
  canvas.width = Math.round(W * K);
  canvas.height = Math.round(H * K);
}

// Estado visible de cada personaje para este cuadro
function charState(who, now) {
  if (who === me) {
    let dir = pos.dir;
    if (sitting && spinning(now)) dir = spinDir(myChair.dir, (now - spinStart) / SPIN_MS);
    return {
      who, online: true, x: pos.x, y: pos.y, dir, moving: pos.moving, sit: sitting,
      chair: { ...myChair, dir: sitting ? dir : myChair.dir },
      holding, status: myStatus, tab: "visible", music: myMusic,
    };
  }
  const p = players[who];
  const online = !!p?.online;
  const ch = { ...CHAIR_HOME[who], ...(p?.chair || {}) };
  let dir = p?.dir || "down";
  const sit = online && !!p?.sit;
  if (sit) {
    ch.x = remote.x; ch.y = remote.y;
    const left = (p.spinUntil || 0) - net.now();
    if (left > 0 && left < SPIN_MS) dir = spinDir(p.chair?.dir || dir, 1 - left / SPIN_MS);
    ch.dir = dir;
  }
  return {
    who, online: online && remote.init, x: remote.x, y: remote.y, dir, moving: !!p?.moving, sit, chair: ch,
    holding: p?.holding, status: p?.status, tab: p?.tab, music: p?.music,
  };
}

function draw(t) {
  const now = performance.now();
  const L = daylight(currentHours());
  const chars = [charState(me, now), charState(them, now)];
  const overlays = [];

  b.imageSmoothingEnabled = false;
  b.drawImage(background, 0, 0);

  // lista de cosas a dibujar ordenadas por profundidad
  const list = furniture.map((f) => ({
    base: f.base,
    draw: () => { b.drawImage(f.img, f.x, f.y); if (f.deskOf) drawDeskItems(f.deskOf); },
  }));
  for (const c of chars) {
    const typing = c.sit && c.chair.dir === "up" && Math.hypot(c.chair.x - CHAIR_HOME[c.who].x, c.chair.y - CHAIR_HOME[c.who].y) < 14;
    // silla (siempre se ve, aunque la persona no esté)
    list.push({
      base: c.chair.y,
      draw: () => {
        const cx = Math.round(c.chair.x), cy = Math.round(c.chair.y);
        const cd = c.chair.dir;
        b.fillStyle = "rgba(20,24,50,.25)"; b.fillRect(cx - 7, cy - 1, 14, 2);
        b.drawImage(chair(c.who, cd, "back"), cx - 10, cy - 26);
        if (c.online && c.sit) {
          const tf = typing && c.online ? Math.floor(t / 170) % 2 : 0;
          b.drawImage(person(c.who, cd, 0, true, tf), cx - 9, cy - 32);
        }
        if (cd === "up") b.drawImage(chair(c.who, "up", "front"), cx - 10, cy - 26);
      },
    });
    if (!c.online) continue;
    if (!c.sit) {
      list.push({
        base: c.y,
        draw: () => {
          const x = Math.round(c.x), y = Math.round(c.y);
          const step = c.moving ? [0, 1, 0, 2][Math.floor(t / 140) % 4] : 0;
          b.fillStyle = "rgba(20,24,50,.3)"; b.fillRect(x - 5, y - 1, 10, 2); b.fillRect(x - 4, y - 2, 8, 1);
          b.drawImage(person(c.who, c.dir, step), x - 9, y - 25 - (step ? 1 : 0));
        },
      });
    }
    const hx = Math.round(c.sit ? c.chair.x : c.x), hy = Math.round(c.sit ? c.chair.y - 29 : c.y - 25);
    overlays.push({ c, hx, hy });
    if (c.who === "ella" && typing && now - lastCodeFloat > 1400) {
      lastCodeFloat = now;
      floaters.push({ sprite: "code", x: DESKS.ella.x + 36 + (Math.random() * 16 - 8), y: 90, t0: now, dur: 1600, dx: Math.random() * 10 - 5 });
    }
  }
  list.sort((a, c) => a.base - c.base);
  for (const d of list) d.draw();

  // luz del día / noche
  const on = (who) => chars.find((c) => c.who === who)?.online;
  applyLighting(b, L, LIGHTS, on);
  drawScreens(b, t, { yoOn: on("yo"), ellaOn: on("ella"), yoStatus: chars.find((c) => c.who === "yo").status });
  drawSky(b, L, t);

  // anillo de voz
  if (voice?.enabled) {
    b.fillStyle = "rgba(255,255,255,.25)";
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 40) {
      const r = FAR - 6;
      b.fillRect(Math.round(pos.x + Math.cos(a) * r), Math.round(pos.y - 6 + Math.sin(a) * r * 0.75), 1, 1);
    }
  }
  // íconos sobre las cabezas (después de la luz para que se lean bien)
  for (const { c, hx, hy } of overlays) {
    const bob = Math.floor(t / 500) % 2;
    if (c.holding) {
      const gift = giftById(c.holding);
      if (gift) b.drawImage(itemSprite(gift), hx - 7, hy - 15 + (Math.floor(t / 250) % 2));
    } else {
      const st = statusOf(c.who, c.status);
      b.drawImage(itemSprite(st), hx - 7, hy - 15 + bob);
      if (st.id === "llamada" && Math.floor(t / 400) % 2) { b.fillStyle = "#ff3b4e"; b.fillRect(hx + 5, hy - 14 + bob, 2, 2); }
    }
    if (c.music) {
      const k = (t / 1200) % 1;
      b.globalAlpha = 1 - k * 0.7;
      b.drawImage(itemSprite("note"), hx + 6 + Math.round(Math.sin(k * 6) * 2), hy - 6 - Math.round(k * 8));
      b.globalAlpha = 1;
    }
    if (c.tab === "hidden") {
      const k = (t / 900) % 1;
      b.fillStyle = "#e9e3ff";
      b.globalAlpha = 1 - k;
      const zx = hx - 12 - Math.round(k * 3), zy = hy + 2 - Math.round(k * 6);
      [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]].forEach(([a, c2]) => b.fillRect(zx + a, zy + c2, 1, 1));
      b.globalAlpha = 1;
    }
  }
  // efectos flotantes
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    const k = (now - f.t0) / f.dur;
    if (k < 0) continue;
    if (k >= 1) { floaters.splice(i, 1); continue; }
    b.globalAlpha = 1 - k * k;
    b.drawImage(itemSprite(f.sprite), Math.round(f.x - 7 + (f.dx || 0) * k), Math.round(f.y - 14 - k * 18));
    b.globalAlpha = 1;
  }

  // a la pantalla
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(buf, 0, 0, canvas.width, canvas.height);

  // textos en alta resolución
  const dpr = window.devicePixelRatio || 1;
  const F = Math.round(Math.max(7, S * 2.4) * dpr);
  g.font = `${F}px "Press Start 2P", monospace`;
  g.textAlign = "center";
  g.textBaseline = "top";
  for (const { c, hx } of overlays) {
    const ny = (c.sit ? c.chair.y : c.y) + 2;
    outlined(nameOf(c.who), hx * K, ny * K, COLORS[c.who]);
    const bb = bubbles[c.who];
    const hy = c.sit ? c.chair.y - 29 : c.y - 25;
    if (bb && bb.until > now) drawBubble(bb.text, hx * K, (hy - 17) * K, F);
  }
  renderClock(L.h);
}

function outlined(txt, x, y, col) {
  g.lineWidth = Math.max(2, K * 0.8);
  g.strokeStyle = "#1a1126";
  g.lineJoin = "round";
  g.strokeText(txt, x, y);
  g.fillStyle = col;
  g.fillText(txt, x, y);
}
function drawBubble(text, cx, by, F) {
  const t = text.length > 28 ? text.slice(0, 27) + "…" : text;
  const w = g.measureText(t).width + F * 1.5, h = F * 2.2;
  const x = Math.round(cx - w / 2), y = Math.round(by - h);
  const p = Math.max(2, Math.round(K / 2));
  g.fillStyle = "#1a1126";
  g.fillRect(x - p, y, w + p * 2, h); g.fillRect(x, y - p, w, h + p * 2);
  g.fillRect(cx - p * 2, y + h, p * 4, p * 2);
  g.fillStyle = "#fff";
  g.fillRect(x, y, w, h);
  g.fillRect(cx - p, y + h, p * 2, p);
  g.fillStyle = "#2b1d33";
  g.textBaseline = "middle";
  g.fillText(t, cx, y + h / 2 + 1);
  g.textBaseline = "top";
}
let lastClock = "";
function renderClock(h) {
  const icon = h < 5.5 || h >= 19.5 ? "🌙" : h < 7.5 ? "🌄" : h < 16.3 ? "☀️" : "🌅";
  const txt = `${icon} ${timeLabel(h)}`;
  if (txt !== lastClock) { lastClock = txt; $("#clock").textContent = txt; }
}

function itemsOf(who) {
  return Object.entries(desks[who] || {}).map(([key, v]) => ({ key, ...v })).sort((a, c) => a.ts - c.ts);
}
function drawDeskItems(who) {
  const list = itemsOf(who).filter((i) => i.slot >= 0 && i.slot < MAX_ITEMS);
  list.sort((a, c) => SLOTS[a.slot].by - SLOTS[c.slot].by);
  for (const it of list) {
    const gift = giftById(it.gift);
    if (!gift) continue;
    const r = slotRect(who, it.slot);
    b.drawImage(itemSprite(gift), r.x - 1, r.y - 1);
  }
}

// ============================================================
//  PROXIMIDAD / VOZ
// ============================================================
const mySt = () => statusOf(me, myStatus);
const silenced = () => autoSilence && !!mySt().silence;
function proximity() {
  const rp = players[them];
  if (!rp?.online || !remote.init) return 0;
  const d = Math.hypot(pos.x - remote.x, pos.y - remote.y);
  return d <= NEAR ? 1 : d >= FAR ? 0 : 1 - (d - NEAR) / (FAR - NEAR);
}
let lastPaused = null;
function updateProximity() {
  if (!voice?.enabled) return;
  const paused = silenced();
  if (paused !== lastPaused) { lastPaused = paused; pub({ vpaused: paused }); }
  const p = proximity();
  const live = voice.state === "connected" && !silenced();
  voice.setVolume(live ? p : 0);
  voice.setMic(live && !userMuted && p > 0);
  renderVoiceInfo(p);
}
function syncVoice() {
  if (!voice) return;
  const rp = players[them];
  voice.sync(!!rp?.online, rp?.voice || 0);
}
function renderVoice() {
  const on = voice.enabled;
  $("#voiceBtn").textContent = on ? "🎤 Salir de voz" : "🎤 Activar voz";
  $("#muteBtn").hidden = !on;
  $("#muteBtn").textContent = userMuted ? "🔇 Mic apagado" : "🔈 Silenciar";
  renderVoiceInfo(proximity());
}
let lastVoiceTxt = "";
function renderVoiceInfo(p) {
  const rp = players[them];
  let txt;
  if (!voice?.enabled) txt = "Apagada";
  else if (silenced()) txt = `Pausada (${mySt().label.toLowerCase()})`;
  else if (voice.state === "failed") txt = "Tu red bloqueó la voz (ver README: TURN)";
  else if (!rp?.online) txt = `${nameOf(them)} no está conectad${a_o(them)}`;
  else if (!rp.voice) txt = `Esperando que ${nameOf(them)} active su voz`;
  else if (voice.state !== "connected") txt = "Conectando…";
  else if (rp.vpaused) txt = `${nameOf(them)} pausó su voz (${statusOf(them, rp.status).label.toLowerCase()})`;
  else if (p <= 0) txt = "Conectada · acércate para hablar";
  else txt = "🔊 " + "█".repeat(Math.ceil(p * 5)) + "░".repeat(5 - Math.ceil(p * 5));
  if (txt !== lastVoiceTxt) { lastVoiceTxt = txt; $("#voiceInfo").textContent = txt; }
}

// ============================================================
//  HUD
// ============================================================
function buildHud() {
  const box = $("#statusBtns");
  box.innerHTML = "";
  for (const st of CONFIG.statuses[me]) {
    const btn = document.createElement("button");
    btn.className = "px-btn";
    btn.dataset.id = st.id;
    btn.style.setProperty("--c", st.color);
    btn.textContent = `${st.emoji} ${st.label}`;
    btn.onclick = () => setStatus(st.id);
    box.appendChild(btn);
  }
  markStatus();

  $("#giftBtn").onclick = () => { $("#giftModal").hidden = false; $("#giftNote").value = ""; };
  $("#dropBtn").onclick = () => setHolding(null);
  $("#pokeBtn").onclick = sendPoke;
  $("#invBtn").onclick = () => { renderInventory(); $("#invModal").hidden = false; };
  $("#invClose").onclick = () => ($("#invModal").hidden = true);
  $("#sitBtn").onclick = toggleSit;
  $("#spinBtn").onclick = spin;
  $("#musicBtn").onclick = openMusic;
  $("#voiceBtn").onclick = toggleVoice;
  $("#muteBtn").onclick = () => { userMuted = !userMuted; renderVoice(); updateProximity(); };
  const as = $("#autoSilence");
  as.checked = autoSilence;
  as.onchange = () => { autoSilence = as.checked; LS.set("autoSilence", autoSilence); updateProximity(); };
  renderChairBtns();

  if ("Notification" in window && Notification.permission === "default") {
    $("#notifBtn").hidden = false;
    $("#notifBtn").onclick = () => Notification.requestPermission().then(() => ($("#notifBtn").hidden = Notification.permission !== "default"));
  }

  $("#giftCancel").onclick = () => ($("#giftModal").hidden = true);
  $("#giftOk").onclick = () => {
    const sel = $("#giftGrid .sel");
    if (!sel) return;
    holdingNote = $("#giftNote").value.trim();
    setHolding(sel.dataset.id);
    $("#giftModal").hidden = true;
    toast(`Llévale el regalo a ${nameOf(them)}: camina a su escritorio y presiona E`);
  };
  const grid = $("#giftGrid");
  for (const gift of CONFIG.gifts) {
    const btn = document.createElement("button");
    btn.className = "gift";
    btn.dataset.id = gift.id;
    btn.append(spriteCanvas(gift), gift.name);
    btn.onclick = () => { grid.querySelectorAll(".sel").forEach((e) => e.classList.remove("sel")); btn.classList.add("sel"); $("#giftOk").disabled = false; sfx.click(); };
    btn.ondblclick = () => $("#giftOk").click();
    grid.appendChild(btn);
  }

  $("#musicCancel").onclick = () => ($("#musicModal").hidden = true);
  $("#musicClear").onclick = () => { setMusic(null); $("#musicModal").hidden = true; };
  $("#musicOk").onclick = () => {
    const raw = $("#musicTitle").value.trim();
    if (!raw) return setMusic(null), ($("#musicModal").hidden = true);
    const [title, ...rest] = raw.split(/\s+[—–-]\s+/);
    setMusic({ title: title.trim(), artist: rest.join(" - ").trim(), url: $("#musicUrl").value.trim(), src: "manual" });
    $("#musicModal").hidden = true;
  };

  $("#chatForm").onsubmit = (e) => {
    e.preventDefault();
    const text = $("#chatInput").value.trim();
    if (!text) return;
    net.push("chat", { from: me, text, ts: net.now() });
    $("#chatInput").value = "";
  };
  $("#prompt").onclick = placeGift;
  renderPeople();
  renderVoice();
}
function spriteCanvas(spec) {
  const c = document.createElement("canvas");
  c.width = c.height = 14;
  c.getContext("2d").drawImage(itemSprite(spec), 0, 0);
  return c;
}

function markStatus() {
  document.querySelectorAll("#statusBtns .px-btn").forEach((x) => x.classList.toggle("active", x.dataset.id === myStatus));
}
function setStatus(id) {
  if (id === myStatus) return;
  myStatus = id;
  const ts = net.now();
  LS.set("status:" + me, id); LS.set("statusTs:" + me, ts);
  pub({ status: id, statusTs: ts });
  markStatus();
  sfx.status();
  updateProximity();
}

async function toggleVoice() {
  if (voice.enabled) {
    voice.disable();
    voiceToken = 0;
    lastPaused = null;
    pub({ voice: 0 });
  } else {
    try { await voice.enable(); } catch (e) {
      toast("No pude usar el micrófono: " + (e.name === "NotAllowedError" ? "permiso denegado" : e.message));
      return;
    }
    voiceToken = Date.now();
    pub({ voice: voiceToken });
    syncVoice();
  }
  renderVoice();
}

// ---------- música ----------
function setMusic(m) {
  myMusic = m;
  if (!m || m.src === "manual") LS.set("music:" + me, m);
  pub({ music: m });
  renderPeople();
}
function songLink(m) {
  return m.url || "https://www.youtube.com/results?search_query=" + encodeURIComponent(`${m.title} ${m.artist || ""}`);
}
const songText = (m) => `${m.title}${m.artist ? " — " + m.artist : ""}`;
function openMusic() {
  const box = $("#spotifyBox");
  box.innerHTML = "";
  if (CONFIG.spotifyClientId) {
    const btn = document.createElement("button");
    btn.className = "px-btn small";
    if (spotifyConnected()) {
      box.append("Spotify conectado: tu canción se comparte sola mientras suena.");
      btn.textContent = "Desconectar";
      btn.onclick = () => { spotifyLogout(); if (myMusic?.src === "spotify") setMusic(null); openMusic(); };
    } else {
      box.append("Conecta Spotify para que se detecte sola:");
      btn.textContent = "🟢 Conectar Spotify";
      btn.onclick = () => spotifyLogin(CONFIG.spotifyClientId);
    }
    box.append(btn);
  } else box.textContent = "Escríbela tú (o activa Spotify en config.js para que salga sola).";
  $("#musicTitle").value = myMusic ? songText(myMusic) : "";
  $("#musicUrl").value = myMusic?.url || "";
  $("#musicModal").hidden = false;
  $("#musicTitle").focus();
}
async function pollSpotify() {
  if (!spotifyConnected()) return;
  try {
    const np = await spotifyNowPlaying(CONFIG.spotifyClientId);
    if (np === undefined) return;
    if (!np) { if (myMusic?.src === "spotify") setMusic(LS.get("music:" + me, null)); return; }
    if (myMusic?.src === "spotify" && myMusic.title === np.title && myMusic.artist === np.artist) return;
    setMusic({ ...np, src: "spotify" });
  } catch (e) { console.warn("spotify:", e); }
}

// ---------- tarjetas ----------
function renderPeople() {
  if (!me) return;
  const box = $("#people");
  for (const who of [me, them]) {
    let el = box.querySelector(`[data-who="${who}"]`);
    if (!el) {
      el = document.createElement("div");
      el.className = "person";
      el.dataset.who = who;
      el.innerHTML = `<canvas width="18" height="26"></canvas><div><div class="nm"><span class="dot"></span><span class="n"></span></div><div class="st"></div><div class="since"></div><a class="song" target="_blank" rel="noopener"></a></div>`;
      el.querySelector("canvas").getContext("2d").drawImage(person(who, "down"), 0, 0);
      el.querySelector(".n").textContent = nameOf(who) + (who === me ? " (tú)" : "");
      el.querySelector(".n").style.color = COLORS[who];
      box.appendChild(el);
    }
    const p = who === me ? { online: true, status: myStatus, statusTs: LS.get("statusTs:" + me, null), tab: "visible", music: myMusic } : players[who];
    const online = !!p?.online;
    const st = statusOf(who, p?.status);
    el.querySelector(".dot").className = "dot " + (online ? (p.tab === "hidden" ? "away" : "on") : "");
    el.querySelector(".st").textContent = online ? `${st.emoji} ${st.label}` : "💤 Desconectad" + a_o(who);
    el.querySelector(".st").style.color = online ? st.color : "";
    el.querySelector(".since").textContent = online
      ? (p.statusTs ? "desde " + ago(p.statusTs) : "") + (p.tab === "hidden" && who !== me ? " · en otra pestaña" : "") : "";
    const a = el.querySelector(".song");
    if (online && p.music?.title) { a.hidden = false; a.textContent = "🎵 " + songText(p.music); a.href = songLink(p.music); a.title = songText(p.music); }
    else a.hidden = true;
  }
}
function ago(ts) {
  const m = Math.max(0, Math.round((net.now() - ts) / 60000));
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  return "las " + new Date(ts).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

// ============================================================
//  REGALOS + INVENTARIO
// ============================================================
function setHolding(id) {
  holding = id;
  pub({ holding: id });
  $("#dropBtn").hidden = !id;
  $("#giftBtn").hidden = !!id;
  if (id) sfx.pick();
}
function nearTheirDesk() {
  const f = deskFront(them);
  return Math.hypot(pos.x - f.x, pos.y - f.y) < 32;
}
function updatePrompt() {
  const el = $("#prompt");
  const show = !!holding && nearTheirDesk();
  if (show !== !el.hidden) el.hidden = !show;
  if (show) {
    const txt = `E · dejar ${giftById(holding)?.emoji || ""} en su escritorio`;
    if (el.textContent !== txt) el.textContent = txt;
  }
}
const freeSlot = (items) => { const used = new Set(items.map((i) => i.slot)); return [0, 1, 2, 3, 4, 5].find((s) => !used.has(s)); };
const toInventory = (who, it) => {
  const { key, slot, ...rest } = it;
  net.push("inventory/" + who, { ...rest, savedTs: net.now() });
  net.remove(`desks/${who}/${key}`);
};
function placeGift() {
  if (!holding || !nearTheirDesk()) return;
  const items = itemsOf(them);
  let slot = freeSlot(items);
  if (slot === undefined) { slot = items[0].slot; toInventory(them, items[0]); } // el más viejo se guarda solo
  const gift = giftById(holding);
  net.push("desks/" + them, { gift: holding, from: me, note: holdingNote || "", ts: net.now(), slot });
  sparkleAtDesk(them, gift);
  sfx.gift();
  toast(`Le dejaste ${gift.emoji} ${gift.name} a ${nameOf(them)}`);
  holdingNote = "";
  setHolding(null);
}
function sparkleAtDesk(who, gift) {
  const d = DESKS[who];
  const now = performance.now();
  [-14, 0, 14].forEach((dx, i) => floaters.push({ sprite: i === 1 ? gift || "✨" : "✨", x: d.x + 36 + dx, y: 104, dx: dx / 3, t0: now + i * 120, dur: 1400 }));
}
const fmtDate = (ts) => new Date(ts).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function renderInventory() {
  const list = Object.entries(inventory).map(([key, v]) => ({ key, ...v })).sort((a, c) => (c.savedTs || 0) - (a.savedTs || 0));
  $("#invBtn").textContent = `🎒 Inventario${list.length ? ` (${list.length})` : ""}`;
  const box = $("#invList");
  if (!box) return;
  box.innerHTML = "";
  if (!list.length) { box.innerHTML = `<div class="empty">Aún no guardas nada. Haz clic en un regalo de tu escritorio y elige “Guardar”.</div>`; return; }
  for (const it of list) {
    const gift = giftById(it.gift);
    const row = document.createElement("div");
    row.className = "inv";
    const info = document.createElement("div");
    const t = document.createElement("div"); t.className = "t"; t.textContent = gift?.name || it.gift;
    const m = document.createElement("div"); m.className = "m"; m.textContent = `De ${nameOf(it.from)} · ${fmtDate(it.ts)}`;
    info.append(t, m);
    if (it.note) { const n = document.createElement("div"); n.className = "n"; n.textContent = `“${it.note}”`; info.append(n); }
    const btn = document.createElement("button");
    btn.className = "px-btn small";
    btn.textContent = "Al escritorio";
    btn.onclick = () => {
      const slot = freeSlot(itemsOf(me));
      if (slot === undefined) return toast("Tu escritorio está lleno: guarda algo primero");
      const { key, savedTs, ...rest } = it;
      net.push("desks/" + me, { ...rest, slot });
      net.remove(`inventory/${me}/${key}`);
      sfx.pick();
    };
    row.append(spriteCanvas(gift || "🎁"), info, btn);
    box.append(row);
  }
}

// ---------- ventanitas al hacer clic ----------
function popup(build, cx, cy) {
  const pop = $("#itemPop");
  pop.innerHTML = "";
  build(pop);
  const row = document.createElement("div");
  row.className = "btn-row end";
  pop._row = row;
  pop.append(row);
  const close = document.createElement("button");
  close.className = "px-btn small"; close.textContent = "OK";
  close.onclick = () => (pop.hidden = true);
  row.append(close);
  pop.hidden = false;
  const wrap = $("#canvasWrap").getBoundingClientRect();
  pop.style.left = Math.min(wrap.width - 240, Math.max(4, cx - wrap.left - 115)) + "px";
  pop.style.top = Math.max(4, cy - wrap.top - pop.offsetHeight - 12) + "px";
}
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

function showItemPop(who, it, cx, cy) {
  const gift = giftById(it.gift);
  popup((pop) => {
    pop.append(el("div", "ttl", `${gift?.emoji || ""} ${gift?.name || it.gift}`), el("div", "meta", `De ${nameOf(it.from)} · ${fmtDate(it.ts)}`));
    if (it.note) pop.append(el("div", "note", it.note));
  }, cx, cy);
  if (who === me) {
    const keep = el("button", "px-btn small", "🎒 Guardar");
    keep.onclick = () => { toInventory(me, it); $("#itemPop").hidden = true; sfx.pick(); toast("Guardado en tu inventario 🎒"); };
    $("#itemPop")._row.prepend(keep);
  }
}
function showPersonPop(c, cx, cy) {
  const st = statusOf(c.who, c.status);
  const p = c.who === me ? { statusTs: LS.get("statusTs:" + me, null) } : players[c.who] || {};
  popup((pop) => {
    pop.append(el("div", "ttl", nameOf(c.who)), el("div", null, `${st.emoji} ${st.label}`));
    if (p.statusTs) pop.append(el("div", "meta", "desde " + ago(p.statusTs)));
    if (c.music?.title) {
      const a = el("a", "note song", "🎵 " + songText(c.music));
      a.href = songLink(c.music); a.target = "_blank"; a.rel = "noopener"; a.style.display = "block";
      pop.append(a);
    } else pop.append(el("div", "meta", "🎵 sin música compartida"));
    if (c.tab === "hidden" && c.who !== me) pop.append(el("div", "meta", "Está en otra pestaña: mándale un poke 👉"));
  }, cx, cy);
}

// ============================================================
//  POKE + AVISOS
// ============================================================
let lastPokeSent = 0;
function sendPoke() {
  if (Date.now() - lastPokeSent < 2500) return;
  lastPokeSent = Date.now();
  net.set("pokes/" + them, { from: me, ts: net.now(), id: Math.random().toString(36).slice(2) });
  sfx.click();
  if (remote.init) floaters.push({ sprite: "👉", x: remote.x, y: remote.y - 18, t0: performance.now(), dur: 1200 });
  toast(`Le hiciste poke a ${nameOf(them)} 👉`);
}
function receivePoke() {
  sfx.poke();
  toast(`👉 ¡${nameOf(them)} te hizo poke!`, true);
  const now = performance.now();
  floaters.push({ sprite: "👉", x: pos.x, y: pos.y - 18, t0: now, dur: 1400 });
  floaters.push({ sprite: "💥", x: pos.x + 8, y: pos.y - 24, t0: now + 150, dur: 900 });
  const st = $("#stage");
  st.classList.remove("shake"); void st.offsetWidth; st.classList.add("shake");
  navigator.vibrate?.([80, 60, 80]);
  alertAway(`👉 ¡${nameOf(them)} te hizo poke!`, "Te está buscando en la oficina");
}

let flashTimer = null;
function alertAway(title, body) {
  if (!document.hidden) return;
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, { body, tag: "oficina", renotify: true });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }
  setFavicon("🔴");
  clearInterval(flashTimer);
  let on = false;
  flashTimer = setInterval(() => { on = !on; document.title = on ? title : titleWithUnread(); }, 1000);
}
function clearAlerts() {
  clearInterval(flashTimer); flashTimer = null;
  unread = 0;
  document.title = BASE_TITLE;
  setFavicon("🏢");
}
const titleWithUnread = () => (unread ? `(${unread}) ` : "") + BASE_TITLE;
function setFavicon(emoji) {
  $("#favicon").href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
}
function toast(text, big = false) {
  const t = el("div", "toast" + (big ? " big" : ""), text);
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), big ? 4500 : 3200);
}

// ============================================================
//  CHAT
// ============================================================
function addMsg(m) {
  if (!m || !m.text) return;
  const box = $("#messages");
  const msg = el("div", "msg" + (m.from === me ? " mine" : ""));
  const who = el("div", "who");
  const n = el("span", null, nameOf(m.from));
  n.style.color = COLORS[m.from];
  who.append(n, el("time", null, new Date(m.ts).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })));
  msg.append(who, el("div", "txt", m.text));
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.appendChild(msg);
  if (atBottom || m.from === me) box.scrollTop = box.scrollHeight;
  if (m.ts >= joinTs - 1000) {
    bubbles[m.from] = { text: m.text, until: performance.now() + 5000 };
    if (m.from !== me) {
      sfx.msg();
      if (document.hidden) { unread++; alertAway(`💬 ${nameOf(m.from)}: ${m.text}`, m.text); }
    }
  }
}
function sysMsg(text) {
  const box = $("#messages");
  box.appendChild(el("div", "msg sys", text));
  box.scrollTop = box.scrollHeight;
}

// ============================================================
//  TECLADO / MOUSE
// ============================================================
const KEYMAP = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down" };
const anyModal = () => [...document.querySelectorAll(".overlay")].some((o) => !o.hidden);
function bindInput() {
  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);
    if (typing) { if (e.key === "Escape") document.activeElement.blur(); return; }
    if (anyModal()) { if (e.key === "Escape") document.querySelectorAll(".overlay").forEach((o) => o.id !== "login" && (o.hidden = true)); return; }
    const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
    if (k) { keys.add(k); e.preventDefault(); return; }
    const key = e.key.toLowerCase();
    if (key === "e") placeGift();
    if (key === "f") toggleSit();
    if (key === "r") spin();
    if (e.key === "Enter") { $("#chatInput").focus(); e.preventDefault(); }
  });
  addEventListener("keyup", (e) => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys.delete(k); });
  addEventListener("blur", () => keys.clear());

  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    const lx = ((e.clientX - r.left) / r.width) * W, ly = ((e.clientY - r.top) / r.height) * H;
    $("#itemPop").hidden = true;
    for (const who of ["yo", "ella"]) {
      for (const it of itemsOf(who)) {
        const s = slotRect(who, it.slot);
        if (lx >= s.x && lx < s.x + s.w && ly >= s.y && ly < s.y + s.h) { showItemPop(who, it, e.clientX, e.clientY); return; }
      }
    }
    const now = performance.now();
    for (const who of [them, me]) {
      const c = charState(who, now);
      if (!c.online) continue;
      const cx = c.sit ? c.chair.x : c.x, cy = c.sit ? c.chair.y - 6 : c.y;
      if (lx >= cx - 7 && lx <= cx + 7 && ly >= cy - 24 && ly <= cy) { showPersonPop(c, e.clientX, e.clientY); return; }
    }
    if (Math.hypot(lx - myChair.x, ly - (myChair.y - 8)) < 9 && !sitting) { trySit(); return; }
    moveTarget = { x: lx, y: ly + 2 };
    pendingSit = false;
    stuckT = 0;
  });
}
