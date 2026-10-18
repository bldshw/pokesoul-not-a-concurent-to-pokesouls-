import Phaser from 'phaser';
import { ROSTER, ROLE_FR, TYPE_FR } from '../data';
import { SPRITES } from '../sprites';
import { makeArt } from '../art';

export class Pick extends Phaser.Scene {
  constructor() { super('Pick'); }
  preload() {
    for (const [d, i] of Object.entries(SPRITES))
      this.load.spritesheet(`pk${d}`, `sprites/${d.padStart(4, '0')}.png`, { frameWidth: i.w, frameHeight: i.h });
    for (const [d, m] of Object.entries(ROSTER)) if (m.b) this.load.image(`pt${d}`, `portraits/${d}.png`);
  }
  create() {
    makeArt(this);
    for (const [d, i] of Object.entries(SPRITES)) for (let r = 0; r < 8; r++) {
      if (this.anims.exists(`pk${d}-${r}`)) continue;
      this.anims.create({ key: `pk${d}-${r}`, frameRate: 8, repeat: -1, frames: this.anims.generateFrameNumbers(`pk${d}`, { start: r * i.cols, end: r * i.cols + i.cols - 1 }) });
    }
    if (!this.textures.exists('floor')) {
      const g = this.add.graphics();
      g.fillStyle(0x2a2733).fillRect(0, 0, 32, 32).fillStyle(0x1d1b25).fillRect(0, 0, 16, 16).fillRect(16, 16, 16, 16);
      g.generateTexture('floor', 32, 32); g.destroy();
    }
    this.add.text(480, 14, 'Choisis ton équipe de trois (clic sur un Pokémon)', { fontSize: '20px', color: '#fff' }).setOrigin(0.5, 0);
    const picked: number[] = [];
    const info = this.add.text(480, 515, '', { fontSize: '15px', color: '#ddd' }).setOrigin(0.5, 0);
    const go = this.add.text(480, 550, '', { fontSize: '20px', color: '#7df' }).setOrigin(0.5, 0).setInteractive();
    const start = () => { if (picked.length === 3) this.scene.start('Game', { team: picked }); };
    const refresh = () => go.setText(picked.length === 3 ? '▶ COMMENCER (Entrée)' : `Équipe : ${picked.map(d => ROSTER[d].n).join(', ') || '—'}`);
    go.on('pointerdown', start); this.input.keyboard!.on('keydown-ENTER', start); refresh();
    (['assault', 'bulwark', 'ranged', 'support'] as const).forEach((role, row) => {
      this.add.text(10, 46 + row * 117, ROLE_FR[role], { fontSize: '14px', color: '#ffd34d' });
      Object.entries(ROSTER).filter(([, m]) => m.b && m.r === role).forEach(([d, m], i) => {
        this.textures.get(`pt${d}`).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const im = this.add.image(50 + i * 78, 106 + row * 117, `pt${d}`).setDisplaySize(68, 68).setInteractive();
        this.add.text(50 + i * 78, 144 + row * 117, m.n, { fontSize: '10px', color: '#ccc' }).setOrigin(0.5, 0);
        im.on('pointerover', () => info.setText(`${m.n} · ${TYPE_FR[m.t]} · ${ROLE_FR[role]}`));
        im.on('pointerdown', () => {
          const k = +d, j = picked.indexOf(k);
          if (j >= 0) { picked.splice(j, 1); im.clearTint(); } else if (picked.length < 3) { picked.push(k); im.setTint(0x66ccff); }
          refresh();
        });
      });
    });
  }
}
