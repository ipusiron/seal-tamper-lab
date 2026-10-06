# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Seal Tamper Lab** explains observation candidates and inspection limitations for selected educational conditions. It does not inspect real objects, simulate physical outcomes, or score detection/success rates. It's part of the "100 Security Tools Created with Generative AI" project (Day 061).

## Architecture

This is a **static single-page application** with:
- **Frontend-only architecture** - No backend server required
- **data/db.json** - Contains all seals, attacks, inspections, and scenarios data
- **script.js** - Main application logic with accordion-based step navigation and state management
- **seal-core.js** - Pure validation, prerequisite checks, and authored-scenario matching; classic script and CommonJS
- **seal-messages.js** - Dynamic Japanese UI messages (full bilingual UI is not implemented)
- **style.css** - Lightweight styling with no CSS framework dependencies
- **GitHub Pages deployment** via `.nojekyll` file

### State Management (script.js)
The app uses a simple `state` object to track user selections:
- `sceneId` - Selected physical context
- `sealId` - Selected seal type
- `attacks[]` - Selected tampering methods (multi-select)
- `inspections[]` - Selected detection methods (multi-select)

UI is driven by the `els` object which provides getter functions for DOM elements.

## Key Components

### Data Structure (data/db.json)
- **scenes**: Physical contexts (envelope, box, equipment housing) with surface properties
- **seals**: Types (VOID, hologram, paper seal, transparent tape, serial-numbered tape) with strengths/weaknesses
- **attacks**: Hypothetical modifications with illustrative cost, time, skill, and trace-visibility values (1-5); not measurements or probabilities
- **inspections**: Detection methods (oblique light, baseline photo, serial verification, macro, transmitted light, UV/IR)
- **scenarios**: Four authored lessons matched by scene, seal, and exact unordered attack set; inspection choices only identify additional suggested checks

### UI Flow
1. 5-step vertical accordion with card-based selection UI
2. Each step collapses to show summary pill when completed
3. Progressive disclosure - next step only available after current selection
4. Multi-select enabled for attacks (Step 3) and inspections (Step 4)
5. Results dynamically generated based on selected combinations
6. Every selection mutation synchronizes cards, chips, summaries, and navigation, and invalidates stale results

## Development Commands

Since this is a static site with no build process:
- **Run locally**: `python -m http.server 8000` (required for fetch to work; direct file:// won't load db.json)
- **Test**: `npm test` on Node.js 22 or later; no package installation required
- **Deploy**: Push to GitHub, automatically served via GitHub Pages at https://ipusiron.github.io/seal-tamper-lab/

## Important Guidelines

- **Educational Focus**: This tool demonstrates security vulnerabilities for educational purposes. Never add features that could facilitate actual tampering.
- **Data-Driven**: Educational data comes from `data/db.json`, dynamic UI messages from `seal-messages.js`. Preserve the data structure and qualify product-specific assumptions.
- **Accessibility**: Maintain ARIA labels and semantic HTML for screen reader compatibility.
- **No Dependencies**: Keep it framework-free for simplicity and maintainability.
- **Safe Rendering**: Use textContent/DOM construction, validated HTTPS references, and local allowlisted images. Do not add remote hotlinks or inline styles/scripts.
- **CSP**: The app uses a meta CSP. X-Frame-Options, X-Content-Type-Options, and frame-ancestors require HTTP headers; do not claim those protections through meta tags.
