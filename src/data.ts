import { ROSTER, Role } from './roster';
export { ROSTER };
export type { Role };
export interface Skill { n: string; k: string; p: number; cd: number; st: number; r: number; a: number }
export interface Attrs { v: number; p: number; d: number; g: number }
export const ROLE_FR: Record<string, string> = { assault: 'Assaut', bulwark: 'Rempart', ranged: 'Distance', support: 'Soutien' };
export const TYPE_FR: Record<string, string> = { fire: 'Feu', water: 'Eau', grass: 'Plante', electric: 'Électrik', psychic: 'Psy', ghost: 'Spectre',
  dark: 'Ténèbres', steel: 'Acier', fighting: 'Combat', dragon: 'Dragon', ground: 'Sol', flying: 'Vol', bug: 'Insecte', rock: 'Roche', normal: 'Normal', ice: 'Glace', fairy: 'Fée' };
const BASE = { assault: { hp: 70, sp: 170, at: 12, df: 6 }, bulwark: { hp: 100, sp: 140, at: 9, df: 12 },
  ranged: { hp: 65, sp: 155, at: 12, df: 5 }, support: { hp: 85, sp: 150, at: 8, df: 8 } };
// Stats = rôle x palier d'évolution x points d'attributs (Vigueur, Puissance, Défense, Agilité)
export const stats = (dex: number, a: Attrs) => {
  const m = ROSTER[dex], b = BASE[m.r], T = [1, 1.5, 2.1][m.k], U = [1, 1.45, 2][m.k];
  return { hp: Math.round(b.hp * T * (1 + 0.12 * a.v)), at: b.at * U * (1 + 0.1 * a.p), df: b.df * U * (1 + 0.1 * a.d), sp: b.sp + [0, 8, 15][m.k] + 4 * a.g };
};
// Trois compétences par rôle : clic = 1, F = 2 (Nv2), R = 3 (Nv4). "*" = nom complété par le type du Pokémon
export const SKILLS: Record<Role, Skill[]> = {
  assault: [{ n: 'Frappe*', k: 'cone', p: 14, cd: 0.45, st: 15, r: 75, a: 1 }, { n: 'Ruée*', k: 'dash', p: 22, cd: 3, st: 25, r: 80, a: 3.2 }, { n: 'Rage', k: 'rage', p: 0, cd: 12, st: 30, r: 0, a: 0 }],
  bulwark: [{ n: 'Choc*', k: 'cone', p: 12, cd: 0.6, st: 18, r: 70, a: 1.3 }, { n: 'Séisme*', k: 'aoe', p: 18, cd: 5, st: 30, r: 120, a: 0 }, { n: 'Carapace', k: 'shield', p: 0, cd: 12, st: 25, r: 0, a: 0 }],
  ranged: [{ n: 'Tir*', k: 'shot', p: 10, cd: 0.5, st: 12, r: 0, a: 0 }, { n: 'Rafale*', k: 'spread', p: 8, cd: 3, st: 25, r: 0, a: 0 }, { n: 'Explosion*', k: 'blast', p: 35, cd: 8, st: 35, r: 110, a: 0 }],
  support: [{ n: 'Éclat*', k: 'shot', p: 8, cd: 0.6, st: 12, r: 0, a: 0 }, { n: 'Soin', k: 'heal', p: 0, cd: 10, st: 30, r: 0, a: 0 }, { n: 'Aura', k: 'aura', p: 0, cd: 14, st: 25, r: 0, a: 0 }],
};
export const skillName = (dex: number, i: number) => {
  const m = ROSTER[dex], n = SKILLS[m.r][i].n; return n.endsWith('*') ? `${n.slice(0, -1)} ${TYPE_FR[m.t]}` : n;
};
// Combos au changement de Pokémon : type précédent>type entrant, sinon rôle>rôle. m=bonus dégâts (3 s), b=explosion, h=soin d'équipe
export const COMBOS: Record<string, { n: string; m?: number; b?: number; h?: number }> = {
  'grass>fire': { n: 'Brasier', m: 1.8 }, 'fire>water': { n: 'Vapeur', b: 25 }, 'water>electric': { n: 'Foudroiement', m: 1.7 },
  'water>grass': { n: 'Photosynthèse', h: 0.15 }, 'fire>steel': { n: 'Forge', m: 1.6 }, 'psychic>ghost': { n: 'Hantise', b: 25 },
  'ghost>dark': { n: 'Cauchemar', m: 1.7 }, 'ground>water': { n: 'Bourbier', b: 22 }, 'electric>flying': { n: 'Orage', m: 1.6 },
  'assault>ranged': { n: 'Tir furtif', m: 1.5 }, 'ranged>assault': { n: 'Cavalcade', m: 1.5 }, 'bulwark>assault': { n: 'Riposte', m: 1.6 },
  'assault>bulwark': { n: 'Garde brisée', b: 20 }, 'support>*': { n: 'Bénédiction', h: 0.12 },
};
export const RELICS: Record<string, { n: string; d: string }> = {
  bandeau: { n: 'Bandeau Choix', d: '+30 % dégâts, endurance +25 % plus chère' }, restes: { n: 'Restes', d: 'Régénération passive des PV' },
  baie_or: { n: 'Baie Or', d: '+1 baie, baies +50 % plus efficaces' }, amulette: { n: 'Amulette Pièce', d: 'Âmes x1,5' },
  ceinture: { n: 'Ceinture Force', d: 'PV max +20 %' }, orbe: { n: 'Orbe Vie', d: 'Soin de 6 % à chaque victoire' },
  plume: { n: 'Plume Vitesse', d: 'Roulade moins chère et plus longue' },
};
export const BOSSES = [
  { dex: 144, name: 'Artikodin', sp: 65, cd: 1.8, n: 8, aim: false }, { dex: 145, name: 'Électhor', sp: 85, cd: 1.4, n: 10, aim: false },
  { dex: 146, name: 'Sulfura', sp: 75, cd: 1.5, n: 12, aim: true }, { dex: 150, name: 'Mewtwo', sp: 90, cd: 1.2, n: 14, aim: true },
];
export const WILD = [[19, 41, 74], [100, 179, 309], [37, 218, 322], [200, 355, 302]];
