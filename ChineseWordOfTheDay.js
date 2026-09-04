// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: language;

/**
 * Chinese Word of the Day — Scriptable widget
 * ------------------------------------------------------------------
 * Works on the Lock Screen (accessory widgets) and Home Screen.
 * One new word per day, chosen deterministically from the date, so
 * every widget on every device shows the same word all day long.
 *
 * TO ADD YOUR OWN WORDS: just append rows to VOCAB below.
 * Format:  ["汉字", "pīnyīn", "english definition", lessonNumber]
 * The lesson number is optional-ish — use 0 if you don't care.
 * ------------------------------------------------------------------
 */

// ==================================================================
//  VOCABULARY
// ==================================================================
//
//  This list ships EMPTY on purpose — bring your own words.
//  See VOCABULARY.md for a full guide; the short version:
//
//      ["汉字", "pīnyīn", "english definition", lessonNumber]
//        │       │         │                    │
//        │       │         │                    └─ any integer. Words are
//        │       │         │                       grouped by it and the
//        │       │         │                       widget shows a different
//        │       │         │                       group each slot. Use 0
//        │       │         │                       throughout if you don't
//        │       │         │                       want grouping.
//        │       │         └─ shown under the reading. Keep it short-ish;
//        │       │            the Lock Screen trims at ~26 characters.
//        │       └─ tone marks or numbers, whatever you prefer.
//        └─ one or more characters. One or two look best.
//
//  Uncomment these to check it works, then replace them:
//
//      ["你好", "nǐ hǎo", "hello", 1],
//      ["谢谢", "xièxie", "thank you", 1],
//      ["水",   "shuǐ",   "water", 2],
//
//  Nothing else needs changing. The rotation adapts to however many
//  words and however many distinct groups the list contains.
//
const VOCAB = [
  // Add your words here.
];

// ==================================================================
//  SETTINGS
// ==================================================================
const SETTINGS = {
  // ---- How often the word changes --------------------------------
  //   "daily"    a new word at local midnight
  //   "hourly"   a new word on every hour
  //   "onlock"   as often as iOS is willing to redraw the widget
  //              (see frequentMinutes, and the note in SETUP.md —
  //              iOS decides the real cadence, not the script)
  rotation: "daily",
  // Only used by "onlock": the shortest gap between two words.
  frequentMinutes: 15,

  // Change this string to reshuffle the order words appear in.
  shuffleSeed: "word-of-the-day",
  // Show "NPCR · Lesson 7" on the home screen widget.
  showLesson: false,
  // Only show words from these groups (the 4th field of each VOCAB row),
  // e.g. [1, 2, 3]. Leave empty to use everything.
  onlyLessons: [],

  // ---- Look & feel -------------------------------------------------
  // Overall type size. 1 is the default; try 1.15 or 0.9 to taste.
  // Everything scales together, so one number tunes the whole widget.
  scale: 1,
  // What sits between the character and the pinyin.
  // Try " – " (en dash), " · " (middot), or "  " for nothing.
  separator: " - ",
  // Lock Screen: draw a soft rounded panel behind the text.
  // false = no panel at all, text floats straight on the wallpaper
  // (cleaner, but harder to read over a busy photo).
  //   "drawn"   our own rounded panel (soft corners, tunable)
  //   "system"  iOS's built-in accessory background — squarer corners,
  //             but guaranteed to show up whatever the wallpaper
  //   "none"    text straight on the wallpaper
  panelStyle: "drawn",
  //   "columns"  character on the left at full height, reading and gloss
  //              stacked beside it — much larger character
  //   "stacked"  character and pinyin on one line joined by `separator`,
  //              gloss underneath — smaller, but keeps the dash
  lockLayout: "columns",
  // How visible the drawn panel is, 0 (invisible) to 1 (solid).
  // Lock-screen widgets are rendered in iOS's "vibrant" mode, which
  // washes fills out badly — this needs to be far higher than it sounds.
  panelOpacity: 0.55,
  // Panel fill. White lifts the text off a dark wallpaper; try "#000000"
  // if yours is light and the characters need darkening instead.
  panelColor: "#FFFFFF",
  // Corner rounding of the panel, in points.
  panelRadius: 20,

  // Fonts. These are all built into iOS. If a name isn't found the
  // script quietly falls back to the system font, so it can't break.
  // Try "Baskerville", "Hoefler Text" or "Georgia" for a softer serif.
  serif: "Didot",
  serifItalic: "Didot-Italic",
  // Serif Chinese face. "PingFangSC-Regular" is the clean sans default.
  hanziFont: "STSongti-SC-Bold",

  // Home Screen colours (Lock Screen is always tinted by iOS).
  accentLight: "#8A6A5C",
  accentDark: "#D8B9A6",
  bgLight: "#FAF7F2",
  bgDark: "#131416",
  inkLight: "#1B1A18",
  inkDark: "#EFEAE3",
};

// ==================================================================
//  ROTATION  —  deterministic, one word per day
// ==================================================================

/** The vocabulary actually in play, after any lesson filter. */
function activeVocab() {
  if (!SETTINGS.onlyLessons || SETTINGS.onlyLessons.length === 0) return VOCAB;
  const keep = new Set(SETTINGS.onlyLessons);
  const filtered = VOCAB.filter((row) => keep.has(row[3]));
  return filtered.length > 0 ? filtered : VOCAB;
}

const ROTATION_MODES = ["daily", "hourly", "frequent"];
const ROTATION_ALIASES = {
  onlock: "frequent",
  "on-lock": "frequent",
  unlock: "frequent",
  often: "frequent",
  day: "daily",
  hour: "hourly",
};

/** Normalised rotation mode; anything unrecognised falls back to daily. */
function rotationMode() {
  const raw = String(SETTINGS.rotation || "daily").trim().toLowerCase();
  const mode = ROTATION_ALIASES[raw] || raw;
  return ROTATION_MODES.indexOf(mode) >= 0 ? mode : "daily";
}

function frequentMinutes() {
  const m = Number(SETTINGS.frequentMinutes);
  return Number.isFinite(m) && m >= 1 ? Math.floor(m) : 15;
}

/** Whole days since the Unix epoch, ticking over at LOCAL midnight. */
function localDayNumber(date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
}

/**
 * Which slot of time we're in. Everything the widget shows is derived
 * from this one integer, so two devices in the same timezone always
 * agree, and nothing has to be stored between refreshes.
 */
function bucketNumber(date) {
  const mode = rotationMode();
  if (mode === "hourly") {
    return Math.floor(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours()
      ) / 3600000
    );
  }
  if (mode === "frequent") {
    return Math.floor(date.getTime() / (frequentMinutes() * 60000));
  }
  return localDayNumber(date);
}

/** When to ask iOS to redraw — the start of the next slot. */
function nextRefresh(date) {
  const mode = rotationMode();
  const d = date || new Date();
  if (mode === "hourly") {
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours() + 1,
      0,
      5
    );
  }
  if (mode === "frequent") {
    return new Date(d.getTime() + frequentMinutes() * 60000);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 1, 0);
}

/** Small deterministic PRNG so the shuffle is identical everywhere. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * A fixed pseudo-random permutation of the vocabulary.
 * Same seed + same list length => same order, forever, on every device.
 * Guarantees every word appears once before any word repeats.
 */
function shuffledOrder(length, seed) {
  const rand = mulberry32(hashString(seed + ":" + length));
  const idx = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/**
 * Pick the word for a moment in time, in two steps.
 *
 *   1. Choose the LESSON. Lessons come in a fixed shuffled order and
 *      every lesson appears once before any of them comes round again,
 *      so consecutive slots are always different lessons.
 *   2. Choose a word from inside that lesson. Each time we come back to
 *      a lesson we advance one place through its own shuffled order, so
 *      you work through the whole lesson before hearing any of it twice.
 *
 * With one lesson in play (onlyLessons: [3]) step 1 collapses and this
 * just walks that lesson's words one per slot, which is what you'd want.
 */
function wordForDate(date) {
  const list = activeVocab();
  if (list.length === 0) return null;

  const bucket = bucketNumber(date || new Date());

  const lessons = Array.from(new Set(list.map((r) => r[3]))).sort(
    (a, b) => a - b
  );
  const nL = lessons.length;
  const lessonOrder = shuffledOrder(nL, SETTINGS.shuffleSeed + "::lessons");
  const lessonPos = ((bucket % nL) + nL) % nL;
  const lesson = lessons[lessonOrder[lessonPos]];

  const words = list.filter((r) => r[3] === lesson);
  const nW = words.length;
  const visit = Math.floor(bucket / nL); // how many times we've been here
  const wordOrder = shuffledOrder(nW, SETTINGS.shuffleSeed + "::L" + lesson);
  const wordPos = ((visit % nW) + nW) % nW;

  const row = words[wordOrder[wordPos]];
  return { hanzi: row[0], pinyin: row[1], meaning: row[2], lesson: row[3] };
}

// ==================================================================
//  TYPE & COLOUR HELPERS
// ==================================================================

/** Apply the global size multiplier, clamped to something sensible. */
function sz(base) {
  const raw = Number(SETTINGS.scale);
  const s = Number.isFinite(raw) && raw > 0 ? Math.min(Math.max(raw, 0.5), 2) : 1;
  return Math.max(6, Math.round(base * s));
}

/** The dash (or whatever) between character and pinyin. */
function separator() {
  const s = SETTINGS.separator;
  return typeof s === "string" && s.length > 0 ? s : " - ";
}

/** A named iOS font, falling back to the system font if unavailable. */
function namedFont(name, size, fallback) {
  try {
    const f = new Font(name, size);
    if (f) return f;
  } catch (e) {
    // Font not installed on this device — fall through.
  }
  return fallback || Font.systemFont(size);
}

function serifFont(size) {
  return namedFont(SETTINGS.serif, size, Font.systemFont(size));
}

function serifItalicFont(size) {
  return namedFont(SETTINGS.serifItalic, size, Font.italicSystemFont(size));
}

function hanziFont(size) {
  return namedFont(SETTINGS.hanziFont, size, Font.boldSystemFont(size));
}

/** Hair-space between characters, for the airy letterpress look. */
function tracked(str) {
  return str.length > 1 ? str.split("").join(" ") : str;
}

function accent() {
  return Color.dynamic(
    new Color(SETTINGS.accentLight),
    new Color(SETTINGS.accentDark)
  );
}

function ink() {
  return Color.dynamic(
    new Color(SETTINGS.inkLight),
    new Color(SETTINGS.inkDark)
  );
}

function inkSoft() {
  return Color.dynamic(
    new Color(SETTINGS.inkLight, 0.62),
    new Color(SETTINGS.inkDark, 0.62)
  );
}

/** Trim a definition down to something that fits a tiny lock-screen slot. */
function shortMeaning(meaning, maxChars) {
  let s = String(meaning).split(/[;(]/)[0].trim();
  if (s.length <= maxChars) return s;
  const parts = s.split(",");
  let out = parts[0].trim();
  for (let i = 1; i < parts.length; i++) {
    const next = out + "," + parts[i];
    if (next.trim().length > maxChars) break;
    out = next;
  }
  out = out.trim();
  if (out.length > maxChars) out = out.slice(0, maxChars - 1).trim() + "…";
  return out;
}

/**
 * A soft rounded panel, drawn as an image and used as the widget
 * background. This replaces iOS's hard-edged accessory box, which has
 * square-ish corners and no inset.
 */
function roundedPanel(width, height, radius, opacity) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const hex = /^#[0-9A-Fa-f]{6}$/.test(String(SETTINGS.panelColor))
    ? SETTINGS.panelColor
    : "#FFFFFF";
  const a = Number(opacity);
  ctx.setFillColor(new Color(hex, Number.isFinite(a) ? Math.min(Math.max(a, 0), 1) : 0.38));
  const path = new Path();
  path.addRoundedRect(new Rect(0, 0, width, height), radius, radius);
  ctx.addPath(path);
  ctx.fillPath();
  return ctx.getImage();
}

/** A hairline rule, used as a divider under the headword. */
function addRule(stack, width, color) {
  const rule = stack.addStack();
  rule.size = new Size(width, 1);
  rule.backgroundColor = color;
  return rule;
}

// ==================================================================
//  WIDGET LAYOUTS
// ==================================================================

function buildInline(w, word) {
  w.addText(
    `${word.hanzi}${separator()}${word.pinyin} · ${shortMeaning(word.meaning, 20)}`
  );
}

function buildCircular(w, word) {
  w.addSpacer();
  const t = w.addText(word.hanzi.slice(0, 2));
  t.font = hanziFont(sz(word.hanzi.length > 1 ? 26 : 40));
  t.centerAlignText();
  t.minimumScaleFactor = 0.4;
  w.addSpacer();
}

/** Character size for the lock screen, by how many characters there are. */
function lockHanziSize(n) {
  if (n <= 1) return 50;
  if (n === 2) return 42;
  if (n === 3) return 29;
  return 22;
}

/**
 * Lock Screen, two columns (default).
 *
 * Stacking the character above the gloss meant both shared 72pt of
 * height, which capped the character at about 38pt. Giving it its own
 * column lets it use the full height — 42pt for a two-character word,
 * 50pt for a single one — while the pinyin and gloss stack in the space
 * to its right, which was empty before. No dash: the columns separate
 * them already.
 */
function buildRectangularColumns(w, word) {
  w.setPadding(2, 7, 2, 5);

  const row = w.addStack();
  row.centerAlignContent();

  const han = row.addText(word.hanzi);
  han.font = hanziFont(sz(lockHanziSize(word.hanzi.length)));
  han.lineLimit = 1;
  han.minimumScaleFactor = 0.4;

  row.addSpacer(8);

  const col = row.addStack();
  col.layoutVertically();

  const py = col.addText(word.pinyin);
  py.font = serifItalicFont(sz(16));
  py.lineLimit = 1;
  py.minimumScaleFactor = 0.4;

  col.addSpacer(2);

  const def = col.addText(shortMeaning(word.meaning, 26));
  def.font = serifFont(sz(14));
  def.lineLimit = 2;
  def.minimumScaleFactor = 0.5;

  row.addSpacer();
}

/**
 * Lock Screen, stacked — the earlier arrangement, kept because it is the
 * one with the dash. Smaller character: it shares the height with the
 * gloss, so it tops out around 38pt.
 */
function buildRectangularStacked(w, word) {
  w.setPadding(3, 6, 3, 6);
  w.addSpacer();

  const row = w.addStack();
  row.centerAlignContent();
  row.addSpacer();

  const long = word.hanzi.length > 2;
  const FLOOR = 0.42;

  const han = row.addText(word.hanzi);
  han.font = hanziFont(sz(long ? 28 : 38));
  han.lineLimit = 1;
  han.minimumScaleFactor = FLOOR;

  const dash = row.addText(separator());
  dash.font = serifFont(sz(long ? 14 : 16));
  dash.lineLimit = 1;
  dash.minimumScaleFactor = FLOOR;

  const py = row.addText(word.pinyin);
  py.font = serifItalicFont(sz(long ? 15 : 16));
  py.lineLimit = 1;
  py.minimumScaleFactor = FLOOR;

  row.addSpacer();
  w.addSpacer(1);

  const def = w.addText(shortMeaning(word.meaning, 22));
  def.font = serifFont(sz(15));
  def.centerAlignText();
  def.lineLimit = 1;
  def.minimumScaleFactor = FLOOR;

  w.addSpacer();
}

function buildRectangular(w, word) {
  const mode = String(SETTINGS.lockLayout || "columns").toLowerCase();
  if (mode === "stacked" || mode === "inline" || mode === "rows") {
    buildRectangularStacked(w, word);
  } else {
    buildRectangularColumns(w, word);
  }
}

/**
 * Home Screen small (~155x155pt).
 *
 * Square, so this one stays stacked. Sizes are set by the HEIGHT budget:
 * ask for more vertical space than the widget has and iOS shrinks every
 * line in it, which is how a 54pt character ended up rendering at ~25pt.
 */
function buildSmall(w, word) {
  w.setPadding(12, 12, 12, 12);
  w.addSpacer();

  const han = w.addText(tracked(word.hanzi));
  han.font = hanziFont(sz(word.hanzi.length > 2 ? 30 : 48));
  han.textColor = ink();
  han.centerAlignText();
  han.lineLimit = 1;
  han.minimumScaleFactor = 0.4;

  w.addSpacer(6);

  const py = w.addText(word.pinyin);
  py.font = serifItalicFont(sz(15));
  py.textColor = accent();
  py.centerAlignText();
  py.lineLimit = 1;
  py.minimumScaleFactor = 0.5;

  w.addSpacer(5);

  const ruleRow = w.addStack();
  ruleRow.addSpacer();
  addRule(ruleRow, 24, inkSoft());
  ruleRow.addSpacer();

  w.addSpacer(5);

  const def = w.addText(shortMeaning(word.meaning, 40));
  def.font = serifFont(sz(12));
  def.textColor = inkSoft();
  def.centerAlignText();
  def.lineLimit = 2;
  def.minimumScaleFactor = 0.6;

  w.addSpacer();
}

/**
 * Home Screen medium (~329x155pt).
 *
 * Wide and short, so it goes two-column like the lock screen. Stacked,
 * the character had to share 131pt of height with three other lines and
 * capped out around 44pt; in its own column it owns the full height and
 * runs to 72pt, with the reading and gloss filling the width beside it.
 */
function buildMedium(w, word) {
  w.setPadding(14, 20, 14, 20);

  const row = w.addStack();
  row.centerAlignContent();

  const n = word.hanzi.length;
  const hs = n <= 1 ? 84 : n === 2 ? 72 : n === 3 ? 48 : 36;

  const han = row.addText(word.hanzi);
  han.font = hanziFont(sz(hs));
  han.textColor = ink();
  han.lineLimit = 1;
  han.minimumScaleFactor = 0.4;

  row.addSpacer(18);

  const col = row.addStack();
  col.layoutVertically();

  const py = col.addText(word.pinyin);
  py.font = serifItalicFont(sz(20));
  py.textColor = accent();
  py.lineLimit = 1;
  py.minimumScaleFactor = 0.5;

  col.addSpacer(6);
  addRule(col, 30, inkSoft());
  col.addSpacer(6);

  const def = col.addText(word.meaning);
  def.font = serifFont(sz(15));
  def.textColor = inkSoft();
  def.lineLimit = 2;
  def.minimumScaleFactor = 0.6;

  if (SETTINGS.showLesson && word.lesson) {
    col.addSpacer(5);
    const tag = col.addText(tracked(`Lesson ${word.lesson}`).toUpperCase());
    tag.font = serifFont(sz(9));
    tag.textColor = Color.dynamic(
      new Color(SETTINGS.inkLight, 0.38),
      new Color(SETTINGS.inkDark, 0.38)
    );
    tag.lineLimit = 1;
  }

  row.addSpacer();
}

/**
 * Shown when VOCAB is empty. This is the out-of-the-box state, so it
 * should read as an instruction rather than an error.
 */
function buildEmptyState(w, family) {
  const accessory = String(family || "").startsWith("accessory");

  if (family === "accessoryInline") {
    w.addText("Add words to VOCAB");
    return;
  }

  if (family === "accessoryCircular") {
    w.addSpacer();
    const t = w.addText("字");
    t.font = hanziFont(sz(28));
    t.centerAlignText();
    w.addSpacer();
    return;
  }

  w.setPadding(8, 12, 8, 12);
  w.addSpacer();

  const title = w.addText("字");
  title.font = hanziFont(sz(accessory ? 22 : 34));
  title.centerAlignText();
  if (!accessory) title.textColor = ink();

  w.addSpacer(accessory ? 2 : 6);

  const hint = w.addText("Add words to VOCAB");
  hint.font = serifItalicFont(sz(accessory ? 12 : 14));
  hint.centerAlignText();
  hint.lineLimit = 1;
  hint.minimumScaleFactor = 0.5;
  if (!accessory) hint.textColor = accent();

  if (!accessory) {
    w.addSpacer(5);
    const sub = w.addText("see VOCABULARY.md");
    sub.font = serifFont(sz(11));
    sub.textColor = inkSoft();
    sub.centerAlignText();
    sub.lineLimit = 1;
  }

  w.addSpacer();
}

// ==================================================================
//  MAIN
// ==================================================================

function createWidget(family) {
  const word = wordForDate(new Date());
  const w = new ListWidget();
  w.refreshAfterDate = nextRefresh(new Date());

  const isAccessory = String(family || "").startsWith("accessory");

  if (isAccessory) {
    // Lock Screen. iOS renders these in "vibrant" mode: colour is thrown
    // away and fills are washed out, so a subtle panel simply vanishes.
    const style = String(SETTINGS.panelStyle || "drawn").toLowerCase();
    const wantsPanel = style !== "none" && SETTINGS.lockScreenPanel !== false;

    if (wantsPanel && family !== "accessoryInline") {
      if (style === "system") {
        try {
          w.addAccessoryWidgetBackground = true;
        } catch (e) {
          // Older Scriptable — no background available.
        }
      } else {
        const circular = family === "accessoryCircular";
        const pw = circular ? 76 : 160;
        const ph = circular ? 76 : 72;
        const pr = circular ? 38 : SETTINGS.panelRadius;
        try {
          w.backgroundImage = roundedPanel(pw, ph, pr, SETTINGS.panelOpacity);
        } catch (e) {
          try {
            w.addAccessoryWidgetBackground = true;
          } catch (e2) {
            // Neither available; plain text on the wallpaper is fine.
          }
        }
      }
    }
  } else {
    w.backgroundColor = Color.dynamic(
      new Color(SETTINGS.bgLight),
      new Color(SETTINGS.bgDark)
    );
  }

  if (!word) {
    buildEmptyState(w, family);
    return w;
  }

  switch (family) {
    case "accessoryInline":
      buildInline(w, word);
      break;
    case "accessoryCircular":
      buildCircular(w, word);
      break;
    case "accessoryRectangular":
      buildRectangular(w, word);
      break;
    case "small":
      buildSmall(w, word);
      break;
    default:
      buildMedium(w, word);
      break;
  }

  return w;
}

const family = config.widgetFamily || "medium";
const widget = createWidget(family);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Running inside the Scriptable app — show a preview.
  const word = wordForDate(new Date());
  console.log(`Now: ${word.hanzi}  ${word.pinyin}  —  ${word.meaning}`);
  console.log(`From Lesson ${word.lesson}`);
  console.log(`Rotation: ${rotationMode()}, next change ${nextRefresh(new Date())}`);
  console.log(`Vocabulary size: ${activeVocab().length} words`);
  await widget.presentMedium();
}

Script.complete();
