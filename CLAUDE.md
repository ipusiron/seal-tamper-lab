# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Seal Tamper Lab** is an educational security tool that teaches about tamper-evident seal vulnerabilities and detection techniques through interactive simulation. It's part of the "100 Security Tools Created with Generative AI" project (Day 061).

## Architecture

This is a **static single-page application** with:
- **Frontend-only architecture** - No backend server required
- **data/db.json** - Contains all seals, attacks, inspections, and scenarios data
- **script.js** - Main application logic with accordion-based step navigation and state management
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
- **attacks**: Tampering methods with ratings (cost, time, skill, detection-risk on 1-5 scale)
- **inspections**: Detection methods (oblique light, baseline photo, serial verification, macro, transmitted light, UV/IR)
- **scenarios**: Outcome combinations for scene+seal+attack+inspection

### UI Flow
1. 5-step vertical accordion with card-based selection UI
2. Each step collapses to show summary pill when completed
3. Progressive disclosure - next step only available after current selection
4. Multi-select enabled for attacks (Step 3) and inspections (Step 4)
5. Results dynamically generated based on selected combinations

## Development Commands

Since this is a static site with no build process:
- **Run locally**: `python -m http.server 8000` (required for fetch to work; direct file:// won't load db.json)
- **Deploy**: Push to GitHub, automatically served via GitHub Pages at https://ipusiron.github.io/seal-tamper-lab/

## Important Guidelines

- **Educational Focus**: This tool demonstrates security vulnerabilities for educational purposes. Never add features that could facilitate actual tampering.
- **Data-Driven**: All content comes from `data/db.json`. UI changes should preserve the data structure.
- **Accessibility**: Maintain ARIA labels and semantic HTML for screen reader compatibility.
- **No Dependencies**: Keep it framework-free for simplicity and maintainability.
- **CSP Headers**: The app uses Content-Security-Policy via meta tags. When adding external resources, update the CSP in index.html.