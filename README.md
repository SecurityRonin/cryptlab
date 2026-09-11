# CryptLab — Crack Classical Ciphers Yourself

[![Netlify Status](https://api.netlify.com/api/v1/badges/7f1ea58b-8a32-4245-8e70-195a7dd21765/deploy-status)](https://app.netlify.com/sites/securityronin-cryptlab/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-♥-ea4aaa?logo=github)](https://github.com/sponsors/h4x0r)

**Make a cipher, then break one — the 1,200-year duel of codemakers and codebreakers, hands-on in your browser.**

[**Live Demo →**](https://securityronin-cryptlab.netlify.app)

---

## What Is This?

CryptLab is a two-panel teaching tool for the classical era of cryptography. **Encipher** with a Caesar or Vigenère cipher and watch the cipher wheel turn; **Break** a real substitution cipher with frequency analysis — the same 9th-century technique Al-Kindi invented and that cost Mary, Queen of Scots her head — mapping the ciphertext letter by letter until the plaintext emerges.

It's built for the classroom: the tools are front and centre, the theory hides behind expandable ▸ sections, and everything runs on a phone with no app and no signup.

## Features

### Encipher
- **Caesar cipher** with a live rotating cipher wheel and adjustable shift
- **Vigenère cipher** with a keyword — polyalphabetic, the cipher that resisted frequency analysis for 300 years
- Expandable notes: how the Caesar cipher works, Kerckhoffs's Principle, why Vigenère held

### Break — substitution solver
- **Frequency histogram** of the ciphertext, tallest bar highlighted, with a per-letter mapping box under each bar
- **English-frequency reference** row to line the bars up against (E T A O I N S H R…)
- **Bijective mapping** — each plaintext letter can occupy only one box; assigning it elsewhere clears the old one
- **Guess by frequency** — auto-fill the ranking, then hand-fix the near-ties
- **Five challenges** to choose from (or paste your own ciphertext), each a different substitution and difficulty
- A guided walkthrough plus expandable history: Al-Kindi, Mary Queen of Scots, and why more ciphertext makes cracking easier

### Security Hardened
- Content Security Policy, X-Frame-Options, X-Content-Type-Options via Netlify `_headers`
- No external dependencies — zero JavaScript libraries, pure vanilla HTML/CSS/JS

## Tech Stack

- **Frontend:** Single `web/index.html` — vanilla HTML/CSS/JS, no build step, no frameworks
- **Testing:** [Playwright](https://playwright.dev/) end-to-end smoke tests
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
