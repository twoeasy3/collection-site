// Screenshots of the game, for checking how something looks and for the menu's pictures: starts the
// Vite dev server on a port of its own, and has headless Edge (or Chrome) load each address and save a PNG.
//   node scripts/shots.mjs <out-dir> name=<address> ...      each address is what follows /delivery/
//   node scripts/shots.mjs shots "bridge=?hidden=gimmick-road-2&ghost&at=4600&ff=4" "gimmicks=gimmicks.html"
//   node scripts/shots.mjs shots --levels                    every level's menu picture (?cine), as <id>.png
//   node scripts/shots.mjs shots --cars                      every garage car's (?cine=car), good and evil
//   node scripts/shots.mjs shots --levels=quarry-run,ring-road   only those
// Options: --size=1100x650 (any size), --scale=2 (device pixels to a CSS pixel, as on a phone: the picture is
// then twice the size each way; it is 1 unless asked), --wait=7000 (ms of page time each shot is given, once
// its page has loaded, before the picture is taken), --evil (the levels' pictures as Evil), --browser=<path>.
// A game address (one starting with ?) gets ?autostart added unless it names a mode of its own; add &ghost so
// nothing wrecks the car, &at=<m> to start that far along, and &ff=<s> to run the game on before the first
// frame. So a picture of the MENU is written index.html?... (or just index.html), not ?...
// Each line says how long the picture took, and under it the page's console errors and warnings.
// A run leaves nothing behind, and two runs at most take pictures at once (a third waits): see below. Its
// folder in %LOCALAPPDATA%\Temp is delivery-shots-run-<pid>-<when>; a start removes those of dead runs, and
// touches nothing else there (not the delivery-shots-XXXXXX folders of older versions of this script).
import { createServer } from 'vite';
import { logicServer } from './delivery-headless.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x === '--' + name || x.startsWith('--' + name + '=')); return a === undefined ? fallback : a.includes('=') ? a.slice(name.length + 3) : true; };
const out = resolve(args.find(a => !a.startsWith('--') && !a.includes('=')) || 'shots');
const [width, height] = String(opt('size', '1100x650')).split('x').map(Number);
const wait = Number(opt('wait', 7000)), scale = Number(opt('scale', 1)) || 1;

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
  const reader = await logicServer();
  const levels = await reader.ssrLoadModule('/src/delivery/levels.js'), cars = await reader.ssrLoadModule('/src/delivery/cars.js');
  const side = opt('evil', false) ? '=evil' : '';
  const only = (value) => typeof value === 'string' ? value.split(',') : null;
  // (where the usual place for the camera, 9 m off the right-hand edge, is inside a wall, a stand or a building)
  const CINE = { mumbai: '&cineout=-1&cineup=10&cineback=30', spa: '&cineside=left', 'albert-park': '&cineside=left' }; // (a block of flats; the pit building; a tree)
  if (opt('levels', false)) {
    levels.LEVELS.forEach((level, i) => {
      if (!only(opt('levels')) || only(opt('levels')).includes(level.id)) shots.push([level.id, `?autostart${side}&level=${i + 1}&ghost&cine&ff=6${CINE[level.id] || ''}`]);
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


// ---- what a run leaves behind, and how many run at once -------------------------------------------------
// A run leaves NOTHING on the disk, and only two take pictures at a time. On 10-Oct thirty agents' runs filled a
// 475 GB disk: every start of the browser wrote a scoped_dir (up to 394 MB) and a 74 MB <guid>.tmp into TEMP
// and never removed them, and there was a start for every picture. So:
//  - ONE browser takes all of a run's pictures, driven over the DevTools protocol and closed by it at the end
//    (ended from outside, its helpers kept hold of the profile; left to itself with a TEMP of its own, it sat
//    for three minutes after each picture);
//  - everything a run writes (Vite's cache, the browser's profile, the browser's TEMP) is in one folder of the
//    run's, in the machine's own temp folder whatever TEMP says, removed however the run ends;
//  - that folder's NAME is its marker, delivery-shots-run-<pid>-<when>: made in one step, so there is never a
//    folder of a run's without it (a pid FILE was lost when the removing of a folder took it first and then met
//    a file the browser still held). A run starts by ending the browsers and removing the folders of runs that
//    are dead: those whose process is gone, or whose `alive` file (freshened every 15 s) is 15 minutes old.
//    Only folders of exactly that name are ever touched: not the delivery-shots-XXXXXX of older versions of
//    this script, nor anything else in the temp folder;
//  - at most SLOTS runs take pictures at once on the machine: the rest wait their turn.
const ROOT = process.env.LOCALAPPDATA && existsSync(join(process.env.LOCALAPPDATA, 'Temp')) ? join(process.env.LOCALAPPDATA, 'Temp') : tmpdir();
const SLOTS = 2;              // runs taking pictures at once, on the whole machine
const STALE = 15 * 60 * 1000; // ms without a sign of life after which a run is taken for dead, whatever its pid says (pids are used again)
const RUN = /^delivery-shots-run-(\d+)-[a-z0-9]+$/, SLOT = /^delivery-shots-slot-\d+$/;
const WINDOWS = process.platform === 'win32', SYSTEM = join(process.env.SystemRoot || 'C:/Windows', 'System32');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); // (a wait where nothing may be awaited: on the way out)
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const age = (path) => { try { return Date.now() - statSync(path).mtimeMs; } catch { return null; } };
// Removing, tried again for `ms` while a browser that has just ended lets go of its files (Windows refuses a file
// that is open: EBUSY, EPERM). Answers the error if it would not go.
const remove = (path, ms = 12000) => {
  for (const until = Date.now() + ms; ;) {
    try { rmSync(path, { recursive: true, force: true }); return null; } catch (error) { if (Date.now() > until) return error; }
    pause(250);
  }
};
// every browser process started with that folder as its profile or TEMP: found by command line, not by tree
// (the helpers of a browser whose parent is gone belong to no tree)
const endBrowsersOf = (folder) => {
  try {
    if (WINDOWS) {
      const exe = browser.replace(/\\/g, '/').split('/').pop().replace(/'/g, "''"), text = folder.replace(/'/g, "''");
      spawnSync(join(SYSTEM, 'WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command',
        // (asked again until there are none: a browser ended as it starts has helpers still on their way up)
        `for ($i = 0; $i -lt 12; $i++) { $found = @(Get-CimInstance Win32_Process -Filter "Name='${exe}'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${text}') }); if (-not $found) { break }; $found | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 300 }`], { stdio: 'ignore', timeout: 45000 });
    } else spawnSync('pkill', ['-9', '-f', folder], { stdio: 'ignore' });
  } catch { /* (none to end) */ }
};
// a run's folder and its browsers, twice over if need be; says so if something of it is still there
const removeRun = (folder, browsers = true) => {
  let error = null;
  for (let round = 0; round < 2; round++) {
    if (browsers) endBrowsersOf(folder);
    if (!(error = remove(folder))) return;
    browsers = true;
  }
  console.log('  (could not remove ' + folder + ' yet: ' + String(error && error.message || error).split('\n')[0] + '; the next run takes it)');
};
// dead: its process gone, or no sign of life for a long while. (A slot is a folder with its owner's pid in a file;
// one with no pid yet is a run between making it and writing it, or one that died there.)
const deadRun = (name) => { const pid = Number(RUN.exec(name)[1]), since = age(join(ROOT, name, 'alive')) ?? age(join(ROOT, name)); return pid !== process.pid && since !== null && (!alive(pid) || since > STALE); };
const deadSlot = (folder) => {
  let pid = 0;
  try { pid = Number(readFileSync(join(folder, 'pid'), 'utf8')); } catch { const since = age(folder); return since !== null && since > 60000; }
  const since = age(join(folder, 'pid'));
  return pid !== process.pid && since !== null && (!(pid > 0) || !alive(pid) || since > STALE);
};
const sweep = () => {
  let names = [];
  try { names = readdirSync(ROOT); } catch { /* (no such folder) */ }
  for (const name of names) {
    if (RUN.test(name) && deadRun(name)) { console.log('  (removing what a dead run left: ' + name + ')'); removeRun(join(ROOT, name)); }
    else if (SLOT.test(name) && deadSlot(join(ROOT, name))) remove(join(ROOT, name), 2000);
  }
};
sweep();
const own = join(ROOT, 'delivery-shots-run-' + process.pid + '-' + Date.now().toString(36));
mkdirSync(own); // (not recursive: it must be new)
let slot = null, child = null, server = null, cleaned = false;
const fresh = () => { try { writeFileSync(join(own, 'alive'), ''); if (slot) { const now = new Date(); utimesSync(join(slot, 'pid'), now, now); } } catch { /* (gone) */ } };
fresh();
setInterval(fresh, 15000).unref();
const cleanup = () => { // (however the run ends, and all of it at once: an 'exit' handler cannot wait)
  if (cleaned) return;
  cleaned = true;
  if (child && child.exitCode === null) { try { WINDOWS ? spawnSync(join(SYSTEM, 'taskkill.exe'), ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) : child.kill('SIGKILL'); } catch { /* (gone already) */ } }
  if (slot) remove(slot, 2000);
  // (a browser that closed by itself has no helpers left to end, and asking costs a second: only if its files will not go)
  if (!child || remove(own, child.exitCode === null ? 0 : 3000)) removeRun(own, !!child);
};
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(signal, () => { console.log('  (' + signal + ': cleaning up)'); cleanup(); process.exit(130); });
process.on('uncaughtException', (error) => { console.log(String(error && error.stack || error)); cleanup(); process.exit(1); });
process.on('unhandledRejection', (error) => { console.log(String(error && error.stack || error)); cleanup(); process.exit(1); });
// a slot: a folder made in one step (so two runs cannot both make it), with its owner's pid in it
const takeSlot = async () => {
  for (let told = false; ; told = true) {
    for (let k = 1; k <= SLOTS; k++) {
      const folder = join(ROOT, 'delivery-shots-slot-' + k);
      if (deadSlot(folder)) remove(folder, 2000);
      try { mkdirSync(folder); } catch { continue; } // (taken)
      writeFileSync(join(folder, 'pid'), String(process.pid));
      return folder;
    }
    if (!told) console.log('  waiting for a free screenshot slot (' + SLOTS + ' runs at a time on this machine)');
    await sleep(1000);
  }
};

// ---- the browser: one for the run, driven over the DevTools protocol ------------------------------------
let socket = null, calls = 0, opened = 0;
const waiting = new Map(), listeners = new Map(); // (answers awaited, by call number; a page's events, by session)
const send = (method, params = {}, sessionId, timeout = 30000) => new Promise((done, fail) => {
  if (!socket || socket.readyState !== 1) return fail(new Error('the browser is gone'));
  const id = ++calls;
  const timer = setTimeout(() => { waiting.delete(id); fail(new Error('no answer to ' + method)); }, timeout);
  waiting.set(id, (message) => { clearTimeout(timer); message.error ? fail(new Error(method + ': ' + message.error.message)) : done(message.result); });
  socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
});
const openBrowser = async () => {
  // (a profile for each start: the last one's files may be held a moment yet)
  const profile = join(own, 'profile-' + (++opened)), temp = join(own, 'tmp');
  mkdirSync(profile, { recursive: true });
  mkdirSync(temp, { recursive: true });
  const mine = child = spawn(browser, ['--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-extensions', '--disable-component-extensions-with-background-pages',
    '--disable-component-update', '--disable-background-networking', // (no 74 MB of components fetched for a profile that lasts a minute)
    '--user-data-dir=' + profile, // (a profile of its own: with the everyday one, a browser already open takes the address and no picture is made)
    '--remote-debugging-port=0', `--window-size=${Math.max(500, width)},${height}`, 'about:blank'],
  { stdio: 'ignore', env: { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp } }); // (its scoped_dir and .tmp go in the run's folder, not the machine's)
  mine.on('error', () => {});
  // (the port it chose, and the path of its socket, are written into the profile)
  let where = null;
  for (let i = 0; i < 300 && !where && mine.exitCode === null; i++) {
    await sleep(100);
    try { const lines = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); if (lines.length > 1 && lines[1].trim()) where = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`; } catch { /* (not up yet) */ }
  }
  if (!where) throw new Error('the browser did not start: ' + browser);
  socket = new WebSocket(where);
  await new Promise((done, fail) => { socket.addEventListener('open', done); socket.addEventListener('error', () => fail(new Error('no DevTools connection to the browser'))); });
  socket.addEventListener('message', (m) => {
    const message = JSON.parse(m.data);
    if (message.id) { const answer = waiting.get(message.id); waiting.delete(message.id); if (answer) answer(message); }
    else if (message.sessionId && listeners.has(message.sessionId)) listeners.get(message.sessionId)(message);
  });
};
// closed by its own protocol, and waited for: only then are its files let go
const closeBrowser = async () => {
  const mine = child;
  if (!mine) return;
  const gone = new Promise(done => { if (mine.exitCode !== null || mine.signalCode !== null) done(); else mine.once('exit', done); });
  try { await send('Browser.close', {}, undefined, 5000); } catch { /* (gone, or deaf: ended below) */ }
  await Promise.race([gone, sleep(10000)]);
  try { socket && socket.close(); } catch { /* (closed) */ }
  socket = null;
};
// One picture: a page of its own, loaded, then given `wait` ms of page time (which stands still while anything is
// being fetched). The page time is given once the page has loaded: given before, it can run out part-way through
// the loading and stop the page there, and then no picture is ever made of it.
const LIMIT = 90000; // ms of real time a picture may take
const shoot = async (url, file) => {
  const notes = [];
  const note = (text) => { text = String(text).split('\n')[0].slice(0, 300); if (!notes.includes(text)) notes.push(text); };
  if (!socket || socket.readyState !== 1 || !child || child.exitCode !== null) { await closeBrowser(); await openBrowser(); }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    let timeUp, isLoaded;
    const expired = new Promise(done => { timeUp = done; }), loaded = new Promise(done => { isLoaded = done; });
    listeners.set(sessionId, ({ method, params }) => {
      if (method === 'Emulation.virtualTimeBudgetExpired') timeUp(true);
      else if (method === 'Page.loadEventFired') isLoaded(true);
      else if (method === 'Runtime.exceptionThrown') note('exception: ' + (params.exceptionDetails.exception?.description || params.exceptionDetails.text));
      else if (method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(params.type)) note(params.type + ': ' + params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
      else if (method === 'Log.entryAdded' && ['error', 'warning'].includes(params.entry.level)) note(params.entry.level + ': ' + params.entry.text + (params.entry.url ? '  ' + params.entry.url : ''));
    });
    const page = (method, params, timeout) => send(method, params, sessionId, timeout);
    await page('Page.enable'); await page('Runtime.enable'); await page('Log.enable');
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false }); // (the picture's size exactly, and any size: a window goes no narrower than 500)
    const went = await page('Page.navigate', { url }, LIMIT);
    if (went.errorText) note('error: ' + went.errorText);
    if (!await Promise.race([loaded, sleep(LIMIT)])) note('warning: not loaded after ' + LIMIT / 1000 + ' s: the picture is of the page as it stood');
    else {
      await page('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: wait });
      if (!await Promise.race([expired, sleep(LIMIT)])) note('warning: its ' + wait + ' ms of page time were not up after ' + LIMIT / 1000 + ' s: the picture is of the page as it stood');
    }
    let shot;
    try { shot = await page('Page.captureScreenshot', { format: 'png' }, 15000); } catch {
      // (a page stopped in the middle of something draws no frame: let its time run, and ask again)
      await page('Emulation.setVirtualTimePolicy', { policy: 'advance' });
      shot = await page('Page.captureScreenshot', { format: 'png' }, 30000);
    }
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    listeners.delete(sessionId);
  } finally {
    try { await send('Target.closeTarget', { targetId }, undefined, 5000); } catch { /* (gone with the browser) */ }
  }
  return notes;
};

let failed = 0;
try {
  mkdirSync(out, { recursive: true });
  slot = await takeSlot();
  // (The run's folder holds Vite's cache as well. Every worktree's node_modules is a junction to one folder, so the
  // usual cache, node_modules/.vite, is one for them all, and a server started from another worktree deletes it to
  // bundle the dependencies again: see delivery-headless.mjs. It costs a few seconds of bundling each run.)
  server = await createServer({ server: { port: 5199, strictPort: false, hmr: false }, cacheDir: join(own, 'vite'), logLevel: 'error' });
  await server.listen();
  const base = `http://localhost:${server.config.server.port}/delivery/`;
  for (const [name, address] of shots) {
    const game = address.startsWith('?') && !/[?&](autostart|hidden|test|edited|screensaver|racewatch|garage|album|milestones)\b/.test(address);
    const url = base + (game ? address.replace('?', '?autostart&') : address);
    const file = join(out, name + '.png');
    const began = Date.now();
    let notes = [], why = '';
    try { rmSync(file, { force: true }); notes = await shoot(url, file); } catch (error) { why = '  ' + String(error && error.message || error); }
    const ok = existsSync(file) && statSync(file).size > 2000;
    if (!ok) failed++;
    console.log((ok ? '  ok    ' : '  FAIL  ') + name + '  ' + url + '  (' + ((Date.now() - began) / 1000).toFixed(1) + ' s)' + why);
    for (const text of notes) console.log('          ' + text); // (what the page said: its errors and warnings)
  }
} finally {
  try { await closeBrowser(); } catch { /* (ended in cleanup) */ }
  try { if (server) await server.close(); } catch { /* (closed) */ }
  cleanup();
}
console.log(failed ? failed + ' failed' : shots.length + ' shot' + (shots.length === 1 ? '' : 's') + ' in ' + out);
process.exit(failed ? 1 : 0);
