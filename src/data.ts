export type Role = 'assault' | 'bulwark' | 'ranged' | 'support';
export type PType = 'fire' | 'water' | 'grass';
export interface Move { id: string; name: string; power: number; cd: number; stamina: number; range: number; arc: number }
export interface PokemonData { id: string; name: string; role: Role; type: PType; color: number; hp: number; speed: number;
  attack: number; defense: number; move: string; evolutions: { to: string; level: number }[] }
export interface Combo { name: string; mult: number; burst?: number }

export const MOVES: Record<string, Move> = {
  scratch: { id: 'scratch', name: 'Griffe', power: 14, cd: 0.45, stamina: 15, range: 70, arc: 1.0 },
  tackle: { id: 'tackle', name: 'Charge', power: 12, cd: 0.6, stamina: 18, range: 60, arc: 1.2 },
  vine: { id: 'vine', name: 'Fouet Lianes', power: 10, cd: 0.7, stamina: 14, range: 150, arc: 0.3 },
};
// Combos de swap, comme sur pokesouls.fun : type précédent > type entrant
export const COMBOS: Record<string, Combo> = {
  'grass>fire': { name: 'Brasier', mult: 1.8 },
  'fire>water': { name: 'Vapeur', mult: 1.2, burst: 25 },
};

const mk = (id: string, name: string, role: Role, type: PType, color: number, hp: number, speed: number,
  attack: number, defense: number, move: string, evo?: [string, number]): PokemonData =>
  ({ id, name, role, type, color, hp, speed, attack, defense, move, evolutions: evo ? [{ to: evo[0], level: evo[1] }] : [] });

export const POKEMON: Record<string, PokemonData> = Object.fromEntries([
  mk('poussifeu', 'Poussifeu', 'assault', 'fire', 0xff8a3d, 70, 170, 10, 6, 'scratch', ['galifeu', 3]),
  mk('galifeu', 'Galifeu', 'assault', 'fire', 0xff6a2d, 100, 175, 14, 9, 'scratch', ['brasegali', 6]),
  mk('brasegali', 'Braségali', 'assault', 'fire', 0xe0451d, 140, 180, 20, 12, 'scratch'),
  mk('carapuce', 'Carapuce', 'bulwark', 'water', 0x5ab4ff, 100, 140, 8, 12, 'tackle', ['carabaffe', 3]),
  mk('carabaffe', 'Carabaffe', 'bulwark', 'water', 0x3a8fe0, 135, 145, 11, 16, 'tackle', ['tortank', 6]),
  mk('tortank', 'Tortank', 'bulwark', 'water', 0x2a64c0, 185, 150, 15, 22, 'tackle'),
  mk('bulbizarre', 'Bulbizarre', 'support', 'grass', 0x6fd08c, 85, 150, 9, 8, 'vine', ['herbizarre', 3]),
  mk('herbizarre', 'Herbizarre', 'support', 'grass', 0x4fb070, 115, 155, 12, 11, 'vine', ['florizarre', 6]),
  mk('florizarre', 'Florizarre', 'support', 'grass', 0x2f8f55, 160, 160, 17, 15, 'vine'),
].map(p => [p.id, p]));
