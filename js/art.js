// Arte pixel: utilidades, personajes, sillas y sprites especiales.
export const OUT = "#1b1926";

export function cv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

// Dibuja con fn(R, g) en un canvas nuevo. R(x,y,w,h,color)
export function paint(w, h, fn) {
  const c = cv(w, h);
  const g = c.getContext("2d");
  const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  fn(R, g);
  return c;
}

// Contorno oscuro de 1px alrededor de los píxeles opacos (look del pixel art de referencia)
export function outline(src, col = OUT) {
  const w = src.width, h = src.height;
  const d = src.getContext("2d").getImageData(0, 0, w, h).data;
  const c = cv(w, h);
  const g = c.getContext("2d");
  const out = g.createImageData(w, h);
  const o = out.data;
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16));
  const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) {
      const i = (y * w + x) * 4;
      o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  g.drawImage(src, 0, 0);
  return c;
}

export function flipX(src) {
  const c = cv(src.width, src.height);
  const g = c.getContext("2d");
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}

// ============================================================
//  PERSONAJES  (sprite 18x26, pies en la fila 24 → se dibuja en (x-9, y-25))
// ============================================================
export const PAL = {
  yo: {
    skin: "#f0c08a", hair: "#2e2320", hairH: "#4d3a2e",
    top: "#3b5b8f", topH: "#5276b3", topS: "#2c4570",
    bottom: "#2d3142", shoe: "#16161d", eye: "#1d1a24", mouth: "#a8584e",
    glass: "#e8323c", phone: "#2a2a33", phoneH: "#5a5a70", acc: "#e8323c",
  },
  ella: {
    skin: "#f8d0aa", hair: "#4a2a20", hairH: "#7a4632",
    top: "#e88aac", topH: "#f8b6cc", topS: "#c56a8d",
    bottom: "#4b3a63", legs: "#3b3046", shoe: "#7a3050", eye: "#1d1a24",
    iris: "#5b3424", irisL: "#b8783f", blush: "#ff9fb3", mouth: "#c4566a",
  },
};

function headFront(R, P, who, y) {
  if (who === "ella") R(2, 2 + y, 12, 14, P.hair); // pelo largo detrás
  R(3, 3 + y, 10, 8, P.skin); R(4, 11 + y, 8, 1, P.skin);
  if (who === "yo") {
    R(4, 0 + y, 8, 1, P.hair); R(3, 1 + y, 10, 4, P.hair); R(2, 2 + y, 1, 4, P.hair); R(13, 2 + y, 1, 4, P.hair);
    R(4, 5 + y, 2, 1, P.hair); R(8, 5 + y, 1, 1, P.hair); R(11, 5 + y, 1, 1, P.hair); R(5, 1 + y, 3, 1, P.hairH);
    R(5, 7 + y, 2, 2, P.eye); R(9, 7 + y, 2, 2, P.eye); R(5, 7 + y, 1, 1, "#fff"); R(9, 7 + y, 1, 1, "#fff");
    // lentes rojos (armazón delgado)
    R(4, 6 + y, 3, 1, P.glass); R(9, 6 + y, 3, 1, P.glass); R(7, 7 + y, 2, 1, P.glass);
    R(4, 7 + y, 1, 2, P.glass); R(11, 7 + y, 1, 2, P.glass);
    R(5, 9 + y, 2, 1, P.glass); R(9, 9 + y, 2, 1, P.glass);
    R(7, 10 + y, 2, 1, P.mouth);
    // audífonos
    R(3, 0 + y, 10, 1, P.phone); R(5, 0 + y, 3, 1, P.phoneH);
    R(2, 1 + y, 1, 4, P.phone); R(13, 1 + y, 1, 4, P.phone);
    R(1, 5 + y, 2, 4, P.phone); R(13, 5 + y, 2, 4, P.phone); R(1, 6 + y, 1, 2, P.acc); R(14, 6 + y, 1, 2, P.acc);
  } else {
    R(4, 0 + y, 8, 1, P.hair); R(3, 1 + y, 10, 4, P.hair); R(9, 2 + y, 2, 1, P.hairH); R(5, 1 + y, 2, 1, P.hairH);
    // fleco
    R(3, 4 + y, 10, 1, P.hair);
    R(3, 5 + y, 2, 1, P.hair); R(6, 5 + y, 1, 1, P.hair); R(9, 5 + y, 1, 1, P.hair); R(11, 5 + y, 2, 1, P.hair);
    R(2, 4 + y, 2, 9, P.hair); R(12, 4 + y, 2, 9, P.hair);
    // ojos preciosos: pestañas, iris grande con brillo
    R(4, 6 + y, 3, 1, P.eye); R(9, 6 + y, 3, 1, P.eye);
    R(5, 7 + y, 2, 2, P.iris); R(9, 7 + y, 2, 2, P.iris);
    R(5, 7 + y, 1, 1, "#fff"); R(9, 7 + y, 1, 1, "#fff");
    R(6, 8 + y, 1, 1, P.irisL); R(10, 8 + y, 1, 1, P.irisL);
    R(4, 9 + y, 1, 1, P.blush); R(11, 9 + y, 1, 1, P.blush);
    R(7, 10 + y, 2, 1, P.mouth);
  }
}

function headBack(R, P, who, y) {
  if (who === "yo") {
    R(4, 0 + y, 8, 1, P.hair); R(3, 1 + y, 10, 10, P.hair); R(4, 11 + y, 8, 1, P.skin); R(5, 2 + y, 3, 1, P.hairH);
    R(3, 0 + y, 10, 1, P.phone); R(2, 1 + y, 1, 4, P.phone); R(13, 1 + y, 1, 4, P.phone);
    R(1, 5 + y, 2, 4, P.phone); R(13, 5 + y, 2, 4, P.phone); R(1, 6 + y, 1, 2, P.acc); R(14, 6 + y, 1, 2, P.acc);
  } else {
    R(4, 0 + y, 8, 1, P.hair); R(3, 1 + y, 10, 1, P.hair); R(2, 2 + y, 12, 15, P.hair);
    R(5, 1 + y, 3, 1, P.hairH); R(6, 6 + y, 1, 8, P.hairH); R(10, 4 + y, 1, 6, P.hairH);
  }
}

function headSide(R, P, who, y) {
  R(4, 3 + y, 9, 8, P.skin); R(13, 7 + y, 1, 1, P.skin); R(5, 11 + y, 7, 1, P.skin);
  if (who === "yo") {
    R(4, 0 + y, 7, 1, P.hair); R(3, 1 + y, 9, 4, P.hair); R(3, 5 + y, 4, 5, P.hair); R(11, 4 + y, 2, 1, P.hair); R(5, 1 + y, 3, 1, P.hairH);
    R(10, 7 + y, 2, 2, P.eye); R(10, 7 + y, 1, 1, "#fff");
    R(9, 6 + y, 3, 1, P.glass); R(12, 7 + y, 1, 2, P.glass); R(10, 9 + y, 2, 1, P.glass); R(6, 7 + y, 4, 1, P.glass);
    R(6, 0 + y, 2, 5, P.phone); R(5, 5 + y, 3, 4, P.phone); R(6, 6 + y, 1, 2, P.acc);
    R(12, 10 + y, 1, 1, P.mouth);
  } else {
    R(4, 0 + y, 7, 1, P.hair); R(3, 1 + y, 10, 3, P.hair); R(3, 4 + y, 4, 6, P.hair); R(6, 1 + y, 3, 1, P.hairH);
    R(9, 4 + y, 4, 1, P.hair); R(12, 5 + y, 1, 1, P.hair); R(10, 5 + y, 1, 1, P.hair);
    R(10, 6 + y, 2, 1, P.eye); R(12, 6 + y, 1, 1, P.eye);
    R(10, 7 + y, 2, 2, P.iris); R(10, 7 + y, 1, 1, "#fff"); R(11, 8 + y, 1, 1, P.irisL);
    R(11, 9 + y, 1, 1, P.blush); R(12, 10 + y, 1, 1, P.mouth);
  }
}

// Torso + brazos. arm: desplazamiento vertical de cada brazo (para caminar/teclear)
function upperFront(R, P, who, y, aL = 0, aR = 0, back = false) {
  R(7, 12 + y, 2, 1, P.skin);
  R(3, 13 + y, 10, 2, P.top); R(4, 15 + y, 8, 3, P.top);
  if (!back) { if (who === "yo") { R(6, 13 + y, 4, 1, P.topH); R(5, 14 + y, 1, 3, P.topH); } else R(5, 14 + y, 2, 1, P.topH); }
  R(2, 14 + y + aL, 2, 4, P.topS); R(12, 14 + y + aR, 2, 4, P.topS);
  R(2, 18 + y + aL, 2, 1, P.skin); R(12, 18 + y + aR, 2, 1, P.skin);
  if (who === "ella" && !back) { R(2, 13 + y, 1, 3, P.hair); R(13, 13 + y, 1, 3, P.hair); }
}
function legsFront(R, P, who, lift) {
  if (who === "yo") {
    R(4, 18, 8, 2, P.bottom);
    if (lift === 1) { R(4, 20, 3, 1, P.bottom); R(3, 21, 4, 2, P.shoe); } else { R(4, 20, 3, 2, P.bottom); R(3, 22, 4, 2, P.shoe); }
    if (lift === 2) { R(9, 20, 3, 1, P.bottom); R(9, 21, 4, 2, P.shoe); } else { R(9, 20, 3, 2, P.bottom); R(9, 22, 4, 2, P.shoe); }
  } else {
    R(4, 18, 8, 2, P.bottom); R(3, 20, 10, 1, P.bottom);
    if (lift === 1) R(4, 21, 3, 2, P.shoe); else { R(5, 21, 2, 1, P.legs); R(4, 22, 3, 2, P.shoe); }
    if (lift === 2) R(9, 21, 3, 2, P.shoe); else { R(9, 21, 2, 1, P.legs); R(9, 22, 3, 2, P.shoe); }
  }
}
function upperSide(R, P, who, y, swing = 0) {
  R(7, 12 + y, 3, 1, P.skin);
  R(5, 13 + y, 6, 5, P.top); R(6, 13 + y, 2, 1, P.topH);
  R(7 + swing, 14 + y, 3, 4, P.topS); R(8 + swing, 18 + y, 2, 1, P.skin);
}
function legsSide(R, P, who, step) {
  const B = P.bottom, L = who === "yo" ? P.bottom : P.legs, S = P.shoe;
  if (who === "yo") R(5, 18, 6, 2, B); else { R(4, 18, 8, 2, B); R(4, 20, 8, 1, B); }
  const top = who === "yo" ? 20 : 21, hl = who === "yo" ? 2 : 1;
  if (step === 1) { R(9, top, 2, hl, L); R(9, 22, 4, 2, S); R(5, top, 2, hl, L); R(4, 22, 3, 2, S); }
  else if (step === 2) { R(7, top, 3, 1, L); R(7, 21, 5, 2, S); R(5, top, 2, hl, L); R(5, 22, 3, 2, S); }
  else { R(6, top, 4, hl, L); R(6, 22, 6, 2, S); }
}

// pose: {dir, step(0..2), sit, type(0/1)}
const pcache = new Map();
export function person(who, dir, step = 0, sit = false, type = 0) {
  const key = `${who}${dir}${step}${sit}${type}`;
  if (pcache.has(key)) return pcache.get(key);
  let img;
  if (dir === "left") img = flipX(person(who, "right", step, sit, type));
  else {
    const P = PAL[who];
    const raw = paint(18, 26, (R0, g) => {
      const R = (x, y, w, h, c) => R0(x + 1, y + 1, w, h, c);
      const dy = sit ? 3 : 0;
      if (dir === "down") {
        if (sit) {
          if (who === "yo") R(4, 21, 8, 2, P.bottom); else { R(3, 21, 10, 2, P.bottom); }
          R(4, 23, 3, 1, P.shoe); R(9, 23, 3, 1, P.shoe);
        } else legsFront(R, P, who, step);
        upperFront(R, P, who, dy, step === 2 ? -1 : 0, step === 1 ? -1 : 0);
        headFront(R, P, who, dy);
      } else if (dir === "up") {
        if (sit) { if (who === "yo") R(4, 21, 8, 2, P.bottom); else R(3, 21, 10, 2, P.bottom); }
        else legsFront(R, P, who, step);
        const tL = sit && type ? -1 : 0, tR = sit && !type ? -1 : 0;
        upperFront(R, P, who, dy, sit ? tL : step === 2 ? -1 : 0, sit ? tR : step === 1 ? -1 : 0, true);
        headBack(R, P, who, dy);
      } else {
        if (sit) {
          if (who === "yo") R(6, 21, 7, 2, P.bottom); else R(5, 21, 8, 2, P.bottom);
          R(12, 23, 3, 1, P.shoe);
        } else legsSide(R, P, who, step);
        if (who === "ella") R(2, 2 + dy, 6, 15, P.hair);
        upperSide(R, P, who, dy, sit ? 1 : step === 1 ? 1 : step === 2 ? -1 : 0);
        if (who === "ella") R(3, 13 + dy, 3, 4, P.hair);
        headSide(R, P, who, dy);
      }
    });
    img = outline(raw);
  }
  pcache.set(key, img);
  return img;
}

// ============================================================
//  SILLA GIRATORIA (20x28, piso en la fila 26 → se dibuja en (x-10, y-26))
// ============================================================
export const CHAIR_COL = {
  yo: { c: "#b52a3a", l: "#dc4a5c", d: "#7d1a28" },
  ella: { c: "#c9608e", l: "#eb8ab2", d: "#8f3d62" },
};
const ccache = new Map();
// layer: "back" (detrás del personaje) o "front" (respaldo delante, cuando ve hacia arriba)
export function chair(who, dir, layer) {
  const key = who + dir + layer;
  if (ccache.has(key)) return ccache.get(key);
  const C = CHAIR_COL[who];
  const M = "#3a3a46", MH = "#5d5d6e";
  let img;
  if (dir === "left") img = flipX(chair(who, "right", layer));
  else {
    const ax = 10, ay = 26;
    const raw = paint(20, 28, (R) => {
      const back = (x, y, w, h) => { R(x, y, w, h, C.c); R(x + 1, y + 1, w - 2, 1, C.l); R(x, y + h - 1, w, 1, C.d); };
      if (layer === "back") {
        if (dir === "down") back(ax - 6, ay - 22, 12, 13);
        if (dir === "right") back(ax - 8, ay - 21, 3, 13);
        // base de estrella + ruedas
        R(ax - 1, ay - 6, 2, 5, M);
        R(ax - 7, ay - 2, 14, 1, M); R(ax - 4, ay - 3, 8, 1, MH);
        R(ax - 8, ay - 1, 2, 2, "#202028"); R(ax + 6, ay - 1, 2, 2, "#202028"); R(ax - 1, ay - 1, 2, 2, "#202028");
        // asiento
        R(ax - 6, ay - 10, 12, 4, C.c); R(ax - 6, ay - 10, 12, 1, C.l); R(ax - 6, ay - 7, 12, 1, C.d);
        if (dir === "right") R(ax - 5, ay - 9, 2, 2, M);
      } else if (dir === "up") {
        back(ax - 6, ay - 17, 12, 10);
        R(ax - 1, ay - 7, 2, 1, M);
      }
    });
    img = outline(raw);
  }
  ccache.set(key, img);
  return img;
}

// ============================================================
//  SPRITES DE OBJETOS (14x14 con contorno)
// ============================================================
const special = {
  cheetos: () => paint(14, 14, (R) => {
    const o = (x, y, w, h, c) => R(x + 1, y + 1, w, h, c);
    o(2, 2, 8, 10, "#d81e28");
    o(2, 1, 8, 1, "#8c1118"); o(3, 0, 1, 1, "#8c1118"); o(5, 0, 1, 1, "#8c1118"); o(7, 0, 1, 1, "#8c1118");
    o(3, 3, 6, 3, "#ff9a2a"); o(4, 4, 4, 1, "#fff2c0");
    o(2, 9, 8, 3, "#ff7a1a"); o(3, 8, 1, 1, "#ff7a1a"); o(5, 7, 1, 2, "#ffb21a"); o(7, 8, 1, 1, "#ffb21a"); o(4, 10, 4, 1, "#ffd34d");
    o(3, 2, 1, 6, "#ff4a54");
    o(10, 6, 2, 1, "#ff4b1f"); o(11, 7, 1, 2, "#ff4b1f");
    o(0, 9, 2, 1, "#e8371a"); o(0, 10, 1, 1, "#e8371a");
  }),
  phone: () => paint(14, 14, (R) => {
    const rows = [
      ".gg.......",
      "gGgg......",
      "gGg.......",
      ".gg.......",
      "..gg......",
      "...gg.....",
      "....gg.gg.",
      ".....ggggg",
      "......gGgg",
      ".......gg.",
    ];
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== "." && R(x + 2, y + 2, 1, 1, ch === "G" ? "#a8f0b0" : "#3fb653")));
  }),
  note: () => paint(14, 14, (R) => {
    const o = (x, y, w, h, c) => R(x + 2, y + 1, w, h, c);
    const c = "#9ff0c4", d = "#4fc48a";
    o(3, 0, 6, 2, c); o(8, 0, 1, 8, c); o(3, 0, 1, 9, c);
    o(0, 8, 4, 3, c); o(5, 7, 4, 3, c); o(1, 9, 1, 1, d); o(6, 8, 1, 1, d);
  }),
  code: () => paint(14, 14, (R) => {
    const o = (x, y, w, h, c) => R(x + 1, y + 1, w, h, c);
    const c = "#7dffb0";
    o(2, 3, 1, 1, c); o(1, 4, 1, 1, c); o(0, 5, 1, 1, c); o(1, 6, 1, 1, c); o(2, 7, 1, 1, c);
    o(7, 2, 1, 2, c); o(6, 4, 1, 2, c); o(5, 6, 1, 2, c);
    o(9, 3, 1, 1, c); o(10, 4, 1, 1, c); o(11, 5, 1, 1, c); o(10, 6, 1, 1, c); o(9, 7, 1, 1, c);
  }),
};

const scache = new Map();
// Sprite para un regalo/estatus: personalizado o emoji pixelado, siempre 14x14 con contorno.
export function itemSprite(spec) {
  const key = typeof spec === "string" ? spec : spec.sprite || spec.emoji;
  if (scache.has(key)) return scache.get(key);
  let raw;
  if (special[key]) raw = special[key]();
  else {
    raw = cv(14, 14);
    const g = raw.getContext("2d");
    const tmp = cv(12, 12);
    const t = tmp.getContext("2d");
    t.textAlign = "center"; t.textBaseline = "middle";
    t.font = `11px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    t.fillText(key, 6, 7);
    const img = t.getImageData(0, 0, 12, 12);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] < 110 ? 0 : 255;
    t.putImageData(img, 0, 0);
    g.drawImage(tmp, 1, 1);
  }
  const out = special[key] && key === "code" ? raw : outline(raw);
  scache.set(key, out);
  return out;
}
