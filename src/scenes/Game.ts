import Phaser from 'phaser';
import { ROSTER, SKILLS, RELICS, COMBOS, BOSSES, WILD, TYPE_FR, ROLE_FR, stats, skillName, Attrs } from '../data';
import { SPRITES } from '../sprites';
import { cave } from '../art';

type Foe = Phaser.Physics.Arcade.Sprite & { dex: number; hp: number; max: number; wind: number; cd: number; kind: 'melee' | 'shoot' | 'boss'; aggro?: boolean; mode?: string; cfg?: (typeof BOSSES)[number] };
type Mon = { dex: number; hp: number; a: Attrs };
type Prop = { o: Phaser.GameObjects.Image; kind: string };
type Shot = { o: Phaser.GameObjects.Arc; vx: number; vy: number; life: number; dmg: number; a: number };
type RoomType = 'rest' | 'combat' | 'treasure' | 'event' | 'boss';
const W = 1280, H = 760, FLOORS = 4, ATTR = { H: 'v', J: 'p', K: 'd', L: 'g' } as const;
const rng = (s: number) => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export class Game extends Phaser.Scene {
  constructor() { super('Game'); }
  private p!: Phaser.Physics.Arcade.Sprite; private foes!: Phaser.Physics.Arcade.Group;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>; private hud!: Phaser.GameObjects.Text;
  private team: Mon[] = []; private cur = 0; private stamina = 100; private souls = 0; private berries = 3;
  private floor = 0; private room = 0; private ck = { f: 0, r: 0 }; private seed = 0;
  private cleared = new Set<string>(); private used = new Set<string>(); private relics = new Set<string>();
  private cds = [0, 0, 0]; private rollT = 0; private swapCd = 0; private stDelay = 0;
  private combo = { m: 1, until: 0 }; private buff = { rage: 0, aura: 0, shield: 0 };
  private evo?: number[]; private won = false; private door?: Phaser.GameObjects.Image; private bg!: Phaser.GameObjects.Image;
  private decor: Phaser.GameObjects.Image[] = []; private drops: { o: Phaser.GameObjects.Image; kind: string; n: number }[] = [];
  private props: Prop[] = []; private shots: Shot[] = []; private ps: Shot[] = [];
  private stain?: { f: number; r: number; x: number; y: number; n: number; spr?: Phaser.GameObjects.Arc };

  private get mon() { return this.team[this.cur]; }
  private has(r: string) { return this.relics.has(r); }
  private lvl(m: Mon) { return 1 + m.a.v + m.a.p + m.a.d + m.a.g; }
  private maxHp(m: Mon) { return Math.round(stats(m.dex, m.a).hp * (this.has('ceinture') ? 1.2 : 1)); }
  private type(): RoomType { return this.layout(this.floor)[this.room]; }
  private layout(f: number): RoomType[] {
    const r = rng(this.seed + f * 97), pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
    return ['combat', 'rest', pick<RoomType>(['combat', 'treasure', 'event']), pick<RoomType>(['combat', 'event', 'treasure']), 'combat', 'rest', 'boss'];
  }

  init(d: { team: number[] }) {
    this.relics.clear(); this.cleared.clear(); this.used.clear();
    this.team = d.team.map(dex => ({ dex, hp: 0, a: { v: 0, p: 0, d: 0, g: 0 } })); this.team.forEach(t => (t.hp = this.maxHp(t)));
    this.cur = 0; this.stamina = 100; this.souls = 0; this.berries = 3; this.floor = 0; this.room = 0; this.ck = { f: 0, r: 0 };
    this.seed = Math.floor(Math.random() * 1e6); this.cds = [0, 0, 0]; this.rollT = 0; this.swapCd = 0; this.stDelay = 0;
    this.combo = { m: 1, until: 0 }; this.buff = { rage: 0, aura: 0, shield: 0 };
    this.evo = undefined; this.won = false; this.props = []; this.shots = []; this.ps = []; this.stain = undefined; this.door = undefined; this.decor = []; this.drops = [];
  }

  create() {
    cave(this, 0); this.bg = this.add.image(0, 0, 'cave0').setOrigin(0).setDepth(-1);
    this.physics.world.setBounds(30, 70, W - 60, H - 130); this.cameras.main.setBounds(0, 0, W, H);
    this.p = this.physics.add.sprite(110, H / 2, `pk${this.mon.dex}`).setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.p, true, 0.1, 0.1);
    this.foes = this.physics.add.group();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,Z,Q,SPACE,E,B,F,R,H,J,K,L,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', () => this.skill(0));
    this.hud = this.add.text(8, 8, '', { fontSize: '13px', color: '#fff', backgroundColor: '#000a' }).setScrollFactor(0).setDepth(1e5);
    this.add.text(8, 582, 'ZQSD/WASD bouger · Espace roulade · Clic/F/R compétences · 1-2-3 changer · B baie · E interagir · Sprites : PMD SpriteCollab CC BY-NC',
      { fontSize: '11px', color: '#aaa' }).setScrollFactor(0).setDepth(1e5);
    this.look(); this.loadRoom(0, 0, 'left');
  }

  // ---------- salles ----------
  private clearField() {
    this.foes.clear(true, true); this.door?.destroy(); this.props.forEach(q => q.o.destroy()); this.props = [];
    this.decor.forEach(d => d.destroy()); this.decor = []; this.drops.forEach(d => d.o.destroy()); this.drops = [];
    [...this.shots, ...this.ps].forEach(s => s.o.destroy()); this.shots = []; this.ps = [];
    this.stain?.spr?.destroy(); if (this.stain) this.stain.spr = undefined;
  }

  private loadRoom(f: number, r: number, at: 'left' | 'camp') {
    this.floor = f; this.room = r; this.clearField();
    const T = this.type(), id = `${f}:${r}`;
    this.p.setPosition(at === 'left' ? 110 : W / 2 + 70, H / 2).setVelocity(0, 0);
    cave(this, f); this.bg.setTexture(`cave${f}`);
    const dr = rng(this.seed + f * 131 + r * 7);
    for (let i = 0; i < 12; i++) {
      const x = 190 + dr() * (W - 420), y = 120 + dr() * (H - 230);
      if (Math.abs(x - W / 2) < 130 && Math.abs(y - H / 2) < 110) continue;
      this.decor.push(this.add.image(x, y, `st${Math.floor(dr() * 3)}`).setScale(0.8 + dr() * 0.9).setDepth(y + 30).setTint([0xffffff, 0xb8c4ff, 0xffc4b0, 0xe0b8ff][f]));
    }
    this.door = this.add.image(W - 62, H / 2, 'stairs').setDepth(1);
    const prop = (kind: string, tex: string) => {
      const o = this.add.image(W / 2, H / 2, tex).setDepth(H / 2);
      if (kind === 'camp') this.tweens.add({ targets: o, scale: 1.08, duration: 400, yoyo: true, repeat: -1 });
      this.props.push({ kind, o });
    };
    if (T === 'rest') prop('camp', 'camp');
    else if (T === 'combat' && !this.cleared.has(id)) this.spawn(3 + f + (r > 3 ? 1 : 0));
    else if (T === 'boss' && !this.used.has(id)) this.spawnBoss();
    else if (T === 'treasure' && !this.used.has(id)) prop('chest', 'chest');
    else if (T === 'event' && !this.used.has(id)) { const ek = ['fountain', 'altar', 'ambush'][Math.floor(rng(this.seed + f * 31 + r)() * 3)]; prop(ek, ek === 'ambush' ? 'orb' : ek); }
    if (this.stain && this.stain.f === f && this.stain.r === r) this.stain.spr = this.add.circle(this.stain.x, this.stain.y, 10, 0x66ccff).setDepth(4e4);
  }

  private advance() {
    this.collect(true);
    if (this.room < 6) this.loadRoom(this.floor, this.room + 1, 'left');
    else if (this.floor < FLOORS - 1) { this.ck = { f: this.floor + 1, r: 0 }; this.loadRoom(this.floor + 1, 0, 'left'); this.pop(this.p.x, this.p.y - 30, `ÉTAGE ${this.floor + 1}`, '#7df'); }
    else {
      this.won = true; this.physics.pause();
      this.add.text(480, 300, 'VICTOIRE !\nMewtwo est vaincu.\n[R] Nouvelle partie', { fontSize: '30px', color: '#ffd34d', align: 'center', backgroundColor: '#000c' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    }
  }

  private spawn(n: number) {
    for (let i = 0; i < n; i++) {
      const dex = Phaser.Utils.Array.GetRandom(WILD[this.floor]);
      const f = this.foes.create(Phaser.Math.Between(420, W - 120), Phaser.Math.Between(80, H - 80), `pk${dex}`) as unknown as Foe;
      f.dex = dex; f.hp = f.max = 22 + this.floor * 14 + this.room * 2; f.wind = 0; f.cd = 1; f.kind = Math.random() < 0.3 ? 'shoot' : 'melee';
      f.setCollideWorldBounds(true); this.fit(f, dex, 2);
    }
  }

  private spawnBoss() {
    const c = BOSSES[this.floor], f = this.foes.create(W - 300, H / 2, `pk${c.dex}`) as unknown as Foe;
    f.dex = c.dex; f.hp = f.max = 180 + this.floor * 90; f.wind = 0; f.cd = 1.5; f.kind = 'boss'; f.cfg = c;
    f.setCollideWorldBounds(true); this.fit(f, c.dex, 3); this.pop(W / 2, 100, `BOSS : ${c.name}`, '#f77');
  }

  // ---------- interactions, reliques, progression ----------
  private interact(q: Prop) {
    const id = `${this.floor}:${this.room}`, m = this.mon, X = q.o.x, Y = q.o.y;
    if (q.kind === 'camp') { this.refill(); this.ck = { f: this.floor, r: this.room }; this.pop(X, Y, 'Feu de camp : PV et baies restaurés', '#ffb347'); return; }
    this.used.add(id); q.o.destroy(); this.props = this.props.filter(x => x !== q);
    if (q.kind === 'chest') { this.souls += 40 * (this.floor + 1); if (Math.random() < 0.7) this.relic(X, Y); else this.point(m, Phaser.Utils.Array.GetRandom(['v', 'p', 'd', 'g'] as const), 'Bonbon Rare !'); }
    else if (q.kind === 'fountain') { this.team.forEach(t => { if (t.hp > 0) t.hp = Math.min(this.maxHp(t), t.hp + this.maxHp(t) * 0.4); }); this.pop(X, Y, 'Fontaine : +40 % PV', '#7f7'); }
    else if (q.kind === 'altar') { m.hp = Math.max(1, m.hp - this.maxHp(m) * 0.3); this.relic(X, Y); }
    else { this.pop(X, Y, 'Embuscade !', '#f77'); this.spawn(4 + this.floor); }
  }

  private relic(x: number, y: number) {
    const left = Object.keys(RELICS).filter(k => !this.has(k));
    if (!left.length) { this.souls += 100; return; }
    const k = Phaser.Utils.Array.GetRandom(left); this.relics.add(k); this.pop(x, y, `${RELICS[k].n} : ${RELICS[k].d}`, '#ffd34d');
  }

  private refill() { this.team.forEach(t => { t.hp = this.maxHp(t); }); this.stamina = 100; this.berries = 3 + (this.has('baie_or') ? 1 : 0); }

  private point(m: Mon, k: keyof Attrs, msg?: string) {
    m.a[k]++; m.hp = this.maxHp(m); if (msg) this.pop(this.p.x, this.p.y, msg, '#ffd34d');
    const ok = ROSTER[m.dex].e.filter(([, l]) => l <= this.lvl(m));
    if (ok.length === 1) this.evolve(m, ok[0][0]); else if (ok.length > 1) this.evo = ok.map(x => x[0]);
  }

  private evolve(m: Mon, to: number) {
    m.dex = to; m.hp = this.maxHp(m); this.evo = undefined; this.look(); this.cameras.main.flash(300);
    this.pop(this.p.x, this.p.y, `ÉVOLUTION → ${ROSTER[to].n} !`, '#7df');
  }

  // ---------- combat ----------
  private dmg(p: number) {
    let x = p * stats(this.mon.dex, this.mon.a).at / 10 * (this.buff.rage > 0 ? 1.5 : 1) * (this.buff.aura > 0 ? 1.25 : 1) * (this.has('bandeau') ? 1.3 : 1);
    if (this.time.now < this.combo.until) { x *= this.combo.m; this.combo.until = 0; }
    return x;
  }

  private skill(i: number) {
    const m = this.mon, k = SKILLS[ROSTER[m.dex].r][i], lv = this.lvl(m), cost = k.st * (this.has('bandeau') ? 1.25 : 1);
    if (this.won || this.evo || this.rollT > 0 || this.cds[i] > 0 || this.stamina < cost) return;
    this.stamina -= cost; this.cds[i] = k.cd; this.stDelay = 0.6;
    const ptr = this.input.activePointer, P = this.p, a = Phaser.Math.Angle.Between(P.x, P.y, ptr.worldX, ptr.worldY), dm = k.p ? this.dmg(k.p) : 0;
    const area = (x: number, y: number, r: number, arc: number, ang: number, d: number) => {
      for (const o of [...this.foes.getChildren()]) {
        const f = o as Foe; if (!f.active) continue;
        const diff = Math.abs(Phaser.Math.Angle.Wrap(Phaser.Math.Angle.Between(x, y, f.x, f.y) - ang));
        if (Phaser.Math.Distance.Between(x, y, f.x, f.y) <= r + f.displayWidth / 3 && diff < arc) this.hit(f, d, ang);
      }
    };
    const shot = (ang: number) => this.ps.push({ o: this.add.circle(P.x, P.y, 6, 0xfff2a0).setDepth(4e4), vx: Math.cos(ang) * 440, vy: Math.sin(ang) * 440, life: 0.9, dmg: dm, a: ang });
    switch (k.k) {
      case 'cone': area(P.x, P.y, k.r, k.a, a, dm); this.fx(P.x + Math.cos(a) * k.r / 2, P.y + Math.sin(a) * k.r / 2, k.r / 2); break;
      case 'dash': this.rollT = 0.25; P.setVelocity(Math.cos(a) * 520, Math.sin(a) * 520); this.time.delayedCall(120, () => area(P.x, P.y, k.r, Math.PI, a, dm)); break;
      case 'aoe': area(P.x, P.y, k.r, Math.PI, 0, dm); this.fx(P.x, P.y, k.r); break;
      case 'shot': shot(a); break;
      case 'spread': [-0.25, 0, 0.25].forEach(o => shot(a + o)); break;
      case 'blast': area(ptr.worldX, ptr.worldY, k.r, Math.PI, 0, dm); this.fx(ptr.worldX, ptr.worldY, k.r); break;
      case 'rage': this.buff.rage = 6; this.pop(P.x, P.y, 'RAGE', '#f84'); break;
      case 'shield': this.buff.shield = 5; this.pop(P.x, P.y, 'CARAPACE', '#8cf'); break;
      case 'aura': this.buff.aura = 8; this.pop(P.x, P.y, 'AURA +25 % dégâts', '#fd7'); break;
      case 'heal': this.team.forEach((t, j) => { if (t.hp > 0) t.hp = Math.min(this.maxHp(t), t.hp + this.maxHp(t) * (j === this.cur ? 0.3 : 0.15)); }); this.pop(P.x, P.y, 'SOIN', '#7f7'); break;
    }
  }

  private hit(f: Foe, dmg: number, a: number) {
    f.hp -= dmg; this.alert(f); if (f.kind !== 'boss') f.setVelocity(Math.cos(a) * 220, Math.sin(a) * 220);
    this.pop(f.x, f.y, String(Math.round(dmg)), '#ff9');
    if (f.hp > 0) return;
    this.drop(f.x, f.y, 'souls', Math.round((f.kind === 'boss' ? 100 * (this.floor + 1) : 15 + 5 * this.floor) * (this.has('amulette') ? 1.5 : 1)));
    if (f.kind !== 'boss' && Math.random() < 0.12) this.drop(f.x + 22, f.y, 'berry', 1);
    if (this.has('orbe')) this.team.forEach(t => { if (t.hp > 0) t.hp = Math.min(this.maxHp(t), t.hp + this.maxHp(t) * 0.06); });
    if (f.kind === 'boss') { this.used.add(`${this.floor}:${this.room}`); this.drop(f.x + 30, f.y, 'relic', 0); this.pop(f.x, f.y - 40, 'BOSS VAINCU', '#ffd34d'); }
    f.destroy();
  }

  private hurt(dmg: number) {
    if (this.rollT > 0) return;
    const m = this.mon; m.hp -= dmg * 10 / (10 + stats(m.dex, m.a).df) * (this.buff.shield > 0 ? 0.4 : 1);
    this.cameras.main.shake(100, 0.005);
    if (m.hp > 0) return;
    const next = this.team.findIndex(t => t.hp > 0);
    if (next >= 0) { this.cur = next; this.look(); } else this.die();
  }

  private die() {
    this.stain?.spr?.destroy();
    this.stain = this.souls > 0 ? { f: this.floor, r: this.room, x: this.p.x, y: this.p.y, n: this.souls } : undefined;
    this.souls = 0; this.cur = 0;
    [...this.cleared].forEach(k => { const [f, r] = k.split(':').map(Number); if (f === this.ck.f && r > this.ck.r) this.cleared.delete(k); });
    this.refill(); this.look(); this.loadRoom(this.ck.f, this.ck.r, 'camp'); this.pop(this.p.x, this.p.y - 30, 'VOUS AVEZ PÉRI', '#f55');
  }

  private swap(i: number) {
    if (i === this.cur || i >= this.team.length || this.team[i].hp <= 0 || this.swapCd > 0) return;
    const from = ROSTER[this.mon.dex]; this.cur = i; this.swapCd = 1; this.look();
    const to = ROSTER[this.mon.dex], c = COMBOS[`${from.t}>${to.t}`] ?? COMBOS[`${from.r}>${to.r}`] ?? (from.r === 'support' ? COMBOS['support>*'] : undefined);
    if (!c) return;
    this.pop(this.p.x, this.p.y, `COMBO ${c.n} !`, '#ffd34d');
    if (c.m) this.combo = { m: c.m, until: this.time.now + 3000 };
    if (c.h) this.team.forEach(t => { if (t.hp > 0) t.hp = Math.min(this.maxHp(t), t.hp + this.maxHp(t) * c.h!); });
    if (c.b) for (const o of [...this.foes.getChildren()]) {
      const f = o as Foe; if (f.active && Phaser.Math.Distance.Between(f.x, f.y, this.p.x, this.p.y) < 140) this.hit(f, c.b * (1 + this.floor * 0.4), 0);
    }
  }

  private drop(x: number, y: number, kind: string, n: number) {
    const o = this.add.image(x, y, kind === 'souls' ? 'ball0' : kind === 'berry' ? 'ball1' : 'ball2').setScale(1.2).setDepth(y);
    this.tweens.add({ targets: o, y: y - 14, duration: 180, yoyo: true }); this.drops.push({ o, kind, n });
  }
  private collect(all: boolean) {
    this.drops = this.drops.filter(d => {
      const dist = Phaser.Math.Distance.Between(d.o.x, d.o.y, this.p.x, this.p.y);
      if (!all && dist > 36) { if (dist < 110) { d.o.x += (this.p.x - d.o.x) * 0.08; d.o.y += (this.p.y - d.o.y) * 0.08; } return true; }
      if (d.kind === 'souls') { this.souls += d.n; this.pop(this.p.x, this.p.y, `+${d.n} âmes`, '#8df'); }
      else if (d.kind === 'berry') { this.berries = Math.min(3 + (this.has('baie_or') ? 1 : 0), this.berries + 1); this.pop(this.p.x, this.p.y, '+1 baie', '#f9c'); }
      else this.relic(this.p.x, this.p.y);
      d.o.destroy(); return false;
    });
  }
  private alert(f: Foe) {
    f.aggro = true;
    for (const o of this.foes.getChildren()) { const g = o as Foe; if (g.active && Phaser.Math.Distance.Between(g.x, g.y, f.x, f.y) < 350) g.aggro = true; }
  }

  // ---------- rendu ----------
  private fx(x: number, y: number, r: number) {
    const c = this.add.circle(x, y, r, 0xffffff, 0.35).setDepth(4e4); this.tweens.add({ targets: c, alpha: 0, duration: 160, onComplete: () => c.destroy() });
  }
  private pop(x: number, y: number, txt: string, color = '#fff') {
    const t = this.add.text(x, y - 20, txt, { fontSize: '15px', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(5e4);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }
  private fit(spr: Phaser.Physics.Arcade.Sprite, dex: number, scale: number) {
    const i = SPRITES[dex]; spr.setScale(scale);
    (spr.body as Phaser.Physics.Arcade.Body).setSize(i.w * 0.5, i.w * 0.5).setOffset(i.w * 0.25, i.h - i.w * 0.6);
  }
  private look() { const dex = this.mon.dex; this.p.setTexture(`pk${dex}`); this.fit(this.p, dex, 2); }
  private face(spr: Phaser.Physics.Arcade.Sprite, dex: number) {
    if (!spr.body) return;
    const v = (spr.body as Phaser.Physics.Arcade.Body).velocity, moving = Math.abs(v.x) + Math.abs(v.y) > 5;
    if (moving) spr.setData('row', (Math.round((Math.PI / 2 - Math.atan2(v.y, v.x)) / (Math.PI / 4)) % 8 + 8) % 8);
    const r = (spr.getData('row') as number | undefined) ?? 0;
    if (moving) spr.anims.play(`pk${dex}-${r}`, true); else { spr.anims.stop(); spr.setFrame(r * SPRITES[dex].cols); }
  }
  private fire(x: number, y: number, a: number, sp = 170) {
    this.shots.push({ o: this.add.circle(x, y, 7, 0xb98cff).setDepth(4e4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 4, dmg: 0, a });
  }

  private bossAI(f: Foe, s: number, dist: number) {
    const c = f.cfg!, rage = f.hp < f.max / 2, X = this.p.x, Y = this.p.y;
    if (f.wind > 0) {
      f.wind -= s; f.setVelocity(0, 0);
      if (f.wind > 0) return;
      if (rage) f.setTint(0xff8080); else f.clearTint();
      f.cd = rage ? c.cd * 0.6 : c.cd;
      if (f.mode === 'slam') { if (Phaser.Math.Distance.Between(f.x, f.y, X, Y) < 140) this.hurt(28 + this.floor * 6); }
      else {
        const n = rage ? c.n + 6 : c.n; for (let i = 0; i < n; i++) this.fire(f.x, f.y, (i / n) * Math.PI * 2 + (rage ? 0.2 : 0));
        if (c.aim) for (const o of [-0.2, 0, 0.2]) this.fire(f.x, f.y, Phaser.Math.Angle.Between(f.x, f.y, X, Y) + o, 260);
      }
    } else if (f.cd <= 0) {
      f.mode = dist < 190 ? 'slam' : 'ring'; f.wind = f.mode === 'slam' ? 0.9 : 0.6; f.setTintFill(0xffffff);
      if (f.mode === 'slam') { const t = this.add.circle(f.x, f.y, 140, 0xff3030, 0.3).setDepth(5); this.time.delayedCall(900, () => t.destroy()); }
    } else this.physics.moveToObject(f, this.p, rage ? c.sp * 1.4 : c.sp);
  }

  update(_t: number, dt: number) {
    if (this.won) { if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.start('Pick'); return; }
    const s = dt / 1000, k = this.keys, m = this.mon, st = stats(m.dex, m.a), JD = Phaser.Input.Keyboard.JustDown;
    this.rollT -= s; this.swapCd -= s; this.cds = this.cds.map(c => c - s); (['rage', 'aura', 'shield'] as const).forEach(b => (this.buff[b] -= s));
    const digits = [k.ONE, k.TWO, k.THREE, k.FOUR, k.FIVE, k.SIX, k.SEVEN, k.EIGHT];
    digits.forEach((d, i) => {
      if (!JD(d)) return;
      if (this.evo) { if (i < this.evo.length) this.evolve(m, this.evo[i]); } else if (i < 3) this.swap(i);
    });
    if (JD(k.F)) this.skill(1);
    if (JD(k.R)) this.skill(2);
    if (JD(k.B) && this.berries > 0 && m.hp < this.maxHp(m)) { this.berries--; m.hp = Math.min(this.maxHp(m), m.hp + this.maxHp(m) * (this.has('baie_or') ? 0.6 : 0.4)); this.pop(this.p.x, this.p.y, 'Baie !', '#f9c'); }
    if (this.has('restes')) m.hp = Math.min(this.maxHp(m), m.hp + 1.5 * s);
    if (this.rollT <= 0) {
      const v = new Phaser.Math.Vector2(+k.D.isDown - +(k.A.isDown || k.Q.isDown), +k.S.isDown - +(k.W.isDown || k.Z.isDown));
      if (v.lengthSq() > 0) v.normalize();
      this.p.setVelocity(v.x * st.sp, v.y * st.sp);
      const rc = this.has('plume') ? 15 : 25;
      if (JD(k.SPACE) && this.stamina >= rc && v.lengthSq() > 0) { this.stamina -= rc; this.rollT = this.has('plume') ? 0.4 : 0.3; this.stDelay = 0.8; this.p.setVelocity(v.x * 380, v.y * 380); }
    }
    if (this.stDelay > 0) this.stDelay -= s; else this.stamina = Math.min(100, this.stamina + (30 + 2 * m.a.g) * s);
    this.face(this.p, m.dex); this.p.setDepth(this.p.y);

    // projectiles du joueur
    this.ps = this.ps.filter(q => {
      if (!q.o.active) return false;
      q.o.x += q.vx * s; q.o.y += q.vy * s; q.life -= s;
      for (const o of this.foes.getChildren()) {
        const f = o as Foe; if (f.active && Phaser.Math.Distance.Between(f.x, f.y, q.o.x, q.o.y) < 22 + f.displayWidth / 4) { this.hit(f, q.dmg, q.a); q.life = 0; break; }
      }
      if (q.life <= 0) { q.o.destroy(); return false; } return true;
    });

    // ennemis
    for (const o of [...this.foes.getChildren()]) {
      const f = o as Foe; if (!f.active) continue;
      const dist = Phaser.Math.Distance.Between(f.x, f.y, this.p.x, this.p.y); f.cd -= s;
      if (f.kind === 'boss') this.bossAI(f, s, dist);
      else if (f.wind > 0) {
        f.wind -= s; f.setVelocity(0, 0);
        if (f.wind <= 0) {
          f.clearTint(); f.cd = f.kind === 'shoot' ? 1.6 : 1.2;
          if (f.kind === 'shoot') this.fire(f.x, f.y, Phaser.Math.Angle.Between(f.x, f.y, this.p.x, this.p.y), 230);
          else if (dist < 56) this.hurt(14 + this.floor * 4);
        }
      } else if (f.cd <= 0 && (f.kind === 'shoot' ? f.aggro || dist < 320 : dist < 48)) { f.wind = 0.5; f.setTintFill(0xffffff); }
      else if (f.kind === 'shoot' && dist < 200) this.physics.moveToObject(f, this.p, -60);
      else if ((f.aggro || dist < 250) && dist > (f.kind === 'shoot' ? 260 : 40)) this.physics.moveToObject(f, this.p, 70 + this.floor * 8);
      else f.setVelocity(0, 0);
      if (f.active) { this.face(f, f.dex); f.setDepth(f.y); }
    }

    // projectiles ennemis
    this.shots = this.shots.filter(sh => {
      if (!sh.o.active) return false;
      sh.o.x += sh.vx * s; sh.o.y += sh.vy * s; sh.life -= s;
      const touch = Phaser.Math.Distance.Between(sh.o.x, sh.o.y, this.p.x, this.p.y) < 18;
      if (touch) this.hurt(10 + this.floor * 4);
      if (touch || sh.life <= 0) { sh.o.destroy(); return false; } return true;
    });

    this.collect(false);
    // escaliers, feu de camp, âme perdue
    const open = this.foes.countActive() === 0, id = `${this.floor}:${this.room}`;
    if (open && this.type() === 'combat') this.cleared.add(id);
    if (open) this.door?.clearTint(); else this.door?.setTint(0x553333);
    if (open && this.p.x > W - 70) { this.advance(); return; }
    const near = this.props.find(q => Phaser.Math.Distance.Between(q.o.x, q.o.y, this.p.x, this.p.y) < 70);
    if (near && JD(k.E)) this.interact(near);
    if (near?.kind === 'camp') (Object.keys(ATTR) as (keyof typeof ATTR)[]).forEach(key => {
      const cost = 40 + 25 * (this.lvl(m) - 1);
      if (JD(k[key]) && this.souls >= cost && !this.evo) { this.souls -= cost; this.point(m, ATTR[key]); }
    });
    if (this.stain && this.stain.f === this.floor && this.stain.r === this.room && Phaser.Math.Distance.Between(this.p.x, this.p.y, this.stain.x, this.stain.y) < 26) {
      this.souls += this.stain.n; this.pop(this.p.x, this.p.y, `+${this.stain.n} âmes récupérées`, '#8df'); this.stain.spr?.destroy(); this.stain = undefined;
    }

    // HUD
    const b = this.foes.getChildren().find(x => (x as Foe).kind === 'boss') as Foe | undefined, cost = 40 + 25 * (this.lvl(m) - 1);
    const prompt = !near ? '' : near.kind === 'camp' ? `[E] Se reposer · [H] Vigueur [J] Puissance [K] Défense [L] Agilité (${cost} âmes)`
      : near.kind === 'chest' ? '[E] Ouvrir le coffre' : near.kind === 'fountain' ? '[E] Boire à la fontaine' : near.kind === 'altar' ? '[E] Offrir 30 % des PV de ton Pokémon : relique' : '[E] Toucher l\'orbe mystérieux (embuscade)';
    const sk = [0, 1, 2].map(i => (this.cds[i] > 0 ? `${this.cds[i].toFixed(1)}s` : 'prêt'));
    this.hud.setText([
      ...this.team.map((t, i) => `${i === this.cur ? '▶' : ' '}${i + 1} ${ROSTER[t.dex].n} Nv${this.lvl(t)} ${TYPE_FR[ROSTER[t.dex].t]}/${ROLE_FR[ROSTER[t.dex].r]}  ${Math.max(0, Math.ceil(t.hp))}/${this.maxHp(t)}`),
      `Étage ${this.floor + 1}/${FLOORS} · Salle ${this.room + 1}/7 (${this.type()})  Endurance ${Math.floor(this.stamina)}  Âmes ${this.souls}  Baies ${this.berries}`,
      `Clic ${skillName(m.dex, 0)}: ${sk[0]} · F ${skillName(m.dex, 1)}: ${sk[1]} · R ${skillName(m.dex, 2)}: ${sk[2]}`,
      this.relics.size ? `Reliques : ${[...this.relics].map(r => RELICS[r].n).join(', ')}` : '',
      this.evo ? `ÉVOLUTION ! Choisis : ${this.evo.map((d, i) => `${i + 1}) ${ROSTER[d].n}`).join('  ')}` : '',
      open && this.type() !== 'rest' ? '>>> Escaliers ouverts : va tout à droite <<<' : open ? 'Escaliers ouverts : tout à droite' : '',
      b ? 'BOSS ' + '█'.repeat(Math.max(0, Math.ceil(b.hp / b.max * 20))) : '', prompt,
    ].filter(Boolean).join('\n'));
  }
}
