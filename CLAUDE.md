# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static personal portfolio website for Oscar Stensson, a Microsoft 365 Developer. It is deployed via GitHub Pages at stenssonoscar.github.io. There is no build system, package manager, or framework — all files are plain HTML, CSS, and JavaScript served directly.

## Development

Open any `.html` file directly in a browser, or use a local static server:

```bash
# Python
python -m http.server 8080

# Node (if available)
npx serve .
```

There are no tests, linting tools, or build steps.

## Architecture

### Pages
- `index.html` — Home/landing page (note: saved as UTF-8 with a BOM, unlike other pages which are UTF-8 without a BOM)
- `about.html` — Work experience, skills, certifications
- `blog.html` — Blog listing page (cards populated dynamically from `assets/script.js`)
- `contact.html` — Contact form/info
- `space-adventures.html` — Hosts the Space Adventures canvas game

### Shared Assets (`assets/`)
- `styles.css` — Global styles used by all portfolio pages (hero section, navbar, cards, footer)
- `blog.css` — Additional styles for the blog listing
- `script.js` — Shared JS for all portfolio pages: dynamically calculates employment durations and fetches/renders blog post cards by parsing metadata from blog HTML files
- `oscar.png` — Profile photo

### Space Adventures Game (`game.js` + `game.css`)
A canvas-based space game. Key globals:
- `gameState`: `"main"` | `"playing"` | `"gameover"` — controls what is rendered each frame
- `settings.sound`: toggles audio on/off
- Audio files: `assets/Galactic Dreams.mp3` (background music, looped), `assets/Game Over.mp3`, plus `jump.mp3` and `collision.mp3`
- The menu overlay (`#menuOverlay` / `#menuContent`) is populated dynamically by JS; the canvas fills `#gameContainer`

### Blog System
Blog posts are standalone HTML files under `blog/`. To be auto-discovered, each post must include `<meta>` tags with `name="title"`, `name="description"`, `name="date"`, and `name="image"`. The `assets/script.js` fetches each listed URL, parses those meta tags, and renders a card in `#blog-posts-container`. To add a new post, add its URL to the `blogPosts` array in `assets/script.js`.

### External Dependencies (CDN only)
- Bootstrap 5.3.0
- Font Awesome 6.0.0-beta3
- Google Fonts (Material Icons, used by the game)
