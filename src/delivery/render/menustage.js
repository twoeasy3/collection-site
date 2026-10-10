// ---- the start screen's level select, car and side: the game's front end ---------------------------------
// One screen, nothing scrolls. The level picked is the STAGE: its picture large, its number and name, its
// description for the side picked, its clock, tip and best times with their medals. Under it the STRIP: the
// levels of its group, to step through; over it the groups, and over those the tabs (Deliveries, Races): the
// same control one level up each time. Beside the stage the car (a way into the garage), the side (Good or
// Evil: Evil recolours the screen) and START.
// Still only a menu: stepping to a level marks it (selectLevel); the level is built when a run starts
// (Game.start), and nothing here reloads the page. A level not open yet can be stepped to and looked at, but
// it is never the level picked, and START is off while it is on the stage.
// Keys: left / right (A / D) a level, up / down a group, T the other tab, E the other side, G the garage,
// I what's on this road, O the options, Enter start. Touch: swipe the stage sideways, or tap the strip.
// For a picture: ?cursor=47 puts that level on the stage, open or not (?pick= opens them all first: see
// main.js); ?side=evil shows the Evil side for the visit; ?options opens the options; ?road the road card.
import '../menu2.css';
import { LEVELS, LEVEL, selectLevel, levelLabel, MAIN_LEVELS, AMPHIBIOUS_LEVELS, DELIVERY_LEVELS, RACE_LEVELS, isRace } from '../levels.js';
import { CARS, CAR, useLevelCar, earnedFor, amphibiousCars, stars, starColour } from '../cars.js';
import { Progress } from '../progress.js';
import { Game, formatTime, clockFor } from '../game.js';
import { medalFor, medalNeeds } from '../levelinfo.js';
import { Garage } from './garage.js';
import { Sound } from './audio.js';

const money = (amount) => '$' + amount.toFixed(2);
// each level's still, by level id (taken with ?cine: see main.js). The postcard album uses them too (render/album.js)
export const LEVEL_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../levelshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
// each car's picture, by car id and side: 'commuter-good', 'commuter-evil' ... (taken with ?cine=car)
const CAR_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../carshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));

// a node: its tag, its class, and what goes in it (words, or other nodes; nothing for a null)
const make = (tag, className, ...inside) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...inside.flat().filter(x => x !== null && x !== undefined && x !== false));
  return node;
};

const params = new URLSearchParams(location.search);
const startScreen = document.getElementById('startScreen');
const bank = document.getElementById('bank');
const stage = document.getElementById('stage'), strip = document.getElementById('levels'), groupBox = document.getElementById('levelGroups');
const shop = document.getElementById('shop'), startBtn = document.getElementById('startBtn');
const sideBox = document.getElementById('sideBtn'), sideNote = document.getElementById('sideNote');

// ---- the tabs and their groups ---------------------------------------------------------------------------
// Two tabs: the deliveries, and the races (the circuits: see RACE_LEVELS). On each, the levels in groups of
// five (the main delivery levels, then the special ones, then the amphibious ones, each kind starting a group
// of its own; the races five at a time)
const TABS = { delivery: { list: DELIVERY_LEVELS, groups: [] }, race: { list: RACE_LEVELS, groups: [] } };
for (let i = 0; i < MAIN_LEVELS.length; i += 5) TABS.delivery.groups.push([i, Math.min(MAIN_LEVELS.length, i + 5)]);
{
  const specials = DELIVERY_LEVELS.length - AMPHIBIOUS_LEVELS.length;
  for (let i = MAIN_LEVELS.length; i < specials; i += 5) TABS.delivery.groups.push([i, Math.min(specials, i + 5)]);
  for (let i = specials; i < DELIVERY_LEVELS.length; i += 5) TABS.delivery.groups.push([i, Math.min(DELIVERY_LEVELS.length, i + 5)]);
}
for (let i = 0; i < RACE_LEVELS.length; i += 5) TABS.race.groups.push([i, Math.min(RACE_LEVELS.length, i + 5)]);
const tabOf = (level) => isRace(level) ? 'race' : 'delivery';
const label = (level) => levelLabel(LEVELS.indexOf(level));
// what kind of level it is, for the plate over its picture
const kindOf = (level) => isRace(level) ? 'Race' : AMPHIBIOUS_LEVELS.includes(level) ? 'Amphibious' : MAIN_LEVELS.includes(level) ? 'Level' : 'Special';
// a race is always open; a delivery level once the one before it has been delivered
const isOpen = (level) => isRace(level) || LEVELS.indexOf(level) < Progress.data.unlocked;
// a level played on one side only (the Battlefield, All Heck: always Good)
const oneSided = (level) => !!(level.battle || level.alwaysGood);

// ---- what is on the stage --------------------------------------------------------------------------------
let cursor = LEVEL;             // the level on the stage: the level picked, unless it is one not open yet
let tab = tabOf(LEVEL);
const lastOn = {};              // the level each tab was left on, to come back to
let drawn = null;               // (what the stage last showed: a change of level or side is animated)
// the cheapest amphibious car: the one to point a player with none at
const cheapestAmphibious = () => amphibiousCars().sort((a, b) => a.price - b.price)[0];
const blip = (name) => Sound.play(name, 0.5);

// put a level on the stage; if it is open it is the level picked (and the car is the one it is driven in)
const show = (level) => {
  cursor = level;
  tab = tabOf(level);
  lastOn[tab] = level;
  if (isOpen(level)) {
    selectLevel(LEVELS.indexOf(level));
    useLevelCar(level.car, level.amphibious); // (an amphibious level puts the player in their amphibious car)
  }
  draw();
};
// a step along the tab's levels (through the groups, end to end), a step of a whole group, the other tab
const step = (by) => {
  const list = TABS[tab].list, at = list.indexOf(cursor), to = Math.max(0, Math.min(list.length - 1, at + by));
  if (to === at) return;
  blip('menuMove');
  show(list[to]);
};
const stepGroup = (by) => {
  const { list, groups } = TABS[tab], at = list.indexOf(cursor), g = groups.findIndex(([a, b]) => at >= a && at < b);
  const to = Math.max(0, Math.min(groups.length - 1, g + by));
  if (to === g) return;
  blip('menuMove');
  show(list[Math.min(groups[to][1] - 1, groups[to][0] + (at - groups[g][0]))]); // (the same place along the row)
};
const showTab = (name) => {
  if (name === tab) return;
  blip('menuMove');
  show(lastOn[name] || TABS[name].list[0]);
};
// Good or Evil: picked here (and remembered), played by START
Game.evil = !!Progress.data.evil;
const pickSide = (evil) => {
  if (evil === Game.evil) return;
  Game.evil = evil;
  Progress.data.evil = evil;
  Progress.save();
  blip('menuPick');
  draw();
};

// ---- drawing ---------------------------------------------------------------------------------------------
// a side's half of the stage's ribbon: the side, the medal its best time earned, and the time (or a dash).
// (The ribbon is two halves on purpose, Good's on the left and Evil's on the right: see the 10-Oct checklist)
const ribbonHalf = (level, evil) => {
  const spare = Progress.bestTime(level.id, evil), medal = medalFor(level, evil, spare);
  const half = make('span', 'half ' + (evil ? 'evil' : 'good') + (medal ? ' ' + medal : ''),
    make('i', 'medal'), make('small', '', evil ? 'Evil' : 'Good'), make('b', '', medal ? formatTime(spare) : '–'));
  const next = { bronze: 'silver', silver: 'gold' }[medal];
  half.title = !medal ? 'Not delivered as ' + (evil ? 'Evil' : 'Good') + ' yet'
    : medal[0].toUpperCase() + medal.slice(1) + ' medal' + (next ? ': ' + formatTime(medalNeeds(level, evil, next)) + ' to spare for ' + next : '');
  return half;
};
const fact = (name, value) => make('span', 'fact', make('small', '', name), value);

const drawStage = () => {
  const level = cursor, open = isOpen(level), evil = Game.evil && !oneSided(level);
  const list = TABS[tab].list, at = list.indexOf(level);
  const key = level.id + (evil ? '/evil' : '/good'), sameLevel = !!drawn && drawn.split('/')[0] === level.id;
  const shot = (sameLevel && stage.querySelector('.shot')) || make('div', 'shot'); // (the same level drawn again keeps its picture, drifting as it was)
  if (LEVEL_SHOTS[level.id]) shot.style.backgroundImage = `url("${LEVEL_SHOTS[level.id]}")`;
  else shot.classList.add('none'); // (no picture of it yet)
  const plate = make('div', 'plate', make('small', '', kindOf(level)), make('b', '', label(level)));
  const ribbon = make('div', 'ribbon', ...(open ? (oneSided(level) ? [false] : [false, true]).map(side => ribbonHalf(level, side)) : []));
  // what the level needs (a line of its own: a car that floats, the vehicle it is driven in, the level before it)
  const prize = earnedFor(level.id);
  const needs = !open ? 'Locked: deliver level ' + label(list[at - 1]) + ' on time to open it'
    : level.car ? 'Driven in the ' + CAR.name + ': the garage car returns on other levels'
      : level.amphibious ? (CAR.amphibious ? 'Amphibious cars only: you drive your ' + CAR.name
        : 'Needs an amphibious car: get the ' + cheapestAmphibious().name + ' (' + money(cheapestAmphibious().price) + ') in the garage')
        : null;
  // (a special level's 6-star car, and the time to spare that earns it: see cars.js EARNED_CARS)
  const prizeLine = open && prize ? '6-star car: ' + prize.name + (Progress.earned(prize) ? ' (earned)'
    : ', for ' + formatTime(prize.earned.par.good) + (prize.earned.par.evil === undefined ? '' : ' Good and ' + formatTime(prize.earned.par.evil) + ' Evil') + ' to spare') : null;
  const words = level.description?.[evil ? 'evil' : 'good'] || level.description?.good || '';
  const best = Progress.bestTime(level.id, evil);
  const info = make('div', 'info',
    make('h2', '', level.name),
    open && words ? make('p', 'desc', words) : null,
    open ? make('div', 'facts',
      fact('Clock', formatTime(clockFor(level, evil)) + (oneSided(level) ? ' (always Good)' : '')),
      fact('Tip', money(level.tip)),
      fact('Best to spare', best === undefined ? 'Not delivered yet' : formatTime(best))) : null,
    needs ? make('p', 'needs' + (open && !Game.canStart ? ' warn' : ''), needs) : null,
    prizeLine ? make('p', 'prize', prizeLine) : null,
    open && roadCard ? make('button', 'menu-chip road', 'What’s on this road') : null);
  info.querySelector('.road')?.addEventListener('click', () => roadCard(level));
  const arrows = [make('button', 'arrow prev', '‹'), make('button', 'arrow next', '›')];
  arrows[0].disabled = at <= 0;
  arrows[1].disabled = at >= list.length - 1;
  arrows[0].title = 'The level before (left)';
  arrows[1].title = 'The next level (right)';
  arrows[0].addEventListener('click', () => step(-1));
  arrows[1].addEventListener('click', () => step(1));
  stage.replaceChildren(shot, plate, ribbon, info, ...arrows);
  // (a new level slides in; the other side only swaps the words)
  stage.className = 'menu-stage' + (open ? '' : ' locked') + (drawn && !sameLevel ? ' enter' : drawn && drawn !== key ? ' flip' : '');
  drawn = key;
};

// the strip: the levels of the group shown, each a small picture with its number, name and a pip for each side's medal
const drawStrip = (first, last) => {
  const list = TABS[tab].list;
  strip.replaceChildren(...list.slice(first, last).map((level) => {
    const open = isOpen(level);
    const pips = make('span', 'pips', ...(open ? (oneSided(level) ? [false] : [false, true]).map(evil =>
      make('i', (evil ? 'evil ' : 'good ') + (medalFor(level, evil, Progress.bestTime(level.id, evil)) || 'none'))) : []));
    const thumb = make('button', 'thumb' + (level === cursor ? ' current' : '') + (open ? '' : ' locked'),
      make('b', '', label(level)), pips, make('span', 'name', level.name));
    if (LEVEL_SHOTS[level.id]) thumb.style.backgroundImage = `url("${LEVEL_SHOTS[level.id]}")`;
    else thumb.classList.add('none');
    thumb.title = open ? level.name : level.name + ': not open yet';
    thumb.addEventListener('click', () => { if (level !== cursor) blip('menuMove'); show(level); });
    return thumb;
  }));
  // (where the strip is a row to swipe along, the level picked is brought to the middle)
  const current = strip.querySelector('.current');
  if (current && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2, behavior: 'smooth' });
};

// the car: its picture, its name and stars, its figures as bars against the best in the garage; a tap opens the garage
const MOST = { speed: Math.max(...CARS.map(c => c.maxSpeed)), accel: Math.max(...CARS.map(c => c.accel)), health: Math.max(...CARS.map(c => c.health)) };
const bar = (name, value, share) => {
  const fill = make('i');
  fill.style.width = Math.round(Math.max(0.06, Math.min(1, share)) * 100) + '%';
  return make('span', 'stat', make('small', '', name), make('span', 'track', fill), make('b', '', value));
};
const drawCar = () => {
  const evil = Game.evil && !oneSided(cursor);
  const picture = make('span', 'picture');
  const url = CAR_SHOTS[CAR.id + (evil ? '-evil' : '-good')];
  if (url) picture.style.backgroundImage = `url("${url}")`;
  const starSpan = make('span', 'stars', stars(CAR));
  starSpan.style.color = starColour(CAR);
  shop.replaceChildren(picture,
    make('span', 'words',
      make('strong', '', CAR.name + ' ', CAR.tier ? starSpan : null),
      bar('Speed', Math.round(CAR.maxSpeed * 3.6) + ' km/h', CAR.maxSpeed / MOST.speed),
      bar('Accel', String(CAR.accel), CAR.accel / MOST.accel),
      bar('Health', String(CAR.health), CAR.health / MOST.health)),
    make('span', 'go', LEVEL.car ? 'This level’s own vehicle' : 'Garage'));
  shop.title = LEVEL.car ? 'You must use this vehicle on this level. The garage car returns on other levels.' : 'Open the garage to change or buy cars (G)';
};

export const draw = () => {
  // (the level picked may have changed behind the menu's back: a run's Next level, a save brought in. The stage
  // follows it, unless it is showing a level not open yet, which is never the level picked)
  if (isOpen(cursor) && cursor !== LEVEL && LEVELS.includes(LEVEL)) { cursor = LEVEL; tab = tabOf(LEVEL); }
  if (!TABS[tab].list.includes(cursor)) cursor = lastOn[tab] || TABS[tab].list[0];
  lastOn[tab] = cursor;
  const open = isOpen(cursor), evil = Game.evil && !oneSided(cursor);
  bank.replaceChildren(make('small', '', 'Bank'), money(Progress.data.money));
  for (const [name, button] of Object.entries(tabBtns)) button.classList.toggle('current', name === tab);
  startScreen.classList.toggle('races', tab === 'race');
  startScreen.classList.toggle('evil', evil);

  const { list, groups } = TABS[tab], at = list.indexOf(cursor);
  const shown = Math.max(0, groups.findIndex(([a, b]) => at >= a && at < b)), [first, last] = groups[shown];
  groupBox.replaceChildren(...groups.map(([a, b], g) => {
    const button = make('button', (g === shown ? 'current' : '') + (isOpen(list[a]) ? '' : ' locked'), label(list[a]) + (b - a > 1 ? '–' + label(list[b - 1]) : ''));
    button.title = isOpen(list[a]) ? '' : 'Not open yet';
    button.addEventListener('click', () => { if (g !== shown) { blip('menuMove'); show(list[a]); } });
    return button;
  }));
  // (where the groups are a row to swipe along, the one shown is brought into it)
  const chip = groupBox.children[shown];
  if (chip && groupBox.scrollWidth > groupBox.clientWidth) groupBox.scrollTo({ left: chip.offsetLeft - (groupBox.clientWidth - chip.offsetWidth) / 2 });
  drawStage();
  drawStrip(first, last);
  drawCar();

  // the side picked, and what it means
  for (const button of sideBox.querySelectorAll('button')) {
    const on = (button.dataset.side === 'evil') === evil;
    button.classList.toggle('current', on);
    button.setAttribute('aria-pressed', on);
    button.disabled = oneSided(cursor) && button.dataset.side === 'evil';
  }
  sideNote.textContent = oneSided(cursor) ? 'This level is always played as Good.'
    : cursor.noPackages ? (evil ? 'Less time on the clock.' : 'More time on the clock.') // (a race: nothing is thrown)
      : evil ? 'Less time. Flaming packages do real damage, and the police bust you for them.'
        : 'More time. Care packages increase your social standing and gains you benefits.';
  startBtn.disabled = !open;
  startBtn.firstElementChild.textContent = !open ? 'Locked' : tab === 'race' ? 'Race' : 'Start';
};

// ---- the controls ----------------------------------------------------------------------------------------
const tabBtns = { delivery: document.getElementById('tabDelivery'), race: document.getElementById('tabRaces') };
for (const [name, button] of Object.entries(tabBtns)) button.addEventListener('click', () => showTab(name));
for (const button of sideBox.querySelectorAll('button')) button.addEventListener('click', () => pickSide(button.dataset.side === 'evil'));
shop.addEventListener('click', () => { blip('menuPick'); Garage.open(); });
startBtn.addEventListener('click', () => blip('menuPick'));

// the sheets over the menu (the options; the road card): one open at a time, closed by its button, Escape or a
// tap outside it. While one is open Enter must not start a run (Game.inMenu, as the garage)
let sheet = null, onSheetClose = null;
const openSheet = (node, onClose) => {
  closeSheet();
  sheet = node;
  onSheetClose = onClose || null;
  node.classList.remove('hidden');
  Game.inMenu = true;
  blip('menuPick');
};
const closeSheet = () => {
  if (!sheet) return;
  sheet.classList.add('hidden');
  sheet = null;
  Game.inMenu = false;
  onSheetClose?.();
  onSheetClose = null;
};
for (const node of startScreen.querySelectorAll('.menu-sheet')) node.addEventListener('pointerdown', (e) => { if (e.target === node) closeSheet(); });
const options = document.getElementById('menuOptions');
document.getElementById('optionsBtn').addEventListener('click', () => openSheet(options));
document.getElementById('optionsCloseBtn').addEventListener('click', closeSheet);
// (the album, the milestones wall and the save code's panel open over the menu themselves, and the screensavers
// leave it: the options step aside first, ahead of the button's own doing)
for (const id of ['albumBtn', 'milestonesBtn', 'exportBtn', 'importBtn', 'screensaverBtn', 'raceWatchBtn2']) document.getElementById(id).addEventListener('click', closeSheet, true);

// "What's on this road": the level's gimmicks, pickups and traffic, with their models (render/levelcard3d.js,
// brought in only when it is first asked for: it carries the reference pages' models)
const roadBox = document.getElementById('roadCard');
let roadModule = null;
const roadCard = async (level) => {
  roadModule ||= await import('./levelcard3d.js');
  if (sheet === roadBox || !menuUp()) return; // (asked for twice; or a run started while it was on its way)
  openSheet(roadBox, roadModule.showRoadCard(roadBox, level, closeSheet)); // (what it returns lets its renderer go when the sheet closes)
};

// the keys. Heard ahead of the game's own (input.js: Enter is its "confirm", which starts a run), so that Enter
// starts nothing while a level not open yet is on the stage
const menuUp = () => Game.state === 'start' && !startScreen.classList.contains('hidden');
window.addEventListener('keydown', (e) => {
  if (!menuUp() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (sheet) { if (e.code === 'Escape') closeSheet(); return; }
  if (Game.inMenu) return; // (the garage, the album, a save code: theirs)
  if (e.code === 'Enter') {
    const focused = document.activeElement;
    // (a button reached with the keyboard is pressed by Enter, and nothing else happens)
    if (focused && focused !== startBtn && startScreen.contains(focused) && focused.matches('button, a') && focused.matches(':focus-visible')) { e.stopPropagation(); return; }
    e.preventDefault();
    if (!isOpen(cursor)) e.stopPropagation();
    else blip('menuPick');
    return;
  }
  if (e.repeat && !e.code.startsWith('Arrow')) return;
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': step(-1); break;
    case 'ArrowRight': case 'KeyD': step(1); break;
    case 'ArrowUp': stepGroup(-1); break;
    case 'ArrowDown': stepGroup(1); break;
    case 'KeyT': showTab(tab === 'race' ? 'delivery' : 'race'); break;
    case 'KeyE': if (!oneSided(cursor)) pickSide(!Game.evil); break;
    case 'KeyG': Garage.open(); break;
    case 'KeyI': if (roadCard && isOpen(cursor)) roadCard(cursor); break;
    case 'KeyO': openSheet(options); break;
    default: return;
  }
  document.activeElement?.blur?.(); // (so Enter starts the run, not the last button clicked)
}, true);

// touch: a swipe sideways across the stage steps a level
{
  let from = null;
  stage.addEventListener('pointerdown', (e) => { from = e.target.closest('button') ? null : { x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', (e) => {
    if (!from) return;
    const dx = e.clientX - from.x, dy = e.clientY - from.y;
    from = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { from = null; });
}

// the keys, spelled out along the foot of the screen (where there is a keyboard)
document.getElementById('menuKeys').replaceChildren(...[['← →', 'Level'], ['↑ ↓', 'Group'], ['T', 'Tab'], ['E', 'Good / Evil'], ['G', 'Garage'], ['I', 'On this road'], ['O', 'Options'], ['Enter', 'Start']]
  .map(([key, does]) => make('span', '', make('kbd', '', key), does)));

// ---- for a picture (see the top of the file) -------------------------------------------------------------
if (params.get('tab') === 'races') { tab = 'race'; cursor = TABS.race.list[0]; if (!isRace(LEVEL)) { selectLevel(LEVELS.indexOf(cursor)); useLevelCar(cursor.car, cursor.amphibious); } } // (?tab=races: the menu opens on the races, for a check)
if (params.get('side') === 'evil') Game.evil = true; // (not saved)
if (params.get('cursor')) { cursor = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Number(params.get('cursor')) - 1))]; tab = tabOf(cursor); if (isOpen(cursor)) show(cursor); }
if (params.get('options') !== null) openSheet(options);
if (params.get('road') !== null) setTimeout(() => roadCard(cursor), 0); // (once main.js has had its say: ?pick=)
// ?do=key:ArrowRight,key:KeyE,click:%23startBtn,swipe:left ... : the menu worked from the address, one step every
// 150 ms (a key pressed, a button clicked, the stage swiped), to check the controls where nobody can press them
if (params.get('do')) {
  const point = (type, x) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: 200 }));
  params.get('do').split(',').forEach((token, n) => setTimeout(() => {
    const [what, arg] = token.split(':');
    if (what === 'key') document.body.dispatchEvent(new KeyboardEvent('keydown', { code: arg, key: arg.replace(/^Key/, '').toLowerCase(), bubbles: true, cancelable: true }));
    else if (what === 'click') document.querySelector(arg)?.click();
    else if (what === 'swipe') { point('pointerdown', 400); point('pointerup', arg === 'left' ? 250 : 550); }
  }, 150 * (n + 1)));
}

export const MenuStage = {
  // the level picked has changed elsewhere (a run's end, a reset, a save brought in): the stage shows it
  follow() { cursor = LEVEL; tab = LEVELS.includes(LEVEL) ? tabOf(LEVEL) : tab; draw(); },
  closeSheet,
};
