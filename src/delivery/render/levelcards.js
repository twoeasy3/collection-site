// ---- the level cards' extras: best times with their medals, and the level's gimmicks -----------------
// Put on a card by the menu (render/menu.js) once it has made it: across the foot of the picture, the best
// time to spare on each side with the medal it earned (see levelinfo.js); under the words, the gimmicks the
// level has, so a level can be sized up before it is driven.
import '../menus.css';
import { CONFIG } from '../config.js';
import { Progress } from '../progress.js';
import { formatTime } from '../game.js';
import { medalFor, medalNeeds, levelGimmicks } from '../levelinfo.js';

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
};
const NEXT = { bronze: 'silver', silver: 'gold' };

// a side's best: its medal (a disc in the medal's colour) and the time, or nothing if not delivered on it
const best = (level, evil) => {
  const spare = Progress.bestTime(level.id, evil), medal = medalFor(level, evil, spare);
  if (!medal) return null;
  const node = make('span', 'best ' + medal);
  node.append(make('i', 'medal'), (evil ? 'Evil ' : 'Good ') + formatTime(spare));
  const next = NEXT[medal];
  node.title = medal[0].toUpperCase() + medal.slice(1) + ' medal' +
    (next ? ': ' + formatTime(medalNeeds(level, evil, next)) + ' to spare for ' + next : '');
  return node;
};

export const decorateLevelCard = (button, level, open) => {
  if (open) {
    const sides = level.battle || level.alwaysGood ? [false] : [false, true];
    const bests = sides.map(evil => best(level, evil)).filter(Boolean);
    if (bests.length) {
      const strip = make('span', 'bests');
      strip.append(...bests);
      // (on the picture, if the card has one; a card without gets it as a line of its own)
      (button.querySelector('.thumb') || button).append(strip);
    }
  }
  const gimmicks = levelGimmicks(level);
  if (gimmicks.length) {
    const most = CONFIG.medals.gimmicks, row = make('span', 'gimmicks');
    row.append(...gimmicks.slice(0, most).map(name => make('em', '', name)));
    if (gimmicks.length > most) row.append(make('em', 'more', '+ ' + (gimmicks.length - most) + ' more'));
    row.title = gimmicks.join(', ');
    (button.querySelector('.words') || button).append(row);
  }
  return button;
};
