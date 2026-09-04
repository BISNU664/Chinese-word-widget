# Chinese Word of the Day

A Lock Screen and Home Screen widget for iPhone that shows one Chinese word at
a time — character, pinyin, and English gloss. Written in JavaScript for
[Scriptable](https://scriptable.app), so it needs **no Mac, no Xcode, and no
Apple Developer account**.

**Bring your own words.** The widget ships with an empty list and a short guide
for filling it — see **[VOCABULARY.md](VOCABULARY.md)**. Three lines is enough
to get going.

<!--
  Drop a screenshot in docs/ and reference it here, e.g.
  ![Lock screen](docs/lockscreen.png)
-->

There is a rough visual mock-up of the layouts in
[`docs/preview.html`](docs/preview.html) — open it in any browser.

---

## Why Scriptable

A native lock-screen widget means WidgetKit and Swift, which means Xcode, which
is macOS-only. A free Apple developer account also expires every seven days, so
you'd be reinstalling constantly.

Scriptable renders real WidgetKit accessory widgets from a JavaScript file. One
file, no build step, no server, no network access — and it works if your only
computer runs Windows or Linux.

## Install

1. Install **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)**
   from the App Store. That's the only dependency.
2. Get `ChineseWordOfTheDay.js` onto the phone — email it to yourself and open
   it with Scriptable, or drop it in `iCloud Drive/Scriptable/`.
3. Open Scriptable and tap the script once to confirm it runs. With no words
   added yet it will say *Add words to VOCAB* — that's the expected first run.
4. Add some words, following **[VOCABULARY.md](VOCABULARY.md)**.

**Lock Screen:** long-press the Lock Screen → *Customise* → tap the widget area
under the clock → **Scriptable** → the rectangular shape → tap it and choose
this script.

**Home Screen:** long-press → `+` → **Scriptable** → *Medium* → same.

## How it picks a word

Everything derives from a single integer — the current time slot — so no state
is stored anywhere and every widget on every device agrees.

```
slot ──► group  (slot mod g, into a seeded shuffle of the g groups)
     └─► word   (slot ÷ g, into a seeded shuffle of that group's words)
```

Each slot lands on a **different group** — the fourth field of each word — and
every group comes up once before any repeats. Each time a group comes round
again it advances one place through its own word order, so you finish a group
before hearing any of it twice. Change `shuffleSeed` and both orders change
together. Put `0` on every word and this step collapses harmlessly into a plain
walk through the list.

How long a slot lasts is up to you:

| `rotation` | Behaviour |
|---|---|
| `"daily"` | New word at local midnight. |
| `"hourly"` | New word on the hour. |
| `"onlock"` | As often as iOS is willing to redraw — see below. |

### On `"onlock"`

iOS gives no event a widget can hook when you unlock the phone, and widgets
can't refresh on demand. WidgetKit hands each widget a budget of roughly 40–70
redraws a day and spends them when it chooses.

So `"onlock"` derives the word from the clock rather than the date and asks for
a redraw every `frequentMinutes`. In practice that's a new word every 15–30
minutes while you're using the phone, and stillness overnight. Setting
`frequentMinutes` below ~15 backfires: you exhaust the budget early and it
updates *less* later in the day.

## Settings

All at the top of the file.

| Setting | Default | What it does |
|---|---|---|
| `rotation` | `"daily"` | `"daily"`, `"hourly"` or `"onlock"`. |
| `frequentMinutes` | `15` | Shortest gap between words in `"onlock"` mode. |
| `onlyLessons` | `[]` | Restrict to certain groups, e.g. `[1, 2, 3]`. A single group just walks that group's words. |
| `shuffleSeed` | `"word-of-the-day"` | Reshuffles group order and word order together. |
| `scale` | `1` | Global type size, clamped to 0.5–2. |
| `lockLayout` | `"columns"` | `"columns"` for the largest character, or `"stacked"` for a single line joined by `separator`. |
| `separator` | `" - "` | Used by the stacked and inline layouts. |
| `panelStyle` | `"drawn"` | `"drawn"` (soft rounded panel), `"system"` (iOS's own, always visible), `"none"`. |
| `panelOpacity` | `0.55` | Visibility of the drawn panel, 0–1. |
| `panelColor` | `"#FFFFFF"` | Use `"#000000"` on a light wallpaper. |
| `panelRadius` | `20` | Corner rounding, in points. |
| `showLesson` | `false` | Adds a group label to the Home Screen widget. |
| `serif` / `hanziFont` | `"Didot"` / `"STSongti-SC-Bold"` | Any font missing on the device falls back to the system one. |
| `accentLight` / `accentDark` | — | Pinyin colour on the Home Screen. |

## Adding vocabulary

Find `const VOCAB = [` near the top of the file and add rows:

```js
["你好", "nǐ hǎo", "hello", 1],
["水",   "shuǐ",   "water", 2],
```

`["汉字", "pīnyīn", "english definition", groupNumber]`. Use `0` for the group
throughout if you don't want grouping. Nothing else needs changing — the
rotation adapts to the list's length and to however many distinct groups it
contains.

**[VOCABULARY.md](VOCABULARY.md)** covers the format properly: what the group
number does, how to study a subset, where to get wordlists, and how definitions
get trimmed on the Lock Screen.

If you already have a spreadsheet of words, the converter turns it into rows
you can paste straight in:

```bash
node tools/csv-to-vocab.mjs mywords.csv
```

Keep a personal list out of version control by naming it something matching
`*.private.js` — `.gitignore` already covers that.

## Two layout gotchas worth knowing

Both cost me several rounds, and neither announces itself.

**Width.** If a line is wider than its slot, iOS scales that line down. Pinyin
is the usual culprit — *xiāngjiāopíngguǒ* is seventeen letters against three
characters — so the pinyin is deliberately kept well below the character size.

**Height.** If the content stack is *taller* than the widget, iOS shrinks
**every line in the widget**, not just the offending one. This is the nastier
failure: nothing looks broken, everything is just quietly small. A 52pt
character was landing at roughly 25pt because the stack asked for 146pt of
space inside 127pt.

The fix for both was two columns rather than two rows. Stacked, the character
shares the widget's height with the reading and the gloss and tops out near
38pt; in its own column it owns the full height and runs to 50pt on the Lock
Screen, 84pt on the Home Screen.

A third, smaller one: Lock Screen widgets render in iOS's *vibrant* mode, which
discards colour and washes fills out. Background opacity has to be far higher
than it looks like it should be — 0.55, where 0.16 was invisible.

## Repository layout

```
ChineseWordOfTheDay.js   the widget — one self-contained file
VOCABULARY.md            how to add and structure words
tools/csv-to-vocab.mjs   converts a CSV/TSV wordlist into VOCAB rows
docs/preview.html        rough visual mock-up of the layouts
```



No vocabulary data ships with this project, so nothing here is derived from any
dictionary or textbook — the word list is yours to supply. If you publish a
fork with your own list in it, [VOCABULARY.md](VOCABULARY.md#copying-from-a-copyrighted-book)
has a note on where the line sits.
