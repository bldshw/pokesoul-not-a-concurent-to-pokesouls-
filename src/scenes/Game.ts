import Phaser from 'phaser';
import { POKEMON, MOVES, COMBOS } from '../data';

type Foe = Phaser.Physics.Arcade.Sprite & { hp: number; wind: number; cd: number };
const CAMP = { x: 200, y: 200 };
const W = 1600, H = 1200;

export class Game extends Phaser.Scene {
  private p!: Phaser.Physics.Arcade.Sprite;
  private foes!: Phaser.Physics.Arcade.Group;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Text;
  private team = ['poussifeu', 'carapuce', 'bulbizarre'].map(id => ({ id, hp: POKEMON[id].hp, lvl: 1 }));
  private cur = 0; private stamina = 100; private souls = 0;
  private rollT = 0; private atkCd = 0; private swapCd = 0; private stDelay = 0;
  private combo = { mult: 1, until: 0 };
  private stain?: { x: number; y: number; amount: number; spr: Phaser.GameObjects.Arc };

  private get mon() { return this.team[this.cur]; }
  private maxHp(m: { id: string; lvl: number }) { return POKEMON[m.id].hp * (1 + 0.2 * (m.lvl - 1)); }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0x2a2733).fillRect(0, 0, 32, 32).fillStyle(0x1d1b25).fillRect(0, 0, 16, 16).fillRect(16, 16, 16, 16);
    g.generateTexture('floor', 32, 32); g.clear();
    g.fillStyle(0xffffff).fillCircle(14, 14, 14); g.generateTexture('dot', 28, 28); g.destroy();
    this.add.tileSprite(0, 0, W, H, 'floor').setOrigin(0);
    this.physics.world.setBounds(0, 0, W, H); this.cameras.main.setBounds(0, 0, W, H);
    this.add.circle(CAMP.x, CAMP.y, 14, 0xff9a2e);
    this.p = this.physics.add.sprite(CAMP.x + 40, CAMP.y, 'dot').setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.p, true, 0.1, 0.1);
    this.foes = this.physics.add.group();
    this.spawnFoes();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,Z,Q,SPACE,E,U,ONE,TWO,THREE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', () => this.attack());
    this.hud = this.add.text(8, 8, '', { fontSize: '14px', color: '#fff', backgroundColor: '#000a' }).setScrollFactor(0).setDepth(10);
    this.add.text(8, 578, 'ZQSD/WASD bouger · Espace roulade · Clic attaque · 1/2/3 changer de Pokémon (combos de types !)',
      { fontSize: '12px', color: '#aaa' }).setScrollFactor(0).setDepth(10);
    this.p.setTint(POKEMON[this.mon.id].color);
  }

  private spawnFoes() {
    for (let i = 0; i < 7; i++) {
      const f = this.foes.create(Phaser.Math.Between(500, W - 60), Phaser.Math.Between(80, H - 60), 'dot') as unknown as Foe;
      f.hp = 30; f.wind = 0; f.cd = 1; f.setTint(0xc04060).setCollideWorldBounds(true);
    }
  }

  private pop(x: number, y: number, txt: string, color = '#fff') {
    const t = this.add.text(x, y - 20, txt, { fontSize: '16px', color }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private swap(i: number) {
    if (i === this.cur || this.team[i].hp <= 0 || this.swapCd > 0) return;
    const from = POKEMON[this.mon.id].type; this.cur = i; this.swapCd = 1;
    this.p.setTint(POKEMON[this.mon.id].color);
    const c = COMBOS[`${from}>${POKEMON[this.mon.id].type}`];
    if (!c) return;
    this.pop(this.p.x, this.p.y, `COMBO ${c.name} !`, '#ffd34d');
    this.combo = { mult: c.mult, until: this.time.now + 3000 };
    if (c.burst) for (const o of [...this.foes.getChildren()]) {
      const f = o as Foe;
      if (Phaser.Math.Distance.Between(f.x, f.y, this.p.x, this.p.y) < 130) this.hit(f, c.burst, 0);
    }
  }

  private attack() {
    const d = POKEMON[this.mon.id], m = MOVES[d.move];
    if (this.rollT > 0 || this.atkCd > 0 || this.stamina < m.stamina) return;
    this.stamina -= m.stamina; this.atkCd = m.cd; this.stDelay = 0.6;
    const ptr = this.input.activePointer;
    const a = Phaser.Math.Angle.Between(this.p.x, this.p.y, ptr.worldX, ptr.worldY);
    const mult = this.time.now < this.combo.until ? this.combo.mult : 1; if (mult > 1) this.combo.until = 0;
    const dmg = m.power * d.attack / 10 * (1 + 0.15 * (this.mon.lvl - 1)) * mult;
    for (const o of [...this.foes.getChildren()]) {
      const f = o as Foe;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Phaser.Math.Angle.Between(this.p.x, this.p.y, f.x, f.y) - a));
      if (Phaser.Math.Distance.Between(f.x, f.y, this.p.x, this.p.y) <= m.range && diff < m.arc) this.hit(f, dmg, a);
    }
    const fx = this.add.circle(this.p.x + Math.cos(a) * m.range / 2, this.p.y + Math.sin(a) * m.range / 2, m.range / 2, d.color, 0.4);
    this.tweens.add({ targets: fx, alpha: 0, duration: 150, onComplete: () => fx.destroy() });
  }

  private hit(f: Foe, dmg: number, a: number) {
    f.hp -= dmg; f.setVelocity(Math.cos(a) * 220, Math.sin(a) * 220); this.pop(f.x, f.y, String(Math.round(dmg)), '#ff9');
    if (f.hp <= 0) { this.souls += 20; f.destroy(); }
  }

  private hurt(dmg: number) {
    if (this.rollT > 0) return;
    const m = this.mon; m.hp -= dmg * 10 / (10 + POKEMON[m.id].defense);
    this.cameras.main.shake(100, 0.005);
    if (m.hp > 0) return;
    const next = this.team.findIndex(t => t.hp > 0);
    if (next >= 0) { this.cur = next; this.p.setTint(POKEMON[this.mon.id].color); } else this.die();
  }

  private die() {
    this.stain?.spr.destroy();
    this.stain = this.souls > 0
      ? { x: this.p.x, y: this.p.y, amount: this.souls, spr: this.add.circle(this.p.x, this.p.y, 10, 0x66ccff) } : undefined;
    this.souls = 0; this.rest(); this.p.setPosition(CAMP.x + 40, CAMP.y); this.cur = 0;
    this.p.setTint(POKEMON[this.mon.id].color);
    this.pop(this.p.x, this.p.y, 'VOUS AVEZ PÉRI', '#f55');
  }

  private rest() {
    this.team.forEach(t => (t.hp = this.maxHp(t))); this.stamina = 100;
    this.foes.clear(true, true); this.spawnFoes();
  }

  private upgrade() {
    const m = this.mon, cost = m.lvl * 50;
    if (this.souls < cost) return;
    this.souls -= cost; m.lvl++; m.hp = this.maxHp(m);
    const e = POKEMON[m.id].evolutions.find(ev => ev.level <= m.lvl);
    if (e) { m.id = e.to; m.hp = this.maxHp(m); this.pop(this.p.x, this.p.y, `ÉVOLUTION → ${POKEMON[e.to].name} !`, '#7df'); }
    this.p.setTint(POKEMON[m.id].color);
  }

  update(_t: number, dt: number) {
    const s = dt / 1000, k = this.keys, d = POKEMON[this.mon.id];
    this.atkCd -= s; this.rollT -= s; this.swapCd -= s;
    (['ONE', 'TWO', 'THREE'] as const).forEach((n, i) => { if (Phaser.Input.Keyboard.JustDown(k[n])) this.swap(i); });
    if (this.rollT <= 0) {
      const v = new Phaser.Math.Vector2(
        +(k.D.isDown) - +(k.A.isDown || k.Q.isDown), +(k.S.isDown) - +(k.W.isDown || k.Z.isDown));
      if (v.lengthSq() > 0) v.normalize();
      this.p.setVelocity(v.x * d.speed, v.y * d.speed);
      if (Phaser.Input.Keyboard.JustDown(k.SPACE) && this.stamina >= 25 && v.lengthSq() > 0) {
        this.stamina -= 25; this.rollT = 0.3; this.stDelay = 0.8; this.p.setVelocity(v.x * 380, v.y * 380);
      }
    }
    if (this.stDelay > 0) this.stDelay -= s; else this.stamina = Math.min(100, this.stamina + 30 * s);

    const near = Phaser.Math.Distance.Between(this.p.x, this.p.y, CAMP.x, CAMP.y) < 60;
    if (near && Phaser.Input.Keyboard.JustDown(k.E)) this.rest();
    if (near && Phaser.Input.Keyboard.JustDown(k.U)) this.upgrade();
    if (this.stain && Phaser.Math.Distance.Between(this.p.x, this.p.y, this.stain.x, this.stain.y) < 24) {
      this.souls += this.stain.amount; this.stain.spr.destroy(); this.stain = undefined;
    }

    for (const o of [...this.foes.getChildren()]) {
      const f = o as Foe; if (!f.active) continue;
      const dist = Phaser.Math.Distance.Between(f.x, f.y, this.p.x, this.p.y); f.cd -= s;
      if (f.wind > 0) {
        f.wind -= s; f.setVelocity(0, 0);
        if (f.wind <= 0) { f.setTint(0xc04060); f.cd = 1.2; if (dist < 56) this.hurt(14); }
      } else if (dist < 48 && f.cd <= 0) { f.wind = 0.5; f.setTint(0xffffff); }
      else if (dist < 350 && dist >= 40) this.physics.moveToObject(f, this.p, 70);
      else f.setVelocity(0, 0);
    }

    this.hud.setText([
      ...this.team.map((t, i) => `${i === this.cur ? '▶' : '  '}${i + 1} ${POKEMON[t.id].name} Nv${t.lvl}  ${Math.max(0, Math.ceil(t.hp))}/${Math.ceil(this.maxHp(t))}`),
      `Endurance ${Math.floor(this.stamina)}   Âmes ${this.souls}`,
      near ? `[E] Se reposer (relance les ennemis)  [U] Monter de niveau (${this.mon.lvl * 50} âmes)` : '',
    ].join('\n'));
  }
}
