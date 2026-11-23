// Ciclo de día con la hora real: cielo en las ventanas + iluminación de la oficina.
import { W, H, WINDOWS, panes } from "./world.js";

// [hora, cielo arriba, cielo abajo, luz ambiente, color de los rayos, intensidad rayos, noche 0..1]
const KEYS = [
  [0,     "#0b1030", "#1f2655", "#4b5690", "#000000", 0,    1],
  [5,     "#121640", "#2c2f62", "#4f5a92", "#000000", 0,    1],
  [6,     "#3b3f86", "#c98aa8", "#8e86b4", "#ffb8a0", 0.1,  0.6],
  [7,     "#7aa6e8", "#f7c6a6", "#d9d2e8", "#ffd9b0", 0.3,  0.1],
  [9,     "#5fb0f2", "#c6e8ff", "#f4f6ff", "#fff4d6", 0.35, 0],
  [13,    "#4aa3f0", "#a8d8ff", "#ffffff", "#fffbe8", 0.28, 0],
  [15.5,  "#5aa0e6", "#d6e4ef", "#fff1de", "#ffe2b0", 0.38, 0],
  [16.5,  "#8a86c9", "#ffbe78", "#ffd6a8", "#ffb35c", 0.5,  0],
  [17,    "#d9667a", "#ffb347", "#ffb37a", "#ff9a3c", 0.62, 0],
  [17.75, "#9a5a9e", "#ff7f50", "#e8a08a", "#ff7a4a", 0.42, 0.15],
  [18.5,  "#4a3a7e", "#b85a7a", "#9a88b0", "#000000", 0,    0.6],
  [19.5,  "#1c1f4e", "#3d3470", "#5f6699", "#000000", 0,    0.9],
  [21,    "#0e1236", "#222a5c", "#4d5892", "#000000", 0,    1],
  [24,    "#0b1030", "#1f2655", "#4b5690", "#000000", 0,    1],
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const params = new URLSearchParams(location.search);
const fixedHour = params.has("hora") ? parseFloat(params.get("hora")) : null;
const fast = params.has("rapido");
const t0 = Date.now();

export function currentHours() {
  if (fixedHour != null && !isNaN(fixedHour)) return fixedHour % 24;
  const d = new Date();
  let h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  if (fast) h = (h + (Date.now() - t0) / 1000) % 24; // 1 hora por segundo
  return h;
}

export function daylight(h) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const k = (h - a[0]) / (b[0] - a[0]);
  return {
    h,
    top: mix(hex(a[1]), hex(b[1]), k),
    bot: mix(hex(a[2]), hex(b[2]), k),
    amb: mix(hex(a[3]), hex(b[3]), k),
    beam: mix(hex(a[4] === "#000000" ? b[4] : a[4]), hex(b[4] === "#000000" ? a[4] : b[4]), k),
    beamA: a[5] + (b[5] - a[5]) * k,
    night: a[6] + (b[6] - a[6]) * k,
  };
}

const SUNRISE = 6.2, SUNSET = 18.6;
const X0 = WINDOWS[0].x, X1 = WINDOWS[WINDOWS.length - 1].x + WINDOWS[WINDOWS.length - 1].w;

export function applyLighting(g, L, lights, isOn) {
  // 1) luz ambiente (multiplica toda la escena)
  g.globalCompositeOperation = "multiply";
  g.fillStyle = rgb(L.amb);
  g.fillRect(0, 0, W, H);

  // 2) rayos de sol que entran por las ventanas
  if (L.beamA > 0.01 && L.h > SUNRISE && L.h < SUNSET) {
    const p = (L.h - SUNRISE) / (SUNSET - SUNRISE);
    const low = 1 - Math.sin(p * Math.PI);
    const sh = (0.5 - p) * 110;
    const len = 40 + low * 90;
    g.globalCompositeOperation = "screen";
    for (const wd of WINDOWS) {
      for (const [inset, alpha] of [[0, L.beamA * 0.55], [5, L.beamA * 0.45]]) {
        g.fillStyle = rgb(L.beam, alpha);
        g.beginPath();
        g.moveTo(wd.x + 3 + inset, wd.y + wd.h);
        g.lineTo(wd.x + wd.w - 3 - inset, wd.y + wd.h);
        g.lineTo(wd.x + wd.w - 3 - inset + sh, wd.y + wd.h + len);
        g.lineTo(wd.x + 3 + inset + sh, wd.y + wd.h + len);
        g.closePath();
        g.fill();
      }
    }
  }

  // 3) lámparas y pantallas cuando oscurece (círculos en bandas, estilo retro)
  if (L.night > 0.02) {
    g.globalCompositeOperation = "lighter";
    for (const l of lights) {
      if (l.owner && !isOn(l.owner)) continue;
      const a = l.a * L.night;
      const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      gr.addColorStop(0, `rgba(${l.c},${a})`);
      gr.addColorStop(0.4, `rgba(${l.c},${a})`);
      gr.addColorStop(0.41, `rgba(${l.c},${a * 0.55})`);
      gr.addColorStop(0.7, `rgba(${l.c},${a * 0.55})`);
      gr.addColorStop(0.71, `rgba(${l.c},${a * 0.22})`);
      gr.addColorStop(1, `rgba(${l.c},0)`);
      g.fillStyle = gr;
      g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
  }
  g.globalCompositeOperation = "source-over";
}

// Cielo dentro de los vidrios (sol/luna/estrellas/nubes)
export function drawSky(g, L, t) {
  const p = (L.h - SUNRISE) / (SUNSET - SUNRISE);
  const sunUp = p > 0 && p < 1;
  const sunX = X0 + p * (X1 - X0), sunY = 46 - Math.sin(p * Math.PI) * 34;
  const lowK = sunUp ? 1 - Math.sin(p * Math.PI) : 0;
  const sunCol = mix([255, 246, 200], [255, 160, 60], lowK);
  // luna: 19:00 → 6:00
  const mh = L.h >= 18.5 ? L.h - 18.5 : L.h + 5.5;
  const q = mh / 11.5;
  const moonX = X0 + q * (X1 - X0), moonY = 44 - Math.sin(q * Math.PI) * 28;

  for (const wd of WINDOWS) for (const pn of panes(wd)) {
    g.save();
    g.beginPath(); g.rect(pn.x, pn.y, pn.w, pn.h); g.clip();
    // degradado en franjas (pixel)
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      g.fillStyle = rgb(mix(L.top, L.bot, i / (bands - 1)));
      g.fillRect(pn.x, pn.y + (pn.h * i) / bands, pn.w, pn.h / bands + 1);
    }
    // estrellas
    if (L.night > 0.3) {
      for (let s = 0; s < 40; s++) {
        const sx = X0 + ((s * 37) % (X1 - X0)), sy = 12 + ((s * 23) % 24);
        const tw = Math.sin(t / 500 + s * 1.7) > 0.3 ? 1 : 0.4;
        g.fillStyle = `rgba(255,255,240,${(L.night - 0.3) * tw})`;
        g.fillRect(sx, sy, 1, 1);
      }
      g.fillStyle = `rgba(245,240,220,${Math.min(1, L.night)})`;
      g.fillRect(Math.round(moonX) - 2, Math.round(moonY) - 2, 5, 5);
      g.fillRect(Math.round(moonX) - 3, Math.round(moonY) - 1, 7, 3);
      g.fillStyle = rgb(mix(L.top, L.bot, 0.3));
      g.fillRect(Math.round(moonX), Math.round(moonY) - 2, 3, 3);
    }
    // sol
    if (sunUp) {
      const sx = Math.round(sunX), sy = Math.round(sunY);
      g.fillStyle = rgb(sunCol, 0.35);
      g.fillRect(sx - 5, sy - 3, 11, 7); g.fillRect(sx - 3, sy - 5, 7, 11);
      g.fillStyle = rgb(sunCol);
      g.fillRect(sx - 3, sy - 2, 7, 5); g.fillRect(sx - 2, sy - 3, 5, 7);
    }
    // nubes
    const cloudCol = mix(mix([255, 255, 255], L.bot, 0.35), [40, 40, 80], L.night * 0.6);
    for (let c = 0; c < 3; c++) {
      const span = X1 - X0 + 40;
      const cx = X0 - 20 + ((t / 1000) * (1.2 + c * 0.5) + c * 47) % span;
      const cy = 16 + c * 7;
      g.fillStyle = rgb(cloudCol, 0.9);
      g.fillRect(Math.round(cx), cy, 12, 3); g.fillRect(Math.round(cx) + 3, cy - 2, 6, 2);
    }
    g.restore();
  }
  // persianas recogidas arriba
  for (const wd of WINDOWS) {
    g.fillStyle = "#e9e6e0"; g.fillRect(wd.x + 2, wd.y + 2, wd.w - 4, 4);
    g.fillStyle = "#c9c4bb"; g.fillRect(wd.x + 2, wd.y + 3, wd.w - 4, 1); g.fillRect(wd.x + 2, wd.y + 5, wd.w - 4, 1);
  }
}

export const timeLabel = (h) => {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  const ampm = hh < 12 ? "am" : "pm";
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${ampm}`;
};
