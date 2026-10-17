import Phaser from 'phaser';
import { Game } from './scenes/Game';
new Phaser.Game({ type: Phaser.AUTO, width: 960, height: 600, parent: 'app', backgroundColor: '#0c0a10',
  physics: { default: 'arcade' }, scene: [Game],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
