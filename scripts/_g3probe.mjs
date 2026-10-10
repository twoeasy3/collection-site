import { boot } from './delivery-headless.mjs';
const g = await boot({ cars: ['commuter', 'sport', 'miata'] });
const { Gambles } = await g.load('gambles.js');
const { Progress } = await g.load('progress.js');
g.select('gimmick-road-3');
for (const v of [32, 23.7]) {
  Progress.data.car = 'sport'; g.Game.start();
  for (const c of g.Traffic.cars) if (!c.fixed) c.active = false;
  const P = g.Player;
  Object.assign(P, { s: 2380, lat: Gambles.ramps[0].lat, speed: v, launching: false, shield: 0 });
  g.drive(0, 0);
  let n = 0;
  g.run(6, () => { if (n++ % 6 === 0 && P.s > 2396) console.log(v, 's', P.s.toFixed(1), 'air', P.air.toFixed(2), 'v', P.speed.toFixed(1), 'fly', Gambles.fly ? Gambles.fly.vy.toFixed(1) : '-', 'on', !!Gambles.onRamp, 'hp', P.health.toFixed(0), 'lat', P.lat.toFixed(2)); return P.s > 2500 || !P.active; });
}
await g.close(); process.exit(0);
