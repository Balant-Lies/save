# Project Guide: Modular Architecture

Welcome! Your project has been cleanly organized into **focused, bite-sized modular files** (each under 200–300 lines). This makes it super easy to edit colors, speeds, button links, and styles without having to scroll through thousands of lines of complex physics code!

All original notes, comments, and mathematical explanations have been **100% preserved**.

---

## 📁 Project Folder Structure

```
Mysite/
│
├── index.html              # Main page containing the interactive cards
├── summary.html            # Content page for "Summary"
├── project1.html           # Content page for "View Project"
├── media.html              # Content page for "Media"
│
├── css/                    # 🎨 All styling files
│   ├── base.css            # Page background, reset, and card grid layout
│   ├── card.css            # Card dimensions, colors, peel triangles, focus rings
│   ├── transitions.css     # Circular expanding window transition styles
│   └── subpage.css         # Shared styles for summary, project1, and media pages
│
├── js/                     # ⚡ Clean, Modular JavaScript Architecture
│   ├── config.js           # ⚙️ ALL SETTINGS (Speeds, sizes, button links, line modes)
│   ├── geometry.js         # 📐 Mathematical wobbly polygon generator & collision math
│   ├── card-render.js      # 🖌️ Card SVG outline & dynamic polygon corner clipping
│   ├── card-buttons.js     # 🔘 Action buttons (sqA, sqB, sqC), Figma eye, proximity & highlights
│   ├── card-transitions.js  # 🚀 1200px peel flyaway, loading bar hold, and page navigation
│   ├── card.js             # 🎮 Interactive controller (mouse/touch drag, keyboard focus, reset)
│   ├── transitions.js      # 🔄 Subpage transition coordinate sync
│   └── main.js             # 🏁 Initializes cards and handles instant back-button (bfcache)
│
├── style.css               # Main stylesheet (imports base.css and card.css)
├── app.js                  # ⚠️ LEGACY BACKUP ONLY (Do not edit; use js/ modules instead)
├── Img/                    # Image assets
└── svg/                    # SVG assets
```

---

## 🤖 Note for AI Agents & Developers: Bug Isolation & Line Limits

### 1. Single Responsibility Principle
Each file in `js/` has **one and only one** clear job. Never combine these systems back into a monolithic file!
Keeping each file under **200–300 lines** ensures fast agent diffing, zero tool-call replacement errors, and immediate bug discovery.

### 2. Quick Troubleshooting Map (Find Any Bug in 5 Seconds)

| If you encounter an issue with... | Open this file: | What it controls: |
| :--- | :--- | :--- |
| **Settings, speeds, delays, or URLs** | [`js/config.js`](js/config.js) | All constants, routes, button labels, and timing properties. |
| **Math, wobbles, or triangle hit testing** | [`js/geometry.js`](js/geometry.js) | Pure mathematical functions for wobbly polygons and points. |
| **Wobbly borders or card edge clipping** | [`js/card-render.js`](js/card-render.js) | Dynamic SVG polygon clipping and border rendering. |
| **Button selection, eye icon, or green highlights** | [`js/card-buttons.js`](js/card-buttons.js) | Button SVGs, proximity hit testing, active scale/color, and eyes. |
| **Peel flyaway, loading bar, or page redirect** | [`js/card-transitions.js`](js/card-transitions.js) | 1200px flyaway tween, behind-card text lock, and navigation. |
| **Mouse drag, touch, click emulation, or Tab key** | [`js/card.js`](js/card.js) | Drag physics, sway wobble, click emulation, and keyboard access. |
| **Page startup or browser back-button (bfcache)** | [`js/main.js`](js/main.js) | Instant in-place card resets on page restore. |

### 3. Legacy Files
- [`app.js`](app.js) is strictly a **legacy backup**. Active runtime scripts are loaded from `js/` in [`index.html`](index.html). Do not edit `app.js`.

---

## 🛠️ How to Customize Things Easily (Cheat Sheet)

### 1. Changing Animation Speeds or Button Links
Open [`js/config.js`](js/config.js):
- **Change Button Links**: Find `routes` to change which HTML page opens when clicking `Summary`, `View Project`, or `Media`:
  ```javascript
  const routes = {
    sqA: 'summary.html',   // Top button
    sqB: 'project1.html',  // Middle button
    sqC: 'media.html'      // Bottom button
  };
  ```
- **Change Text Behind Card**: Find `buttonLabels` to customize the dynamic text revealed behind the card:
  ```javascript
  const buttonLabels = {
    sqA: 'Summary',    // When top button is highlighted
    sqB: 'Project 1',  // When middle view button is highlighted
    sqC: 'Media'       // When bottom button is highlighted
  };
  ```
- **Change Timing & Loading Bar**: Find `transitionProps`:
  - `loadingHoldDuration`: How long the text & loading bar stay before loading next page (in seconds, e.g. `1.2`).
  - `flyawayDuration`: How fast the peeled flap flies away (in seconds, e.g. `0.45`).
  - `fadeDuration`: Smooth fade-out duration before navigating (in seconds, e.g. `0.25`).
- **Change Outline Style**: Find `LINE_MODE`:
  - `0`: Wobbly outlines everywhere
  - `1`: Straight lines (no wobble)
  - `3`: No outlines (fills only, no stroke borders)
  - `4`: Outlines only on outside card and buttons

### 2. Changing Colors
Open [`css/card.css`](css/card.css):
- Look at the top for `.wrap`:
  ```css
  --card-bg: #0c0c0c;     /* Card background inside */
  --card-flap: #ffffff;   /* The white peeled-back paper */
  --card-peel: #1A885C;   /* The green underside of the peel */
  --btn-default: #ffffff; /* Button icon color */
  --btn-active: #1A885C;  /* Highlighted button color */
  ```

### 3. Changing Content Pages (Summary / Media / Project 1)
Open [`css/subpage.css`](css/subpage.css):
- You can change the background color, container padding, or button color here.
- Any change here automatically updates `summary.html`, `media.html`, and `project1.html` at the same time!

---

## ✅ What Was Verified & Tested
- Works locally by double-clicking `index.html` (`file://`) and with any web server.
- Interactive drag, mobile hold-to-peel, hover swells, button selection locks, and flyaways function with natural physics.
- Zero premature exceptions on click: click smoothly emulates natural drag over View button (`sqB`).
- Text revealed behind card stays locked on the selected project throughout the peel and loading bar.
- Zero browser console errors.
- Instant browser back-button restoration (bfcache) working smoothly.
