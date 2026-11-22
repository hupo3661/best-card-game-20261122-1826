# ember-court-duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/hupo3661/ember-court-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/hupo3661/ember-court-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Court** — a duel of cards, sigils and nerve. You are the Ember Warden, seated across the table from the Ashen Magistrate. Thirty life each, thirty-card decks, first to 0 loses.

## How to play

- **Play a card:** click it (or press 1–7). It costs ember; ember refills one step higher every round, up to 10.
- **Sigils:** the last card you played sets your sigil — Flame, Tide, Thorn or Stone. A card whose element beats the rival sigil (Flame > Thorn > Tide > Flame; Stone stands apart) deals 50% more damage.
- **Block** absorbs damage. **Heal** mends life. **Draw** finds answers. **Pierce** ignores block.
- **End Turn** (Space) — the Magistrate answers with their own cards, then you draw and refill.
- **Keys:** 1–7 play a card, Space ends the turn, R restarts, M mutes, H shows how to play.

The Magistrate is no dice-roller: it takes lethal when it has it, heals when it is hurting, and spends its ember on the best damage it can buy — so its choices can be read and countered. Eighteen original card designs across the four elements, with a match log, damage floaters and a best-win record kept in your browser.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests: `game/` is plain static files (`index.html`, `style.css`, plus ES modules under `game/src/`).

## Layout

- `game/` — the playable game. `src/world.js` holds the rules (turns, ember, sigils, block, win/loss); `src/cards.js` holds the eighteen designs; `src/ai.js` is the Magistrate's heuristic; `src/render.js` draws the table; `src/shots.js` stages the screenshot scenes; `src/sound.js` synthesizes the sounds with WebAudio.
- `screenshots/` — four real renders of the game's own code: title, mid-duel, victory and defeat.
- `main.ts` — the make.fun hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
