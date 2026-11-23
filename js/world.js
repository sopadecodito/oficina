// Mapa de la oficina: fondo, muebles (ordenados por profundidad), colisiones, pantallas y luces.
import { paint, outline } from "./art.js";

export const W = 320, H = 200;
export const FLOOR_Y = 56;
export const BOUNDS = { x0: 6, x1: 314, y0: 62, y1: 197 };

export const DESKS = {
  yo:   { x: 40,  y: 96, w: 72 },
  ella: { x: 208, y: 96, w: 72 },
};
export const CHAIR_HOME = {
  yo:   { x: 76,  y: 136, dir: "up" },
  ella: { x: 244, y: 136, dir: "up" },
};
export const deskFront = (who) => ({ x: DESKS[who].x + 36, y: 128 });

// Huecos para regalos sobre la cubierta (x relativo, línea base). Orden de llenado.
export const SLOTS = [
  { rx: 1, by: 110 }, { rx: 60, by: 110 }, { rx: 12, by: 110 }, { rx: 49, by: 110 },
  { rx: 0, by: 103 }, { rx: 60, by: 103 },
];
export const slotRect = (who, i) => ({ x: DESKS[who].x + SLOTS[i].rx, y: SLOTS[i].by - 12, w: 12, h: 12 });

export const WINDOWS = [
  { x: 108, y: 10, w: 42, h: 34 },
  { x: 170, y: 10, w: 42, h: 34 },
];
export const panes = (wd) => [
  { x: wd.x + 3, y: wd.y + 3, w: (wd.w - 7) / 2, h: wd.h - 6 },
  { x: wd.x + 4 + (wd.w - 7) / 2, y: wd.y + 3, w: (wd.w - 7) / 2, h: wd.h - 6 },
];

// ---------- colores ----------
const D = {
  deskTop: "#5a6075", deskTopH: "#7a8197", lip: "#8f96ab", panel: "#3f4458", panelD: "#2b2e3d", knee: "#232532",
  metal: "#6c7385", metalH: "#8a91a3", metalD: "#4d5364",
};

// ============================================================
//  FONDO (pared + piso)
// ============================================================
export function buildBackground() {
  return paint(W, H, (R) => {
    // piso de loseta azul
    R(0, FLOOR_Y, W, H - FLOOR_Y, "#6f8cb5");
    for (let y = FLOOR_Y; y < H; y += 16) R(0, y, W, 1, "#6582ab");
    for (let x = 0; x < W; x += 16) R(x, FLOOR_Y, 1, H - FLOOR_Y, "#6582ab");
    for (let y = FLOOR_Y + 1; y < H; y += 16) for (let x = 1; x < W; x += 16) { R(x, y, 6, 1, "#7895bd"); R(x, y, 1, 4, "#7895bd"); }
    R(0, FLOOR_Y, W, 3, "#5b789f");
    // pared
    R(0, 0, W, FLOOR_Y, "#cfcac2");
    for (let x = 10; x < W; x += 20) R(x, 6, 1, 44, "#c6c1b9");
    R(0, 0, W, 5, "#3d3a4c"); R(0, 5, W, 1, "#8c879a");
    R(0, 50, W, 6, "#6f7486"); R(0, 50, W, 1, "#8c91a3");
    // muros laterales
    R(0, 0, 5, H, "#3d3a4c"); R(W - 5, 0, 5, H, "#3d3a4c"); R(0, H - 3, W, 3, "#3d3a4c");

    // ventanas (marco; el cielo se pinta cada cuadro)
    for (const wd of WINDOWS) {
      R(wd.x - 1, wd.y - 1, wd.w + 2, wd.h + 2, "#1b1926");
      R(wd.x, wd.y, wd.w, wd.h, "#ebe7e0");
      R(wd.x + wd.w / 2 - 0.5 | 0, wd.y, 1, wd.h, "#cfcac2");
      R(wd.x - 3, wd.y + wd.h, wd.w + 6, 3, "#b7b1a8"); R(wd.x - 3, wd.y + wd.h + 3, wd.w + 6, 1, "#1b1926");
    }
    // reloj
    R(156, 14, 9, 9, "#1b1926"); R(157, 15, 7, 7, "#f4f1ea"); R(160, 16, 1, 3, "#333"); R(160, 18, 2, 1, "#333");
    // corcho con notas (lado de José)
    R(33, 11, 38, 28, "#1b1926"); R(34, 12, 36, 26, "#8a5a3a"); R(35, 13, 34, 24, "#c89463");
    [[37, 15, "#fff59d"], [46, 14, "#ffffff"], [56, 16, "#a5d6f7"], [39, 25, "#f8bbd0"], [50, 26, "#c5e1a5"], [60, 25, "#fff59d"]]
      .forEach(([x, y, c]) => { R(x, y, 8, 7, c); R(x + 3, y, 2, 1, "#e53935"); R(x + 1, y + 3, 6, 1, "rgba(0,0,0,.18)"); });
    // póster de gráfica
    R(76, 9, 22, 30, "#1b1926"); R(77, 10, 20, 28, "#f4f1ea");
    R(79, 30, 3, 6, "#5276b3"); R(83, 25, 3, 11, "#e8323c"); R(87, 20, 3, 16, "#5cc46a"); R(91, 15, 3, 21, "#ffb340");
    R(79, 12, 14, 1, "#9a9aa8");
    // póster de código (lado de ella)
    R(222, 9, 26, 30, "#1b1926"); R(223, 10, 24, 28, "#2a2140");
    const code = [[225, 13, 6, "#ff8fb8"], [227, 16, 10, "#7dffb0"], [227, 19, 7, "#8fd0ff"], [229, 22, 12, "#ffd166"], [227, 25, 8, "#7dffb0"], [225, 28, 4, "#ff8fb8"], [225, 32, 18, "#b77cff"]];
    code.forEach(([x, y, w, c]) => R(x, y, w, 1, c));
    // calendario
    R(253, 13, 18, 22, "#1b1926"); R(254, 14, 16, 20, "#f4f1ea"); R(254, 14, 16, 5, "#e8323c");
    for (let i = 0; i < 12; i++) R(256 + (i % 4) * 3, 21 + Math.floor(i / 4) * 4, 2, 2, i === 6 ? "#ff8fb8" : "#9a9aa8");
  });
}

// ============================================================
//  MUEBLES: {img, x, y, base, foot}
// ============================================================
export function buildFurniture() {
  const list = [];
  const add = (x, y, w, h, base, foot, fn, opts = {}) => {
    const raw = paint(w + 2, h + 2, (R0, g) => fn((a, b, c, d, col) => R0(a + 1, b + 1, c, d, col), g));
    list.push({ img: opts.noOutline ? raw : outline(raw), x: x - 1, y: y - 1, base, foot, ...opts });
  };

  // Archivero + impresora (esquina izquierda)
  add(8, 32, 26, 46, 78, { x: 8, y: 66, w: 26, h: 12 }, (R) => {
    R(1, 12, 24, 34, D.metal); R(1, 12, 24, 1, D.metalH);
    for (const y of [15, 26, 37]) { R(3, y, 20, 9, D.metalD); R(4, y + 1, 18, 7, D.metal); R(10, y + 3, 6, 2, D.metalH); }
    R(0, 2, 26, 10, "#e9e6e0"); R(0, 2, 26, 1, "#ffffff"); R(3, 0, 18, 3, "#d6d2ca"); R(4, 0, 16, 1, "#fff");
    R(3, 6, 20, 2, "#2b2e3d"); R(19, 4, 2, 1, "#5cc46a"); R(6, 9, 14, 3, "#ffffff");
  });
  // Archivero bajo con charola de papeles y taza
  add(74, 52, 22, 28, 80, { x: 74, y: 70, w: 22, h: 10 }, (R) => {
    R(0, 6, 22, 22, D.metal); R(0, 6, 22, 1, D.metalH);
    for (const y of [9, 18]) { R(2, y, 18, 8, D.metalD); R(3, y + 1, 16, 6, D.metal); R(8, y + 3, 6, 1, D.metalH); }
    R(2, 2, 11, 4, "#f4f1ea"); R(2, 1, 11, 1, "#d6d2ca"); R(15, 1, 4, 5, "#e8323c"); R(19, 2, 1, 2, "#e8323c");
  });
  // Planta grande
  add(98, 46, 16, 30, 76, { x: 100, y: 68, w: 12, h: 8 }, (R) => plant(R, 16, 30));
  // Garrafón
  add(258, 44, 12, 34, 78, { x: 258, y: 70, w: 12, h: 8 }, (R) => {
    R(2, 0, 8, 11, "#7fc4f0"); R(3, 1, 2, 8, "#bfe6ff"); R(1, 11, 10, 2, "#9aa3b5");
    R(0, 13, 12, 21, "#e3e6ec"); R(0, 13, 12, 1, "#ffffff"); R(3, 17, 2, 2, "#2196f3"); R(7, 17, 2, 2, "#f44336"); R(2, 21, 8, 1, "#b0b6c4");
  });
  // Máquina expendedora
  add(282, 20, 32, 60, 80, { x: 282, y: 68, w: 32, h: 12 }, (R) => {
    R(0, 0, 32, 60, "#8e2238"); R(0, 0, 32, 2, "#b03350"); R(1, 2, 1, 56, "#a52c45");
    R(3, 4, 19, 40, "#1d2433"); R(4, 5, 17, 38, "#33405a");
    const snacks = ["#ff7a1a", "#d81e28", "#ffd166", "#5cc46a", "#8fd0ff", "#b77cff", "#ff8fb8", "#f4f1ea"];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) R(5 + c * 4, 7 + r * 9, 3, 6, snacks[(r * 3 + c) % snacks.length]);
      R(4, 13 + r * 9, 17, 1, "#9aa3b5");
    }
    R(24, 5, 6, 12, "#1d2433"); R(25, 6, 4, 3, "#7dffb0"); R(25, 11, 4, 1, "#9aa3b5"); R(25, 13, 4, 1, "#9aa3b5");
    R(24, 20, 6, 4, "#2b2e3d"); R(3, 47, 19, 8, "#1d2433"); R(4, 48, 17, 2, "#2b2e3d");
    R(23, 30, 2, 8, "#d6d2ca");
  });
  // Escritorio de José (dos monitores)
  add(40, 80, 72, 40, 120, { x: 40, y: 100, w: 72, h: 20 }, (R) => {
    desk(R, 16);
    for (const mx of [12, 37]) { R(mx, 2, 23, 16, "#2d3040"); R(mx + 9, 18, 5, 2, "#2d3040"); R(mx + 7, 20, 9, 1, "#3c4054"); }
    R(25, 22, 20, 4, "#cfd3dc"); R(26, 23, 18, 1, "#aab0bd"); R(26, 25, 18, 1, "#aab0bd");
    R(46, 23, 3, 3, "#cfd3dc");
  }, { deskOf: "yo" });
  // Escritorio de ella (laptop)
  add(208, 80, 72, 40, 120, { x: 208, y: 100, w: 72, h: 20 }, (R) => {
    desk(R, 16);
    R(23, 7, 26, 16, "#c9ccd6"); R(24, 8, 24, 14, "#2a2140");
    R(21, 23, 30, 4, "#dfe2ea"); R(22, 24, 28, 1, "#b9bdc9"); R(31, 26, 10, 1, "#b9bdc9");
    R(56, 18, 5, 5, "#f4f1ea"); R(61, 19, 1, 2, "#f4f1ea"); R(57, 19, 3, 1, "#8a5a3a"); // taza
  }, { deskOf: "ella" });
  // Bote de basura con papeles
  add(116, 108, 10, 12, 120, { x: 116, y: 114, w: 10, h: 6 }, (R) => {
    R(0, 2, 10, 10, "#4d5364"); R(1, 3, 8, 1, "#6c7385"); R(1, 0, 3, 3, "#f4f1ea"); R(5, 1, 3, 2, "#e9e6e0");
  });
  // Planta chica junto a ella
  add(192, 98, 12, 22, 120, { x: 193, y: 114, w: 10, h: 6 }, (R) => plant(R, 12, 22));
  // Mesa de centro
  add(146, 148, 28, 12, 160, { x: 146, y: 152, w: 28, h: 8 }, (R) => {
    R(0, 0, 28, 7, "#8a5a3a"); R(0, 0, 28, 1, "#a87250"); R(1, 7, 2, 5, "#5e3c26"); R(25, 7, 2, 5, "#5e3c26");
    R(4, 2, 4, 4, "#f4f1ea"); R(5, 3, 2, 2, "#5e3c26"); R(14, 2, 10, 3, "#5276b3"); R(15, 2, 8, 1, "#8fd0ff");
  });
  // Sillón
  add(124, 168, 72, 29, 197, { x: 124, y: 184, w: 72, h: 13 }, (R) => {
    R(0, 0, 72, 14, "#4f6d7a"); R(1, 1, 70, 1, "#6a8c99");
    R(0, 12, 72, 17, "#405a66"); R(6, 12, 29, 10, "#5c7e8b"); R(37, 12, 29, 10, "#5c7e8b"); R(7, 13, 27, 1, "#7697a3"); R(38, 13, 27, 1, "#7697a3");
    R(0, 6, 6, 23, "#3a515c"); R(66, 6, 6, 23, "#3a515c");
    R(10, 4, 9, 7, "#f8bbd0"); R(53, 4, 9, 7, "#ffd166");
  });
  // Lámpara de pie
  add(208, 148, 10, 42, 190, { x: 209, y: 186, w: 8, h: 4 }, (R) => {
    R(0, 0, 10, 7, "#f4e3b8"); R(1, 0, 8, 1, "#fff7dc"); R(4, 7, 2, 32, "#3d3a4c"); R(1, 39, 8, 3, "#3d3a4c");
  });
  // Cajas: esquina inferior derecha
  add(286, 172, 24, 25, 197, { x: 286, y: 186, w: 24, h: 11 }, (R) => {
    R(0, 11, 24, 14, "#b5835a"); R(0, 11, 24, 1, "#d3a27a"); R(10, 11, 4, 14, "#d9c49a");
    R(3, 0, 18, 11, "#a87250"); R(3, 0, 18, 1, "#c99470"); R(10, 0, 4, 11, "#d9c49a");
  });
  // Planta en la esquina inferior izquierda
  add(8, 168, 16, 30, 197, { x: 10, y: 189, w: 12, h: 8 }, (R) => plant(R, 16, 30));
  return list;
}

function desk(R, top) {
  R(0, top, 72, 14, D.deskTop); R(0, top, 72, 1, D.deskTopH);
  R(0, top + 13, 72, 2, D.lip);
  R(0, top + 15, 72, 9, D.panel);
  R(16, top + 16, 40, 8, D.knee);
  R(1, top + 16, 14, 8, D.panelD); R(3, top + 18, 10, 1, D.metalH); R(3, top + 21, 10, 1, D.metalH);
  R(57, top + 16, 14, 8, D.panelD); R(59, top + 19, 10, 1, D.metalH);
}

function plant(R, w, h) {
  const px = (w - 10) / 2 | 0;
  R(px, h - 10, 10, 10, "#8a5a3a"); R(px, h - 10, 10, 2, "#a87250"); R(px + 1, h - 3, 8, 1, "#6e452c");
  const L = "#4caf50", G = "#2e7d32", Lh = "#7ccf6a";
  const cx = w / 2 | 0;
  R(cx - 1, 4, 2, h - 14, G);
  R(cx - 6, h - 20, 6, 4, L); R(cx + 1, h - 22, 6, 4, L); R(cx - 5, h - 15, 5, 3, G); R(cx + 1, h - 15, 5, 3, G);
  R(cx - 3, 2, 6, 5, L); R(cx - 6, 7, 5, 4, G); R(cx + 1, 7, 5, 4, L); R(cx - 2, 2, 2, 1, Lh); R(cx + 2, 8, 2, 1, Lh); R(cx - 5, h - 20, 2, 1, Lh);
}

export function blocked(x, y, furniture) {
  const l = x - 4, r = x + 4, t = y - 3, b = y;
  if (l < BOUNDS.x0 || r > BOUNDS.x1 || t < BOUNDS.y0 || b > BOUNDS.y1) return true;
  return furniture.some(({ foot: s }) => s && r > s.x && l < s.x + s.w && b > s.y && t < s.y + s.h);
}

// ============================================================
//  PANTALLAS ANIMADAS (se pintan después de la iluminación porque emiten luz)
// ============================================================
export function drawScreens(g, t, state) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // José: dos monitores
  const dx = DESKS.yo.x;
  for (const [i, mx] of [12, 37].entries()) {
    const x = dx + mx + 1, y = 80 + 3, w = 21, h = 14;
    if (!state.yoOn) { R(x, y, w, h, "#15171f"); R(x + 2, y + 2, 4, 1, "#262a36"); continue; }
    R(x, y, w, h, "#dfe8f5");
    R(x, y, w, 3, "#1f6fd1");
    if (i === 0) {
      R(x + 1, y + 4, 9, 4, "#ffffff"); R(x + 11, y + 4, 9, 4, "#ffffff");
      R(x + 2, y + 6, 3 + ((t / 900) | 0) % 5, 1, "#5cc46a"); R(x + 12, y + 6, 6, 1, "#ffb340");
      R(x + 1, y + 9, 19, 4, "#ffffff");
      for (let k = 0; k < 6; k++) R(x + 2 + k * 3, y + 12 - ((k * 7 + ((t / 700) | 0)) % 3), 2, 1 + ((k * 7 + ((t / 700) | 0)) % 3), "#5276b3");
    } else {
      const call = state.yoStatus === "llamada", waiting = state.yoStatus === "esperando";
      R(x + 1, y + 4, 19, 3, call ? "#ff5c6c" : waiting ? "#5cc46a" : "#9aa3b5");
      if (call && ((t / 500) | 0) % 2) R(x + 2, y + 5, 2, 1, "#ffffff");
      for (let k = 0; k < 3; k++) { R(x + 1, y + 8 + k * 2, 19, 1, "#ffffff"); R(x + 2, y + 8 + k * 2, 5 + k * 3, 1, "#9aa3b5"); }
    }
    R(x, y, 1, 1, "rgba(255,255,255,.6)");
  }
  // Ella: laptop programando
  const lx = DESKS.ella.x + 24, ly = 88, lw = 24, lh = 14;
  if (!state.ellaOn) { R(lx, ly, lw, lh, "#15171f"); return; }
  R(lx, ly, lw, lh, "#1e1830");
  const scroll = (t / 650) | 0;
  const cols = ["#ff8fb8", "#7dffb0", "#8fd0ff", "#ffd166", "#b77cff", "#f4f1ea"];
  for (let r = 0; r < 6; r++) {
    const n = r + scroll;
    const hash = (n * 2654435761) >>> 0;
    const indent = (hash % 4) * 2;
    let x = lx + 1 + indent;
    const tokens = 1 + (hash >> 3) % 3;
    for (let k = 0; k < tokens && x < lx + lw - 2; k++) {
      const len = 2 + ((hash >> (5 + k * 3)) % 6);
      R(x, ly + 1 + r * 2, Math.min(len, lx + lw - 1 - x), 1, cols[(hash >> (k * 4)) % cols.length]);
      x += len + 1;
    }
  }
  if (((t / 400) | 0) % 2) R(lx + 2 + ((t / 200) | 0) % 12, ly + 12, 2, 1, "#f4f1ea");
}

// Luces que se encienden de noche: [x, y, radio, color, solo si el dueño está conectado]
export const LIGHTS = [
  { x: 64, y: 92, r: 30, c: "120,170,255", a: 0.45, owner: "yo" },
  { x: 89, y: 92, r: 30, c: "120,170,255", a: 0.45, owner: "yo" },
  { x: 244, y: 96, r: 34, c: "200,140,255", a: 0.5, owner: "ella" },
  { x: 213, y: 152, r: 54, c: "255,205,130", a: 0.65 },
  { x: 296, y: 46, r: 30, c: "255,120,140", a: 0.35 },
];
