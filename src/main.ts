import Phaser from 'phaser';
import { Pick } from './scenes/Pick';
import { Game } from './scenes/Game';
const game = new Phaser.Game({ type: Phaser.AUTO, width: 960, height: 600, parent: 'app', backgroundColor: '#0c0a10', pixelArt: true,
  physics: { default: 'arcade' }, scene: [Pick, Game], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
Object.assign(window, { game });
