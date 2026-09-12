# CryptLab — Crack Classical Ciphers Yourself

[![Netlify Status](https://api.netlify.com/api/v1/badges/7f1ea58b-8a32-4245-8e70-195a7dd21765/deploy-status)](https://app.netlify.com/sites/securityronin-cryptlab/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-♥-ea4aaa?logo=github)](https://github.com/sponsors/h4x0r)

**Make a cipher, then break one — the 1,200-year duel of codemakers and codebreakers, hands-on in your browser.**

[**Live Demo →**](https://securityronin-cryptlab.netlify.app)

---

## What Is This?

CryptLab is a teaching tool built as a **timeline**. The tabs run left to right in the order cryptanalysis was actually invented, and each technique is strictly stronger than the one before it:

| Tab | Technique | Year | What it defeats |
|---|---|---|---|
| ① Caesar | Exhaustive key search | antiquity | 25 keys — just read all of them |
| ② Frequency | Al-Kindi, Baghdad | c. 850 | Substitution, by counting letters |
| ③ Vigenère | Babbage / Kasiski, then Friedman's index of coincidence | 1863 / 1922 | Repeating keys, by recovering the key length |
| ④ Bigrams | Friedman → Baldwin's *Crypt Breaker's Workbench* | 1922 / 1985 | What single letters can't, using letter **pairs** |
| ⑤ Cribs | Bletchley Park | 1940 | What statistics can't, by guessing a **word** |
| ⑥ One-time pad | Vernam → Shannon's proof | 1917 / 1949 | **Nothing.** The defence finally wins — until the pad is reused |
| ⑦ RSA | Diffie–Hellman → Rivest, Shamir, Adleman | 1976 / 1977 | Factoring, if you can do it |
| ⑧ Shor | Peter Shor | 1994 | RSA outright — on a machine nobody has built yet |

Tabs ②, ④ and ⑤ work on **the same ciphertext and the same board**, so a student breaks one message with a thousand years of escalating technique and watches the score climb. Later tabs stay locked until the earlier one has been tried and has visibly fallen short.

The arc has a turn in it. Attacks escalate for five tabs, then the **one-time pad wins outright** — provably, and permanently. It loses anyway, on operational grounds rather than mathematical ones, which is why the story continues into public-key cryptography and then into the one attack on this page that has not arrived yet.

The ciphers never get weaker. **The attacker gets better** — which is the argument for *harvest now, decrypt later*, and the reason a message you send today is a bet on how long your cipher survives.

Challenges are also graded by **length**, the variable that decides whether cryptanalysis works at all: an 800-letter passage carries the statistics, a 25-letter field signal defeats every tool on the page.

It's built for the classroom: the tools are front and centre, the theory hides behind expandable ▸ sections, and everything runs on a phone with no app and no signup.

## Features

### Encrypt
- **Caesar cipher** with a live rotating cipher wheel and adjustable shift
- **Vigenère cipher** with a keyword — polyalphabetic, the cipher that resisted frequency analysis for 300 years
- Expandable notes: how the Caesar cipher works, Kerckhoffs's Principle, why Vigenère held

### ① Caesar and ③ Vigenère — breaking a key, not an alphabet
- **All 25 Caesar decryptions at once**, each scored on letter-pair fit, best row marked. The lesson isn't technique, it's that the keyspace is too small to matter.
- **Index of coincidence** bars for key lengths 1–12. English clusters near 0.067, random near 0.038; the shortest length that reaches English is the key length.
- **Column solver** — pick a length and each column becomes a plain Caesar, solvable by hand or by chi-squared against English frequencies. The keyword spells itself out.
- Verified end to end: the IC recovers lengths 3/5/7 and the solver recovers `KEY`, `RONIN` and `BABBAGE`.

### Break — substitution solver
- **Drag to assign.** Drag an English letter from the frequency reference row onto a ciphertext bar. Drag a placed letter to another bar to move or swap it; drag it off the board and it vanishes in a puff. Works with mouse, touch and keyboard — one Pointer Events path, no HTML5 drag-and-drop.
- **Bijective by construction.** A letter is a token that exists in exactly one place, so the same plaintext letter cannot be assigned twice. The invalid state is unreachable rather than corrected after the fact.
- **20 challenges across four length bands** — 3 long (~700–800 letters), 5 medium (~310–370), 8 short (~37–130) and 4 very short (~25–32), so the *same* method visibly succeeds at the top of the list and fails at the bottom.
- **Three tools, in the order codebreakers actually reached for them:**
  - **② single letters** — rank the counts against English; scores itself against the answer key.
  - **④ letter pairs** — scores your decryption on bigram statistics, offers draggable **two-letter blocks** (`GR → th`) that place both letters at once, and hill-climbs with random restarts.
  - **⑤ cribs** — CBW's probable-word attack. Cipher words are ranked by how **decisive** they are (fewest surviving candidates first), candidates must share the word's letter pattern, and a candidate that would make the text *less* English is flagged amber rather than hidden.
- **Human in the loop.** Anything you place by hand is **pinned** (gold dot) and neither the pair search nor a crib will overrule it. Read the output, drag a correction, run it again — the Crypt Breaker's Workbench loop.
- A guided walkthrough that adapts to the challenge you picked, plus expandable history: Al-Kindi, Mary Queen of Scots, the Zimmermann Telegram, CBW, and harvest-now-decrypt-later under Shor's algorithm.

### What the lab actually demonstrates

Measured across all 20 substitution challenges (`npx playwright test tests/measure.spec.js` regenerates this):

| Band | Letters | ② single letters | ④ letter pairs | ⑤ + cribs |
|---|---|---|---|---|
| Long | 697–812 | 21–29% | 92–100% | 92–100% |
| Medium | 313–371 | 17–39% | 83–100% | 83–100% |
| Short | 37–127 | 5–33% | 0–61% | up to **95%** |
| Very short | 25–32 | 0–15% | 0–35% | up to **67%** |

Three findings, all kept as lessons rather than smoothed away:

- **Counting single letters never solves anything** — not even an 800-letter passage. That is precisely why later tools had to be invented.
- **On very short messages the pair search reports a fit of 100 out of 100 while getting nearly every letter wrong.** With that few pairs, many mappings fit the statistics equally well, so the tool is maximally confident and useless. Read the plaintext, not the score.
- **Cribs rescue what statistics cannot** — Kerckhoffs 30 → 50 → 95%, Schneier 5 → 10 → 71%, the Weather signal 7 → 13 → 67% — but a *wrong* crib is catastrophic, wiping a solved board outright. Hence the amber flag, and hence the human staying in the loop.

Tool ④ uses random restarts, so its figures move a few points between runs; the table quotes observed ranges, not a single seeded draw.

### ⑥ One-time pad, ⑦ RSA, ⑧ Shor

- **⑥ Perfect secrecy, made concrete.** Type *any* message into the box and the lab hands you the key that makes the intercepted ciphertext say exactly that. Every such key is equally random and equally valid — which is why counting, pairs and cribs have nothing to bite on. Then the pad is reused and it dies: `C₁ − C₂ = P₁ − P₂` cancels the key, and you slide a crib along the difference stream to read one message out of the other. That's **crib dragging**, and it's the Venona mistake already sitting in the corpus.
- **⑦ RSA, broken the only way there is.** Four key sizes, real BigInt modular arithmetic, factored by honest trial division. The scaling table is extrapolated **from the rate your own machine just achieved**, not from a quoted figure — computed in log space, so 2048-bit lands at ~10²⁹² years rather than overflowing to `Infinity`.
- **⑧ Shor's classical half, which genuinely runs.** Pick a base, watch `aˣ mod N` cycle back to 1, read the period off the screen, then let `gcd(a^(r/2) ± 1, N)` produce the factors. Unlucky bases (odd `r`, or `a^(r/2) ≡ −1`) are reported as failures rather than hidden — Shor expects to retry. The panel is explicit that **only period-finding needs a quantum computer**, that no such machine exists at these sizes, and that published timelines are opinions rather than measurements.

Nothing here simulates a quantum computer. Faking that would fabricate the one thing the page is trying to teach honestly.

### Security Hardened
- Content Security Policy, X-Frame-Options, X-Content-Type-Options via Netlify `_headers`
- No external dependencies — zero JavaScript libraries, pure vanilla HTML/CSS/JS

## Tech Stack

- **Frontend:** Single `web/index.html` — vanilla HTML/CSS/JS, no build step, no frameworks
- **Testing:** [Playwright](https://playwright.dev/) — 67 end-to-end tests covering the pointer-drag mechanics, the Caesar and Vigenère solvers, the tool ladder and its locking, the crib tool, the one-time pad's key-for-any-plaintext property, RSA end to end, Shor's period arithmetic, and a 390×844 touch viewport. `tests/measure.spec.js` is a measurement harness rather than an assertion suite: it prints the table above so the teaching copy quotes observed numbers.
  ```bash
  npx playwright test                                                  # local
  BASE_URL=https://securityronin-cryptlab.netlify.app npx playwright test   # against production
  ```
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
