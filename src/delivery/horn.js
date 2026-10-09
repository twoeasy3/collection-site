// ============================================================================
// HORN - the player's horn (H: see Input). It sounds the car's horn
// and traffic ahead reacts to it: a calm good driver moves over, an angry or
// evil driver honks back (Traffic.hornedAt).
// ============================================================================
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { CAR } from './cars.js';
import { sfx } from './physics.js';

export const Horn = {
  next: 0,
  reset() { this.next = 0; },
  press() {
    if (Game.state !== 'playing' || Game.paused || Game.screensaver || !Player.active || Game.time < this.next) return;
    this.next = Game.time + (CONFIG.horn?.wait || 0.6);
    sfx(Player.tank > 0 ? 'hornBig' : CAR.kind === 'darkvan' || CAR.kind === 'truck' ? 'hornBig' : 'horn');
    Traffic.hornedAt();
  },
};
Input.on('horn', () => Horn.press());

