// ====================================================
// MAIN APPLICATION ENTRY POINT
// Initializes all interactive cards on the page and handles
// browser back/forward navigation (bfcache) restoration.
// ====================================================

// ----------------------------------------------------
// APPLY GLOBAL TITLE TYPOGRAPHY & STYLES
// Injects CSS variables so typography is centralized in config.js
// ----------------------------------------------------
function applyTitleStyles(styles) {
  if (!styles) return;
  const root = document.documentElement;
  if (styles.font) root.style.setProperty('--card-title-font', styles.font);
  if (styles.size) root.style.setProperty('--card-title-size', styles.size);
  if (styles.weight) root.style.setProperty('--card-title-weight', styles.weight);
  if (styles.spacing) root.style.setProperty('--card-title-spacing', styles.spacing);
  if (styles.color) root.style.setProperty('--card-title-color', styles.color);
  if (styles.transform) root.style.setProperty('--card-title-transform', styles.transform);
}

// ----------------------------------------------------
// APPLY PAPER GRAIN & SURFACE TEXTURE
// Generates a hardware-accelerated static texture tile
// ----------------------------------------------------
// THEME & SURFACE COLORS
// Applies global cardBg, cardPeel, cardPeelStroke, cardFlap, and button colors from config
// ----------------------------------------------------
function applyThemeProps(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.cardBg) root.style.setProperty('--card-bg', theme.cardBg);
  if (theme.cardPeel) root.style.setProperty('--card-peel', theme.cardPeel);
  if (theme.cardPeelStroke) root.style.setProperty('--card-peel-stroke', theme.cardPeelStroke);
  if (theme.cardPeelOuterStroke) root.style.setProperty('--card-peel-outer-stroke', theme.cardPeelOuterStroke);
  if (theme.cardFlap) root.style.setProperty('--card-flap', theme.cardFlap);
  if (theme.btnActive) root.style.setProperty('--btn-active', theme.btnActive);
  if (theme.btnDefault) root.style.setProperty('--btn-default', theme.btnDefault);
  if (theme.btnStroke) root.style.setProperty('--btn-stroke', theme.btnStroke);
  if (theme.behindText) root.style.setProperty('--behind-text', theme.behindText);
}

// ----------------------------------------------------
// PROCEDURAL PAPER GRAIN TEXTURE GENERATOR
// ----------------------------------------------------
function applyPaperGrain(props) {
  if (!props) return;
  const root = document.documentElement;

  if (props.paperColor) {
    root.style.setProperty('--card-paper-color', props.paperColor);
    document.querySelectorAll('.card-bg-path').forEach(p => {
      p.setAttribute('fill', props.paperColor);
    });
  }

  if (!props.enabled) {
    root.style.setProperty('--paper-grain-display', 'none');
    return;
  }

  // Seamless procedural fractal noise encoded as a cached image resource
  const size = props.size || 140;
  const svgNoise = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<filter id="grain">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>' +
    '<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"/>' +
    '</filter>' +
    '<rect width="100%" height="100%" filter="url(#grain)"/>' +
    '</svg>';

  const encodedSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgNoise);

  root.style.setProperty('--paper-grain-image', 'url("' + encodedSvg + '")');
  root.style.setProperty('--paper-grain-size', size + 'px ' + size + 'px');
  root.style.setProperty('--paper-grain-opacity', String(props.opacity !== undefined ? props.opacity : 0.12));
  root.style.setProperty('--paper-grain-blend', props.blendMode || 'multiply');
  root.style.setProperty('--paper-grain-display', 'block');
}

// ----------------------------------------------------
// INITIALIZE ALL INTERACTIVE CARDS
// Connects each card with its corresponding project data
// ----------------------------------------------------
function initializeAllCards() {
  if (typeof CardConfig !== 'undefined') {
    if (CardConfig.themeProps) applyThemeProps(CardConfig.themeProps);
    if (CardConfig.titleProps) applyTitleStyles(CardConfig.titleProps);
    if (CardConfig.grainProps) applyPaperGrain(CardConfig.grainProps);
  }

  const wraps = document.querySelectorAll('.wrap');
  const projects = (typeof CardConfig !== 'undefined' && Array.isArray(CardConfig.projects))
    ? CardConfig.projects
    : [];

  wraps.forEach((wrap, index) => {
    if (!wrap._resetCard) {
      const proj = projects[index];
      const customConfig = proj ? {
        ...CardConfig,
        title: proj.title,
        label: proj.label,
        defaultBehindText: proj.label,
        routes: proj.routes !== undefined ? proj.routes : CardConfig.routes,
        projectFlapOpenState: proj.flapOpenState || null,
        activeColor: proj.activeColor || null
      } : undefined;

      initCard(wrap, customConfig);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  window.__CARD_APP_INITIALIZED__ = true;
  initializeAllCards();
});

window.__CARD_APP_INITIALIZED__ = true;

// Also initialize immediately in case DOMContentLoaded has already fired
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initializeAllCards();
}

// ----------------------------------------------------
// BROWSER BACK BUTTON FIX (bfcache instant restoration)
// ----------------------------------------------------
window.addEventListener('pageshow', () => {
  // Always immediately restore pointer events so clicks work with 0ms delay
  document.body.style.pointerEvents = '';

  // Instantly reset all cards in-place (no reload, zero waiting!)
  document.querySelectorAll('.wrap').forEach(wrap => {
    if (typeof wrap._resetCard === 'function') {
      wrap._resetCard();
    } else {
      wrap.style.opacity = '1';
      wrap.style.pointerEvents = '';
    }
  });
});

