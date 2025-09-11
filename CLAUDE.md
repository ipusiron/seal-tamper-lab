# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Seal Tamper Lab** is an educational security tool that teaches about tamper-evident seal vulnerabilities and detection techniques through interactive simulation. It's part of the "100 Security Tools Created with Generative AI" project (Day 061).

## Architecture

This is a **static single-page application** with:
- **Frontend-only architecture** - No backend server required
- **data/db.json** - Contains all seals, attacks, inspections, and scenarios data
- **script.js** - Main application logic with accordion-based step navigation
- **style.css** - Lightweight styling with no CSS framework dependencies
- **GitHub Pages deployment** via `.nojekyll` file

## Key Components

### Data Structure (data/db.json)
- **scenes**: Physical contexts (envelope, box, equipment housing)
- **seals**: Types (VOID, hologram, paper seal, transparent tape) with strengths/weaknesses
- **attacks**: Tampering methods (complete removal, reapplication, partial cutting)
- **inspections**: Detection methods (oblique light observation, baseline photo comparison, serial number verification)
- **scenarios**: Combinations of scene+seal with attack/inspection results

### UI Flow
1. Vertical accordion with 5 steps
2. Each step collapses to show summary when completed
3. Progressive disclosure pattern - next step only available after current selection
4. Results dynamically generated based on selected combinations

## Development Commands

Since this is a static site with no build process:
- **Run locally**: Open `index.html` directly in browser or use a local server like `python -m http.server 8000`
- **Deploy**: Push to GitHub, automatically served via GitHub Pages at https://ipusiron.github.io/seal-tamper-lab/

## Important Guidelines

- **Educational Focus**: This tool demonstrates security vulnerabilities for educational purposes. Never add features that could facilitate actual tampering.
- **Data-Driven**: All content comes from `data/db.json`. UI changes should preserve the data structure.
- **Accessibility**: Maintain ARIA labels and semantic HTML for screen reader compatibility.
- **No Dependencies**: Keep it framework-free for simplicity and maintainability.