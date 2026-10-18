import Phaser from 'phaser';
const W = 1280, H = 760;
const rng = (s: number) => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Textures générées par code (aucun fichier image à fournir)
export function makeArt(sc: Phaser.Scene) {
  if (sc.textures.exists('ball0')) return;
  const g = sc.add.graphics();
  const tex = (k: string, w: number, h: number) => { g.generateTexture(k, w, h); g.clear(); };
  ([[0xe53935, 'ball0'], [0x2979ff, 'ball1'], [0x8e24aa, 'ball2']] as const).forEach(([c, k]) => {
    g.fillStyle(0x000000, 0.3).fillEllipse(14, 25, 20, 6);
    g.fillStyle(0xf5f5f5).fillCircle(14, 14, 11);
    g.fillStyle(c).beginPath().slice(14, 14, 11, Math.PI, Math.PI * 2, false).closePath().fillPath();
    g.lineStyle(2, 0x222222).strokeCircle(14, 14, 11); g.fillStyle(0x222222).fillRect(3, 13, 22, 2);
    g.fillStyle(0xf5f5f5).fillCircle(14, 14, 4).lineStyle(2, 0x222222).strokeCircle(14, 14, 4);
    tex(k, 28, 30);
  });
  const stal = (k: string, w: number, h: number) => {
    g.fillStyle(0x000000, 0.35).fillEllipse(w / 2, h - 5, w, 10);
    g.fillStyle(0x9a9286).fillTriangle(w / 2, 0, 2, h - 6, w / 2 + 3, h - 6);
    g.fillStyle(0x625c53).fillTriangle(w / 2, 0, w / 2 + 3, h - 6, w - 2, h - 6);
    g.fillStyle(0x7b756a).fillTriangle(w * 0.2, h * 0.45, 0, h - 6, w * 0.4, h - 6);
    tex(k, w, h);
  };
  stal('st0', 26, 48); stal('st1', 34, 36); stal('st2', 22, 62);
  const steps = ['#9a9285', '#847d70', '#6d675c', '#565148', '#3f3b34', '#2a2723'];
  g.fillStyle(0x120f0d).fillRect(0, 0, 96, 160);
  steps.forEach((c, i) => { g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color).fillRect(8 + i * 14, 10, 14, 140); g.fillStyle(0xbdb6a8).fillRect(8 + i * 14, 10, 2, 140); });
  g.fillStyle(0x1e1a17).fillRect(0, 0, 96, 10).fillRect(0, 150, 96, 10); tex('stairs', 96, 160);
  g.fillStyle(0x000000, 0.3).fillEllipse(28, 46, 50, 9); g.fillStyle(0x5d4037).fillRect(6, 40, 44, 7).fillStyle(0x6d4c41).fillRect(14, 35, 28, 6);
  g.fillStyle(0xff7a1a).fillTriangle(28, 2, 12, 40, 44, 40).fillStyle(0xffd54a).fillTriangle(28, 16, 19, 40, 37, 40); tex('camp', 56, 52);
  g.fillStyle(0x000000, 0.3).fillEllipse(22, 32, 42, 7); g.fillStyle(0x8d5a2b).fillRect(4, 12, 36, 20).fillStyle(0xa8692f).fillRect(2, 4, 40, 10);
  g.fillStyle(0xffd34d).fillRect(2, 13, 40, 4).fillRect(19, 14, 6, 9); tex('chest', 44, 36);
  g.fillStyle(0x7d8794).fillEllipse(28, 30, 54, 28).fillStyle(0x4fb3ff).fillEllipse(28, 27, 40, 17).fillStyle(0xbfe6ff).fillTriangle(28, 4, 22, 24, 34, 24); tex('fountain', 56, 46);
  g.fillStyle(0x6f6a78).fillRect(6, 28, 36, 20).fillStyle(0x8e889c).fillRect(2, 22, 44, 9).fillStyle(0xb98cff).fillTriangle(24, 0, 15, 23, 33, 23).fillStyle(0xe6d4ff).fillTriangle(24, 4, 21, 20, 25, 20); tex('altar', 48, 50);
  g.fillStyle(0x6a3bd1, 0.35).fillCircle(20, 20, 19).fillStyle(0xb98cff).fillCircle(20, 20, 11).fillStyle(0xffffff, 0.8).fillCircle(16, 16, 3); tex('orb', 40, 40);
  g.destroy();
}

// Fond de grotte (un par étage), généré sur canvas
export function cave(sc: Phaser.Scene, f: number) {
  const key = `cave${f}`; if (sc.textures.exists(key)) return;
  const t = sc.textures.createCanvas(key, W, H)!, c = t.getContext(), r = rng(1000 + f);
  c.fillStyle = ['#4a4238', '#38424f', '#54372f', '#463a52'][f]; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { const s = 2 + r() * 12; c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.10)'; c.fillRect(r() * W, r() * H, s, s * (0.6 + r())); }
  c.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 70; i++) { c.beginPath(); c.ellipse(r() * W, r() * H, 20 + r() * 50, 10 + r() * 25, r() * 3, 0, 6.3); c.fill(); }
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5;
  for (let i = 0; i < 22; i++) { let x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (r() - 0.4) * 50; y += (r() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); }
  c.fillStyle = '#14110f';
  for (let x = 0; x < W; x += 14) { c.fillRect(x, 0, 16, 40 + r() * 36); c.fillRect(x, H - 40 - r() * 36, 16, 90); }
  for (let y = 0; y < H; y += 14) { c.fillRect(0, y, 22 + r() * 18, 16); c.fillRect(W - 22 - r() * 18, y, 40, 16); }
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  t.refresh();
}
