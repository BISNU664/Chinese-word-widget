# Adding vocabulary

The widget ships with an empty word list. Everything else works out of the
box — you just need to give it words.

## The format

Open `ChineseWordOfTheDay.js` and find `const VOCAB = [` near the top. Each
word is one line, four fields:

```js
["汉字", "pīnyīn", "english definition", lessonNumber]
```

| Field | Notes |
|---|---|
| **characters** | One or more. One or two look best — four-character compounds have to shrink to fit the Lock Screen. |
| **reading** | Tone marks (`nǐ hǎo`) or numbers (`ni3 hao3`), whichever you prefer. It's only ever displayed, never parsed. |
| **definition** | Shown beneath the reading. The Lock Screen trims at about 26 characters, cutting at the first `;` or `(` where it can. |
| **group** | Any integer — see [Grouping](#grouping) below. Use `0` throughout if you don't want it. |

## Smallest thing that works

```js
const VOCAB = [
  ["你好", "nǐ hǎo", "hello", 0],
  ["谢谢", "xièxie", "thank you", 0],
  ["水",   "shuǐ",   "water", 0],
];
```

Save, and the widget starts showing those three. Nothing else needs changing —
the rotation adapts to the list's length automatically.

## Grouping

The fourth field is what the code calls the *lesson*, but it's really just a
group number, and it controls the order words appear in:

1. Each slot picks a **different group** — groups run in a fixed shuffled
   order, and every group comes up once before any repeats.
2. Within the chosen group, it advances one word each time that group comes
   round again.

So with words in groups 1–14, you'd see one word from group 1, then one from
group 7, then one from group 6, and so on — never the same group twice in a
row, and you work through a whole group before hearing any of it twice.

Use it for textbook lessons, HSK levels, topics (`1` = food, `2` = travel), or
whatever suits. **Put `0` on everything** and the grouping step collapses
harmlessly — the widget just walks your whole list one word at a time.

### Studying a subset

```js
onlyLessons: [1, 2, 3],
```

Restricts the widget to those groups. Set it to a single group and it simply
cycles that group's words. Handy for drilling the chapter you're actually on;
bump it as you go.

## Building a bigger list

**From your own textbook.** Type the words in as you meet them — a few lines
per lesson as you go is much less work than transcribing a whole book, and you
end up with exactly the words you're being taught.

**From a wordlist you already have.** If it's a spreadsheet or CSV, the
converter in `tools/` will turn it into rows you can paste in:

```bash
node tools/csv-to-vocab.mjs mywords.csv >> vocab-block.txt
```

It expects `characters,reading,definition,group` per line and skips a header
row if it sees one. Full usage in the file's own comments.

**From an app you already use.** Pleco, Anki and Skritter all export CSV or
TSV; reorder the columns to match and run them through the converter.

**Word frequency lists.** Plenty of public-domain and openly licensed Chinese
frequency lists exist if you'd rather learn by commonness than by chapter.
[CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) is a
free, CC-BY-SA licensed dictionary you can build definitions from.

## Practical tips

- **Keep definitions short.** "to know somebody" reads well; "to know, to be
  acquainted with (a person, as distinct from a fact)" gets trimmed to
  "to know" on the Lock Screen. Put the nuance first.
- **Use `;` to separate senses.** The Lock Screen cuts at the first semicolon,
  so `"number; day of the month"` shows as "number" there and in full on the
  Home Screen.
- **Duplicate characters are allowed** but pointless — the same entry will just
  come up twice. If a word has two senses, merge them into one definition.
- **Longer lists don't slow anything down.** The list is scanned once per
  render; a few thousand entries is nothing.
- **How long until it repeats:** with *n* words spread over *g* groups, the
  longest group determines the cycle. A list of 400 words over 14 groups where
  the biggest group has 46 words takes 14 × 46 = 644 slots to show everything.

## Copying from a copyrighted book

Individual words, readings and short dictionary definitions are facts, and
facts aren't copyrightable. A complete transcription of a particular textbook's
vocabulary tables — its selection, its groupings, its specific wording — is a
different matter, and is the publisher's work.

For a private list on your own phone this is a non-issue. If you're publishing
your fork, either write your own definitions, use an openly licensed dictionary
like CC-CEDICT, or keep the list out of the repo. `.gitignore` already excludes
anything matching `*.private.js`, so a personal list can sit beside the script
without being committed.
