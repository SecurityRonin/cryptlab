# CryptLab — Crack Classical Ciphers Yourself

[![Netlify Status](https://api.netlify.com/api/v1/badges/7f1ea58b-8a32-4245-8e70-195a7dd21765/deploy-status)](https://app.netlify.com/sites/securityronin-cryptlab/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-♥-ea4aaa?logo=github)](https://github.com/sponsors/h4x0r)

**Make a cipher, then break one — the 1,200-year duel of codemakers and codebreakers, hands-on in your browser.**

[**Live Demo →**](https://securityronin-cryptlab.netlify.app)

---

## What Is This?

CryptLab is a two-panel teaching tool for the classical era of cryptography. **Encipher** with a Caesar or Vigenère cipher and watch the cipher wheel turn; **Break** a real substitution cipher by dragging English letters onto a frequency histogram — the same 9th-century technique Al-Kindi invented and that cost Mary, Queen of Scots her head — until the plaintext emerges.

The challenges are deliberately graded by **length**, because that is the variable that decides whether cryptanalysis works at all. Start on an 800-letter passage and the statistics carry you; drop to a 25-letter field signal and the same tools collapse. That is the argument for **harvest now, decrypt later** — and the reason a message you send today is a bet on how long your cipher survives.

It's built for the classroom: the tools are front and centre, the theory hides behind expandable ▸ sections, and everything runs on a phone with no app and no signup.

## Features

### Encipher
- **Caesar cipher** with a live rotating cipher wheel and adjustable shift
- **Vigenère cipher** with a keyword — polyalphabetic, the cipher that resisted frequency analysis for 300 years
- Expandable notes: how the Caesar cipher works, Kerckhoffs's Principle, why Vigenère held

### Break — substitution solver
- **Drag to assign.** Drag an English letter from the frequency reference row onto a ciphertext bar. Drag a placed letter to another bar to move or swap it; drag it off the board and it vanishes in a puff. Works with mouse, touch and keyboard — one Pointer Events path, no HTML5 drag-and-drop.
- **Bijective by construction.** A letter is a token that exists in exactly one place, so the same plaintext letter cannot be assigned twice. The invalid state is unreachable rather than corrected after the fact.
- **20 challenges across four length bands** — 3 long (~700–800 letters), 5 medium (~310–370), 8 short (~37–130) and 4 very short (~25–32), so the *same* method visibly succeeds at the top of the list and fails at the bottom.
- **Two tools, in the order codebreakers actually reached for them:**
  - **Tool 1 — single letters.** Rank the counts against English. Scores itself against the answer key.
  - **Tool 2 — letter pairs.** Unlocks once Tool 1 stalls. Scores your decryption on bigram statistics, offers draggable **two-letter suggestion blocks** (`GR → th`) that place both letters at once, and hill-climbs with random restarts toward a better fit.
- **Human in the loop.** Anything you place by hand is **pinned** (gold dot) and the pair search will not move it. Read the output, drag a correction, run it again — the Crypt Breaker's Workbench loop.
- A guided walkthrough that adapts to the challenge you picked, plus expandable history: Al-Kindi, Mary Queen of Scots, the Zimmermann Telegram, CBW, and harvest-now-decrypt-later under Shor's algorithm.

### What the lab actually demonstrates

Measured across all 20 challenges (`tests/measure.spec.js` regenerates these):

| Band | Letters | Tool 1 — single letters | Tool 2 — letter pairs |
|---|---|---|---|
| Long | 697–812 | 21–29% | 92–100% |
| Medium | 313–371 | 17–39% | 83–100% |
| Short | 37–127 | 5–33% | 0–61% |
| Very short | 25–32 | 0–15% | 0–20% |

Two findings worth the lesson. **Counting single letters never solves anything** — not even an 800-letter passage — which is why the second tool has to exist. And on the very short messages the pair search reports a **pair-fit of 100 out of 100 while getting nearly every letter wrong**: with that few pairs, many mappings fit the statistics equally well, so the tool is maximally confident and useless. Read the plaintext, not the score.

### Security Hardened
- Content Security Policy, X-Frame-Options, X-Content-Type-Options via Netlify `_headers`
- No external dependencies — zero JavaScript libraries, pure vanilla HTML/CSS/JS

## Tech Stack

- **Frontend:** Single `web/index.html` — vanilla HTML/CSS/JS, no build step, no frameworks
- **Testing:** [Playwright](https://playwright.dev/) end-to-end tests, including the pointer-drag mechanics and a 390×844 touch viewport. `tests/measure.spec.js` is a measurement harness, not an assertion suite — it prints the Tool 1 vs Tool 2 table above so the teaching copy quotes observed numbers.
- **Hosting:** [Netlify](https://www.netlify.com/) (static deploy from the `web/` directory)

## Run Locally

```bash
git clone https://github.com/SecurityRonin/cryptlab.git
cd cryptlab
npm install
npx playwright install chromium
npx playwright test
# Open web/index.html in a browser, or:
python3 -m http.server 3009 --directory web
# Visit http://localhost:3009
```

## Attribution

Frequency analysis was first described by **Abu Yusuf Ya'qub ibn Ishaq al-Kindi** in 9th-century Baghdad. The Caesar cipher is named for its use by Julius Caesar; the Vigenère cipher is named for Blaise de Vigenère.

## License

[MIT License](https://opensource.org/licenses/MIT) — free to use, modify, and distribute.

Copyright (c) 2026 Albert Hui <albert@securityronin.com>

## Author

**Albert Hui** (法證黑客) — [Security Ronin](https://www.securityronin.com) · [linktr.ee/4n6h4x0r](https://linktr.ee/4n6h4x0r)
