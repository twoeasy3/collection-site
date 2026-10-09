// The game's logic, loaded without a browser (as scripts/delivery-smoke.mjs and level-clocks.mjs do), for a
// quick look at one thing: a probe of a level, a new gimmick tried out. Not a test suite: see delivery-probe.mjs.
//   const g = await boot();  ...  await g.close();
import { createServer } from 'vite';

export const boot = async ({ cars = ['commuter', 'sport'] } = {}) => {
  // the game logic touches the DOM only to show / hide screens
  const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
  globalThis.window = globalThis.window || { addEventListener() {}, dispatchEvent() {} };
  const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars }));
  globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: 'delivery_racer_progress=' + allOpen };
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const load = (path) => server.ssrLoadModule('/src/delivery/' + path);
  const levels = await load('levels.js');
  const g = {
    load, levels,
    track: await load('track.js'),
    ...(await load('game.js')),
    ...(await load('player.js')),
    ...(await load('traffic.js')),
    ...(await load('collision.js')),
    ...(await load('input.js')),
    ...(await load('physics.js')),
    ...(await load('config.js')),
    ...(await load('messages.js')),
    cars: await load('cars.js'),
    close: () => server.close(),
    // pick a level by id (on the menu or hidden), or take a level object as it is
    select(level) {
      const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)];
      const found = typeof level === 'string' ? all.find(l => l.id === level) : level;
      if (!found) throw new Error('no such level: ' + level);
      if (levels.LEVELS.includes(found)) levels.selectLevel(levels.LEVELS.indexOf(found));
      else levels.selectSpecial(found);
      return found;
    },
    // hold the accelerator down (1), brake (-1) or neither (0); and steer (-1 .. 1)
    drive(throttle = 1, steer = 0) {
      Object.defineProperty(g.Input, 'throttle', { get: () => throttle, configurable: true });
      Object.defineProperty(g.Input, 'steer', { get: () => steer, configurable: true });
    },
    // run the game for `seconds`, calling each(t) after every step (return true to stop). Messages said on
    // the way are gathered in g.said
    said: [],
    run(seconds, each) {
      const step = 1 / 60;
      for (let t = 0; t < seconds; t += step) {
        g.Game.update(step);
        g.FxQueue.length = 0;
        for (const line of g.Message.lines) if (line.text && !g.said.includes(line.text)) g.said.push(line.text);
        if (each && each(t)) return t;
      }
      return seconds;
    },
  };
  return g;
};
