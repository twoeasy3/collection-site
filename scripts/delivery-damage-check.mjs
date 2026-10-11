// Headless measure of crash damage: a player's car rear-ends a traffic car at several closing speeds; the
// health each loses, from the real Collision.check(). (Not the smoke test.)
//   node scripts/delivery-damage-check.mjs [--car=sport]
import { boot } from './delivery-headless.mjs';
const arg = (n, f) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : f; };
const g = await boot({ cars: ['commuter', 'sport', 'floatvan', arg('car', 'commuter')] });
try {
  g.select('quarry-run');
  g.cars.selectCar(arg('car', 'commuter'));
  g.Game.start();
  g.drive(0, 0);
  g.run(0.2);
  const { Player, Traffic, Collision, CONFIG } = g;
  console.log(`player ${arg('car', 'commuter')} (health ${Player.maxHealth}, mass ${Player.mass}); damagePerSpeed ${CONFIG.damagePerSpeed}, cap ${CONFIG.damageSpeedCap ?? 'none'}`);
  const kinds = ['commuter', 'sport', 'wagon', 'suv', 'bus'];
  console.log('closing m/s | ' + kinds.map(k => `${k}(${CONFIG.vehicles[k].health})`).join(' | ') + '   [traffic health lost, player lost]');
  for (const closing of [5, 10, 15, 20, 30, 40, 55]) {
    const row = [];
    for (const kind of kinds) {
      const car = Traffic.cars.find(c => c.dir > 0);
      for (const c of Traffic.cars) c.active = false;
      Object.assign(car, { active: true, kind, arrest: -1, shield: 0, ghost: 0, junction: false, stun: 0 });
      const t = CONFIG.vehicles[kind];
      Object.assign(car, { hw: t.hw, hl: t.hl, mass: t.mass, health: 1e6, maxHealth: 1e6, vs: 20, lat: Player.lat, yaw: 0, yawVel: 0, latVel: 0 });
      car.s = Player.s + Player.hl + car.hl - 0.3;
      Object.assign(Player, { health: 1e6, maxHealth: 1e6, speed: 20 + closing, ghost: 0, shield: 0, active: true, stun: 0, yaw: 0, yawVel: 0, latVel: 0, air: 0 });
      const s0 = Player.s; const p0 = Player.health;
      car.health = 1e6;
      g.Collision.check();
      row.push(`${(1e6 - car.health).toFixed(0)}/${(p0 - Player.health).toFixed(0)}`);
      Player.s = s0;
    }
    console.log(String(closing).padStart(10) + ' | ' + row.join(' | '));
  }
} finally { await g.close(); }
