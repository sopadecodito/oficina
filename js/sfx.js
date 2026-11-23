// Sonidos chiptune generados al vuelo (sin archivos).
let ac = null;
const ctx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());

export function unlock() { try { ctx().resume(); } catch {} }

function tone(freq, dur, { type = "square", vol = 0.06, when = 0, slide = 0 } = {}) {
  try {
    const c = ctx();
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}

export const sfx = {
  click: () => tone(520, 0.04, { vol: 0.04 }),
  msg: () => { tone(880, 0.06, { type: "triangle", vol: 0.1 }); tone(1320, 0.08, { type: "triangle", vol: 0.08, when: 0.06 }); },
  poke: () => { tone(660, 0.07); tone(990, 0.12, { when: 0.08 }); tone(660, 0.07, { when: 0.24 }); tone(990, 0.14, { when: 0.32 }); },
  gift: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, { vol: 0.05, when: i * 0.08 })),
  pick: () => tone(400, 0.1, { slide: 300, vol: 0.05 }),
  spin: () => { for (let i = 0; i < 8; i++) tone(300 + i * 60, 0.09, { type: "triangle", vol: 0.05, when: i * 0.13 * (1 + i * 0.12) }); },
  status: () => { tone(700, 0.05, { type: "triangle", vol: 0.07 }); tone(1050, 0.07, { type: "triangle", vol: 0.07, when: 0.05 }); },
};
