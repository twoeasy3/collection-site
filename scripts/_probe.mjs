import { createServer } from 'vite';
globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ width: 10 }) }), width: 0, height: 0 }) };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const count = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };
  const O = await server.ssrLoadModule('/src/delivery/render/obstacleModels.js');
  const out = [];
  for (const k of Object.keys(O.OBSTACLE_MODELS)) {
    try { out.push(k + ':' + count(O.OBSTACLE_MODELS[k]({ hw: 1, hl: 1, height: 1.4, r: 3, s: 0, lat: 0 }))); } catch (e) { out.push(k + ':ERR ' + e.message); }
  }
  console.log('obstacles', out.join(' '));
  const tries = [
    ['elephant', async () => (await server.ssrLoadModule('/src/delivery/render/elephantModel.js')).makeElephant()],
    ['hippo', async () => (await server.ssrLoadModule('/src/delivery/render/hippoModel.js')).makeHippo()],
    ...['bulldozer', 'excavator', 'dumpTruck', 'roller', 'forklift'].map(k => [k, async () => (await server.ssrLoadModule('/src/delivery/render/machineModels.js')).makeMachine(k)]),
    ['digger', async () => (await server.ssrLoadModule('/src/delivery/render/siteModels.js')).makeDigger()],
    ['worker', async () => (await server.ssrLoadModule('/src/delivery/render/siteModels.js')).makeWorker()],
    ['carriage', async () => (await server.ssrLoadModule('/src/delivery/render/trainModel.js')).makeCarriage(true, true)],
    ['airliner', async () => (await server.ssrLoadModule('/src/delivery/render/airportModels.js')).makeAirliner(30, 36, false)],
    ['tower', async () => (await server.ssrLoadModule('/src/delivery/render/airportModels.js')).makeTower()],
    ['tractor', async () => (await server.ssrLoadModule('/src/delivery/render/carExtras.js')).makeTractorModel()],
    ['ufo', async () => (await server.ssrLoadModule('/src/delivery/render/carExtras.js')).makeUfo()],
  ];
  const res = [];
  for (const [k, f] of tries) { try { res.push(k + ':' + count(await f())); } catch (e) { res.push(k + ':ERR ' + e.message); } }
  console.log('others', res.join(' '));
} finally { await server.close(); }
