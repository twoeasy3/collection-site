// A check of the messages' times and the sticky messages (CONFIG.messageTimes, src/delivery/messages.js) and of
// the mystery effect's name in the pickup status (Player.mysteryName), headless.
//   node scripts/.hud-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport', 'lowrider'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Message, timeFor } = await g.load('messages.js');
  const { Pickups } = await g.load('pickups.js');
  const MESSAGES = JSON.parse(readFileSync(new URL('../src/delivery/messages.json', import.meta.url), 'utf8'));
  const P = g.Player, G = g.Game, T = g.CONFIG.messageTimes, M = g.CONFIG.mystery;

  // ---- every message has a time, from the table
  const paths = [];
  const walk = (node, path) => Array.isArray(node) ? paths.push(path) : Object.keys(node).forEach(k => walk(node[k], [...path, k]));
  walk(MESSAGES, []);
  const said = paths.filter(p => p[0] !== 'bustCount' && p[0] !== 'mysteryNames'); // (those two are words put into a message or the status, never said)
  const timeless = said.filter(p => !(timeFor(...p) > 0 && Number.isFinite(timeFor(...p))));
  check(!timeless.length, `${said.length} messages in messages.json, each with a time from CONFIG.messageTimes` + (timeless.length ? ': none for ' + timeless.map(p => p.join('.')).join(', ') : ''));
  check(T.default > 0 && T.fade > 0 && ['reaction', 'pickup', 'rage', 'bust'].every(k => T.kinds[k] > 0), 'a default, a fade and a time for each kind (reaction, pickup, rage, bust)');
  check(g.CONFIG.messageTime === undefined && g.CONFIG.messageExtra === undefined && g.CONFIG.messageFade === undefined, 'the old messageTime / messageExtra / messageFade are gone');
  const sources = ['messages.js', 'render/hud.js'].map(f => readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8'));
  check(!sources.some(s => /\btime\s*[:=]\s*\d/.test(s.replace(/time: 0/g, ''))), 'no time written as a number in messages.js or render/hud.js');
  // (the table's order: its own path, then its group, then its kind)
  T.keys['events.fog'] = 9; T.groups.zones = 8;
  check(timeFor('events', 'fog') === 9 && timeFor('zones', 'sydney') === 8 && timeFor('events', 'tunnel') === T.kinds.pickup && timeFor('busts', 'seen') === T.kinds.bust,
    'a time by path beats one by group, which beats one by kind');
  delete T.keys['events.fog']; delete T.groups.zones;

  // ---- the sticky table: every path is a message, every condition one player.js has
  const known = new Set(paths.map(p => p.join('.')));
  for (const [path, condition] of Object.entries(T.sticky)) {
    check(known.has(path) && !!Message.conditions[condition]?.on, `sticky ${path}: a message in messages.json ("${Message.pick(...path.split('.'))}"), lasting for "${condition}"`);
  }

  const start = () => {
    g.select('suburbs');
    g.cars.selectCar('sport');
    G.evil = false;
    P.testGhost = false;
    G.start();
    g.drive(1, 0);
    g.run(3);
    P.testGhost = true;
    for (const p of Pickups.items) p.taken = true;
  };
  const sticky = (path) => Message.sticky.find(h => h.path === path);
  const mystery = (effect) => { P.nextMystery = effect; P.collect('mystery'); P.nextMystery = ''; };

  // ---- each sticky message comes with its condition and goes with it
  // (what starts each one, and what ends it)
  const cases = {
    'events.puncture': [() => P.punctureTyre(1), () => { P.puncture = 0; }],
    'events.beached': [() => { P.beached = 1.5; Message.say('events', 'beached'); }, () => { P.beached = 0; }],
    'powerups.badGas': [() => { P.collect('badGas'); Message.say('powerups', 'badGas'); }, () => { P.badGas = 0; }],
    'powerups.heavyMass': [() => { P.collect('heavyMass'); Message.say('powerups', 'heavyMass'); }, () => { P.heavy = 0; }],
    'powerups.butterfingers': [() => { P.collect('butterfingers'); Message.say('powerups', 'butterfingers'); }, () => { P.butterfingers = 0; }],
  };
  for (const path of Object.keys(T.sticky)) {
    const effect = path.startsWith('powerups.mystery.') ? path.split('.')[2] : null;
    const [begin, end] = effect ? [() => mystery(effect), () => P.endMystery()] : cases[path] || [];
    if (!begin) { check(false, `sticky ${path}: this check has no way to start it`); continue; }
    start();
    begin();
    g.run(0.5);
    const up = sticky(path), text = up?.line.text;
    // (ordinary messages don't push it out: four more said, and it is still held)
    Message.say('events', 'fog'); Message.say('busts', 'seen'); Message.say('wrecks', 'byPlayer'); Message.say('events', 'tunnel');
    g.run(0.2);
    const kept = !!sticky(path) && !Message.lines.some(l => l.text === text);
    end();
    g.run(0.1);
    check(!!up && kept && !sticky(path), `sticky ${path}: up with its condition ("${text}"), still up once pushed off the message lines, gone when it ends` +
      (up && kept && !sticky(path) ? '' : ` [up ${!!up}, kept ${kept}, gone ${!sticky(path)}]`));
  }
  // (the puncture's progress: the tyre being changed, stopped)
  start();
  P.punctureTyre(1);
  g.drive(-1, 0);
  g.run(8, () => P.speed < 0.3 && P.fixing > 1);
  const mid = sticky('events.puncture')?.progress;
  g.run(g.CONFIG.puncture.fixTime + 1, () => !P.puncture);
  g.run(0.1);
  check(mid > 0.2 && mid < 1 && !sticky('events.puncture'), `the puncture's message shows the tyre being changed (${(mid * 100 || 0).toFixed(0)}% when looked at), and goes once it is`);

  // ---- a sticky message clears at a wreck, a bust and the end of the run
  start(); P.punctureTyre(1); mystery('noBrakes'); g.run(0.3);
  const two = Message.sticky.length;
  P.testGhost = false; P.health = 0; g.run(0.5);
  check(two === 2 && !Message.sticky.length && !P.active, 'a wreck clears them (two up before, none after)');
  start(); mystery('noBrakes'); g.run(0.3);
  const before = Message.sticky.length;
  P.testGhost = false; P.bust('shoulder'); g.run(0.2);
  check(before === 1 && !Message.sticky.length, 'a bust clears them (' + (P.busted || !P.active ? 'busted' : 'NOT busted') + ')');
  start(); mystery('rickety'); g.run(0.3);
  const atEnd = Message.sticky.length;
  G.finish('timeout'); g.run(0.1); Message.settle();
  check(atEnd === 1 && !Message.sticky.length, 'the end of the run clears them');
  start(); mystery('rickety'); g.run(0.3); G.start();
  check(!Message.sticky.length, 'a new run starts with none');
  // (an ordinary message is never held)
  start(); Message.say('events', 'fog'); P.collect('turbo'); Message.say('powerups', 'turbo'); mystery('giant'); g.run(0.2);
  check(!Message.sticky.length && P.mystery === 'giant', 'an ordinary message, and a mystery not in the table (giant), are not held');

  // ---- the pickup status names the mystery effect, for as long as it lasts
  const lasting = [...new Set([...M.effects, ...M.extraEffects, M.fallback])];
  for (const effect of lasting) {
    const name = Message.pick('mysteryNames', effect);
    start();
    g.select('suburbs');
    mystery(effect);
    g.run(0.2);
    if (!P.mystery) { // (over at once: the insurance ones, the air strike, the train, the rewind)
      check(!!name && P.mysteryName === '', `${effect}: over at once, no status (its name, should it ever need one: "${name}")`);
      continue;
    }
    const ran = P.mystery, shown = P.mysteryName, total = P.mysteryTime;
    g.run(Math.max(0, total - 1.5));
    const late = P.mysteryName, left = P.mysteryTime;
    g.run(3);
    check(!!name && name.toLowerCase() !== 'mystery' && shown === Message.pick('mysteryNames', ran) && late === shown && left > 0 && P.mysteryName === '' && (ran === effect || ran === M.fallback),
      `${effect}: the status reads "${shown.toUpperCase()} ${total.toFixed(1)}" and still "${late.toUpperCase()} ${left.toFixed(1)}" near its end, then nothing` + (ran === effect ? '' : ` (given as ${ran}: it doesn't suit this car or level)`));
  }
  // (the fallback, where the effect doesn't fit: a rewind in a race)
  check(!!Message.pick('mysteryNames', M.fallback), `the fallback (${M.fallback}) has a name: "${Message.pick('mysteryNames', M.fallback)}"`);
  const hud = readFileSync(new URL('../src/delivery/render/hud.js', import.meta.url), 'utf8');
  check(hud.includes('Player.mysteryName') && !hud.includes("'MYSTERY '"), 'render/hud.js writes the name, not "MYSTERY"');
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e.stack || e));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
