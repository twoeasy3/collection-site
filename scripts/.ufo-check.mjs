import { logicServer } from './delivery-headless.mjs'; // (a Vite server that shares no cache with any other run)
const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
globalThis.document = { getElementById: element, body: element(), cookie: '' };
const server = await logicServer();
try {
  const L = (p) => server.ssrLoadModule(p);
  const levels = await L('/src/delivery/levels.js');
  const { Game } = await L('/src/delivery/game.js');
  const { Player } = await L('/src/delivery/player.js');
  const { Traffic } = await L('/src/delivery/traffic.js');
  const { FxQueue } = await L('/src/delivery/physics.js');
  const { CONFIG } = await L('/src/delivery/config.js');
  const U = CONFIG.ufoStrike;
  let spun = 0, smokingBy1s = 0, total = 0;
  const deaths = [];
  for (let run = 0; run < 4; run++) {
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'night'));
    Game.start();
    Player.s = 300; Player.shield = 99;
    for (let i = 0; i < 120; i++) { Game.update(1 / 120); FxQueue.length = 0; }
    Player.nextMystery = 'ufo';
    Player.collect('mystery');
    for (let i = 0; i < 120 * (U.arrive + U.hover) + 2; i++) { Game.update(1 / 120); FxQueue.length = 0; }
    const doomed = Traffic.cars.filter(c => c.active && c.ufoBurning).map(car => ({ car, spun: false, died: 0, gone: false }));
    for (let i = 1; i <= 120 * 8; i++) {
      Player.shield = 99;
      Game.update(1 / 120); FxQueue.length = 0;
      for (const d of doomed) {
        if (d.died || d.gone) continue;
        if (i === 120 && d.car.active && d.car.health / d.car.maxHealth < CONFIG.smokeStart) smokingBy1s++;
        if (d.car.spin > 0) d.spun = true;
        if (!d.car.active || !d.car.ufoBurning) {
          if (d.car.health > 0) d.gone = true;
          else d.died = i / 120;
        }
      }
    }
    total += doomed.filter(d => !d.gone).length;
    spun += doomed.filter(d => d.spun && !d.gone).length;
    deaths.push(...doomed.filter(d => d.died).map(d => d.died));
  }
  deaths.sort((a, b) => a - b);
  const pct = (q) => deaths[Math.floor(q * (deaths.length - 1))].toFixed(1);
  console.log(`${total} cars wrecked, ${spun} spun out on the way, ${smokingBy1s} smoking 1 s after the saucer started to leave; wrecked ${pct(0)}-${pct(1)} s after (10% by ${pct(0.1)}, median ${pct(0.5)}, 90% by ${pct(0.9)})`);
} finally { await server.close(); }
