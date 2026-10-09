// Screenshots of the game, for checking how something looks and for the menu's pictures: starts the
// Vite dev server on a port of its own, and has headless Edge (or Chrome) load each address and save a PNG.
//   node scripts/shots.mjs <out-dir> name=<address> ...      each address is what follows /delivery/
//   node scripts/shots.mjs shots "bridge=?hidden=gimmick-road-2&ghost&at=4600&ff=4" "gimmicks=gimmicks.html"
//   node scripts/shots.mjs shots --levels                    every level's menu picture (?cine), as <id>.png
//   node scripts/shots.mjs shots --cars                      every garage car's (?cine=car), good and evil
//   node scripts/shots.mjs shots --levels=quarry-run,ring-road   only those
// Options: --size=1100x650 (Edge goes no narrower than about 500), --wait=7000 (ms of page time each
// shot is given before the picture is taken), --evil (the levels' pictures as Evil), --browser=<path>.
// A game address gets ?autostart added unless it names a mode of its own; add &ghost so nothing wrecks
// the car, &at=<m> to start that far along, and &ff=<s> to run the game on before the first frame.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const out = resolve(args.find(a => !a.startsWith('--') && !a.includes('=')) || 'shots');
const [width, height] = String(opt('size', '1100x650')).split('x').map(Number);
const wait = Number(opt('wait', 7000));

const browser = opt('browser', null) || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
if (!browser) { console.log('No Edge or Chrome found: name one with --browser=<path>'); process.exit(1); }

// the shots: [name, address]
const shots = args.filter(a => !a.startsWith('--') && a.includes('=')).map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
if (opt('levels', false) || opt('cars', false)) {
  // (the level and car lists are the game's own: read the same way the headless scripts do)
  const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
  globalThis.window = { addEventListener() {} };
  globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: '' };
  const reader = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const levels = await reader.ssrLoadModule('/src/delivery/levels.js'), cars = await reader.ssrLoadModule('/src/delivery/cars.js');
  const side = opt('evil', false) ? '=evil' : '';
  const only = (value) => typeof value === 'string' ? value.split(',') : null;
  if (opt('levels', false)) {
    levels.LEVELS.forEach((level, i) => {
      if (!only(opt('levels')) || only(opt('levels')).includes(level.id)) shots.push([level.id, `?autostart${side}&level=${i + 1}&ghost&cine&ff=6`]);
    });
  }
  if (opt('cars', false)) {
    for (const car of [...cars.CARS, ...Object.values(cars.LEVEL_CARS), ...Object.values(cars.SECRET_CARS)]) {
      if (only(opt('cars')) && !only(opt('cars')).includes(car.id)) continue;
      shots.push([car.id + '-good', `?autostart&car=${car.id}&cine=car`], [car.id + '-evil', `?autostart=evil&car=${car.id}&cine=car`]);
    }
  }
  await reader.close();
}
if (!shots.length) { console.log('Nothing to shoot: node scripts/shots.mjs <out-dir> name=<address> ... (or --levels, --cars)'); process.exit(1); }

const launch = (file, list, timeout) => new Promise((done) => {
  const child = spawn(file, list, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  const timer = setTimeout(() => child.kill(), timeout);
  child.on('close', () => { clearTimeout(timer); done({ stderr }); });
  child.on('error', (e) => { clearTimeout(timer); done({ stderr: String(e) }); });
});
mkdirSync(out, { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}/delivery/`;
let failed = 0;
try {
  for (const [name, address] of shots) {
    const game = address.startsWith('?') && !/[?&](autostart|hidden|test|edited|screensaver|racewatch|garage)\b/.test(address);
    const url = base + (game ? address.replace('?', '?autostart&') : address);
    const file = join(out, name + '.png');
    // (not spawnSync: the server answering the browser is in this process, and has to keep running meanwhile)
    const run = await launch(browser, ['--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-extensions-with-background-pages',
      '--user-data-dir=' + join(tmpdir(), 'delivery-shots-profile'), // (a profile of its own: with the everyday one, a browser already open takes the address and no picture is made)
      `--window-size=${width},${height}`, `--virtual-time-budget=${wait}`, `--screenshot=${file}`, url], 180000);
    const ok = existsSync(file) && statSync(file).size > 2000;
    if (!ok) failed++;
    console.log((ok ? '  ok    ' : '  FAIL  ') + name + '  ' + url + (ok ? '' : '  ' + (run.stderr || '').split('\n').slice(-3).join(' ')));
  }
} finally {
  await server.close();
}
console.log(failed ? failed + ' failed' : shots.length + ' shot' + (shots.length === 1 ? '' : 's') + ' in ' + out);
process.exit(failed ? 1 : 0);
