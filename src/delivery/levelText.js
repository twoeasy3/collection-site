// ============================================================================
// THE LEVELS' WORDS - every level's name and its description for each side, in one file to read and edit:
// levelText.json, by level id, in the menu's order:
//   { "<id>": { "name": "...", "description": { "good": "...", "evil": "..." } } }
// Whoever shows a level's name or description asks here (levelName, levelDescription), never the level itself.
// The answer is levelText.json's where it has that level and that field; else the level's own file's ("name",
// "description": the fallback, and where a level not in the file yet keeps them); a level with neither is
// named by its id and has no description. A level that stands by itself (one handed over by the level editor,
// ?edited: see main.js) is asked first: its words are whatever its own JSON says.
// A description is for the side being played: Evil's on Evil, Good's on Good (and Good's where a level has
// only that one: a level that is always Good, the Battlefield).
// ============================================================================
import TEXT from './levelText.json';

const alone = new WeakSet();
// this level's own words come first (the level editor's level): returns it
export const standsAlone = (level) => { if (level && typeof level === 'object') alone.add(level); return level; };

const text = (value) => typeof value === 'string' ? value : '';
const inFile = (level) => (level && TEXT[level.id]) || null;
// the two places a level's words can be, the one asked first first
const places = (level) => alone.has(level) ? [level, inFile(level)] : [inFile(level), level];

// the level's name ('' for no level at all)
export const levelName = (level) => {
  if (!level) return '';
  for (const place of places(level)) if (text(place?.name)) return place.name;
  return text(level.id);
};
// the level's description for the side played (evil: true or false); '' if it has none
export const levelDescription = (level, evil = false) => {
  if (!level) return '';
  const all = places(level).map(place => place?.description).filter(d => d && typeof d === 'object');
  for (const side of evil ? ['evil', 'good'] : ['good']) for (const d of all) if (text(d[side])) return d[side];
  return '';
};
// the level's words as its own file would carry them: { name, description: { good, evil } } (a side only if
// it has one; no description at all if it has neither)
export const levelWords = (level) => {
  const description = {};
  for (const side of ['good', 'evil']) {
    const d = places(level).map(place => text(place?.description?.[side])).find(Boolean);
    if (d) description[side] = d;
  }
  return { name: levelName(level), ...(Object.keys(description).length ? { description } : {}) };
};
// a copy of the level with its words in it, where its own file has them (after its id): what the level editor
// opens, checks and downloads, so that a level's file from there stands by itself
export const withWords = (level) => {
  const { name, description } = levelWords(level), out = {};
  const { name: n, description: d, ...rest } = level;
  for (const [key, value] of Object.entries(rest)) {
    out[key] = value;
    if (key === 'id') { out.name = name; if (description) out.description = description; }
  }
  if (!('name' in out)) { out.name = name; if (description) out.description = description; }
  return out;
};
// every level id the file has words for (scripts/.descriptions-check.mjs)
export const LEVEL_TEXT = TEXT;
