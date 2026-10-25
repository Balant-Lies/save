// ====================================================
// CARD CONFIGURATION & CONTROLS
// All visual settings, animation speeds, dimensions,
// line modes, and button routes are managed here.
// ====================================================

// ----------------------------------------------------
// OUTLINE STYLES (STROKE PROPS)
// ----------------------------------------------------
const strokeProps = {
  card: 0,            // Outer card boundary (0 = no border, 1, 2, 3...)
  flap: 0,            // White peel flap (0 = borderless, >0 = stroke width)
  innerPeel: 1,       // Black outline on front of the peel triangle
  innerPeelOuter: 5,  // White outline behind the black outline (slightly larger)
  buttons: 0,         // Crisp white outline on action buttons sqA, sqB, sqC (0 = borderless, 1, etc.)
  wobble: true        // true = organic wobbly curves, false = straight geometric lines
};

// ----------------------------------------------------
// TRANSITION MODE: Option A (Live DOM Page Entry Reveal)
// No View Transition API needed - live elements are clickable mid-animation!
// ----------------------------------------------------

// ----------------------------------------------------
// TRANSITION & LOADING CONTROLS
// Controls the peel flyaway speed, how long the text stays,
// and the loading progress bar before the next page opens!
// ----------------------------------------------------
const transitionProps = {
  flyawayDuration: 0.45,     // How long the flap takes to peel away completely (seconds)
  loadingHoldDuration: 1.2,  // How long the text & loading bar stay before loading next page (seconds)
  fadeDuration: 0.25         // Smooth fade-out duration before page redirect (seconds)
};

// ----------------------------------------------------
// EYE CONTROLS
// ----------------------------------------------------
// By using width/height, we strictly lock the eye's bounding box so it doesn't break GSAP's square scaling!
const eyeProps = {
  width: 10,        // Width of the eye inside the square (made it smaller than the square!)
  height: 5.8,      // Height of the eye (maintaining Figma's 67x39 ratio)
  x: -5,            // X position (half of width to center it)
  y: -3,            // Y position (half of height to center it)
  rotation: 135,    // Rotation in degrees
  pupilStrokeWidth: 6, // Stroke width of the pupil circle
  colors: {
    default: {
      lid: '#282828ff',       // Eyelid fill/stroke when unselected / approaching
      pupil: '#ffffff',      // Eye pupil outline/stroke when unselected (visible inside black eyelid)
      pupilFill: '#282828ff'   // Eye pupil fill when unselected ('#0c0c0c', '#ffffff', or 'none')
    },
    active: {
      lid: '#ffffff',       // Eyelid fill/stroke when locked / selected
      pupil: '#1A885C',      // Eye pupil outline/stroke when locked / selected (visible inside white eyelid)
      pupilFill: '#ffffffff'   // Eye pupil fill when locked / selected (black pupil on white eyelid)
    }
  }
};

// ----------------------------------------------------
// SUMMARY ICON CONTROLS
// Adjust position, scale, and rotation of the icon inside sqA.
// (Changing these only shifts the icon inside, never the button itself!)
// ----------------------------------------------------
const summaryProps = {
  scale: 1,       // Scale multiplier (1 = normal fit, >1 = larger, <1 = smaller)
  x: 0,           // Nudge left (-) or right (+)
  y: 0,           // Nudge up (-) or down (+)
  rotation: 0,    // Rotation in degrees around icon center
  clip: true,     // Clip inside button diamond boundary (true / false)
  colors: {
    default: {
      flap: '#282828ff',    // Corner flap when unselected
      lines: '#ffffffff',   // Text lines when unselected
      eyelid: '#282828ff',  // Eyelid when unselected
      pupil: '#ffffff',   // Eye pupil stroke when unselected
      pupilFill: '#282828ff' // Pupil fill when unselected
    },
    active: {
      flap: '#ffffff',    // Morphing corner flap (highlighted/selected)
      lines: '#1A885C',   // Crisp white text lines on black diamond
      eyelid: '#ffffff',  // Eyelid (highlighted/selected)
      pupil: '#1A885C',   // Eye pupil stroke (highlighted/selected)
      pupilFill: '#ffffffff' // Pupil inner fill
    }
  }
};

// ----------------------------------------------------
// THEME & SURFACE COLORS
// Control the main black box inside the card, the peel flap, and button colors
// ----------------------------------------------------
const themeProps = {
  cardBg: '#282828ff',        // Black inner box / canvas area (.inner-rect)
  cardPeel: '#1A885C',      // Underside flap of the peeled corner (.inner-triangle-path)
  cardPeelStroke: '#000000',  // Black outline on front of the peel flap
  cardPeelOuterStroke: '#ffffff', // White outline behind the black outline
  cardFlap: '#ffffff',       // Folded paper top flap (.triangle-path)
  btnActive: '#1A885C',      // General active / selected button diamond fill
  btnDefault: '#ffffff',     // Resting / unselected button diamond fill
  btnStroke: '#ffffff',      // Outline stroke around buttons
  behindText: '#1c1c1cff'      // Project text and loading bar revealed behind the card
};

// ----------------------------------------------------
// PAPER GRAIN & CARD SURFACE CONTROLS
// Tactile paper texture on the card border and header.
// 100% hardware-accelerated for silky 60/120 FPS dragging!
// ----------------------------------------------------
const grainProps = {
  enabled: false,            // true = textured paper, false = flat clean color
  opacity: 0.3,            // Grain intensity (e.g. 0.05 subtle, 0.12 balanced, 0.22 heavy cardstock)
  size: 140,                // Texture tile size in px (smaller = finer grain, larger = chunkier)
  blendMode: 'multiply',    // 'multiply', 'overlay', 'soft-light'
  paperColor: '#ffffffff'     // Base paper color of border & header (#F2F2F2, #F7F5F0 cream, etc.)
};

// ----------------------------------------------------
// THE OUTLINE GENERATOR
// Controls the physical background and clip mask of the cards.
// ----------------------------------------------------
const cardProps = {
  width: 300,
  height: 250,
  clipX: 60,   // How far from the right edge the bottom clip starts
  clipY: 56,   // How far from the bottom edge the right clip starts
  freq: 0.1,  // Frequency of the waves
  amp: 0.9,    // Wiggle amplitude (height of the waves)
  smoothness: 5// Length of each mathematical segment
};

// ----------------------------------------------------
// INITIAL / RESTING FLAP CONTROLS (CLOSED STATE)
// Controls the 7-point coordinates of the white flap before being dragged.
// ----------------------------------------------------
const flapClosedState = {
  p1x: 60, p1y: 0,
  p2x: 60, p2y: 20,
  p3x: 60, p3y: 40,
  p4x: 60, p4y: 60,
  p5x: 40, p5y: 60,
  p6x: 20, p6y: 60,
  p7x: 0, p7y: 60
};

// ----------------------------------------------------
// GREEN PEEL (INNER TRIANGLE) VERTEX CONTROLS
// Controls the exact 3 corner coordinates of the green peel:
// innerP1 = Top corner on the fold line
// innerP2 = Tip / point of the peel
// innerP3 = Left corner on the fold line
// ----------------------------------------------------
const greenPeelClosedState = {
  innerP1x: 60, innerP1y: 5,
  innerP2x: 65, innerP2y: 65,
  innerP3x: 1, innerP3y: 60
};

// ----------------------------------------------------
// GREEN PEEL OPEN CONTROLS
// Controls the exact 3 corner coordinates of the green peel
// when the card is held or clicked open:
// innerP1 = Top corner on fold line
// innerP2 = Tip of the peel
// innerP3 = Left corner on fold line
// ----------------------------------------------------
const greenPeelOpenState = {
  innerP1x: 60, innerP1y: 5,
  innerP2x: 65, innerP2y: 65,
  innerP3x: 1, innerP3y: 60
};

// ----------------------------------------------------
// INNER TRIANGLE PHYSICS & OFFSETS
// Relative offsets applied dynamically to the vertices
// ----------------------------------------------------
const innerTriProps = {
  // Offsets from the main flap's Top, Bottom-Right, and Bottom-Left corners!
  p1Offset: { x: -2, y: 2 },   // Top corner offset
  p2Offset: { x: -2, y: -2 },  // Bottom-Right corner offset
  p3Offset: { x: 2, y: -2 },  // Bottom-Left corner offset

  // Physics controls (matches card by default)
  freq: 0.15,
  amp: 0.5,
  smoothness: 5
};

// ----------------------------------------------------
// FLAP OPEN CONTROLS (3-Button, 2-Button, and 1-Button Modes)
// The exact coordinates the white flap and green peel animate to when opened.
// Cards automatically pick the matching flap based on how many
// buttons are declared in routes!
// ----------------------------------------------------

// 3 BUTTONS FLAP (Default: sqA at p2, sqB at p4, sqC at p6)
const flapOpenState3 = {
  p1x: 0, p1y: -40,
  p2x: 160, p2y: 40,
  p3x: 104, p3y: 60,
  p4x: 140, p4y: 110,
  p5x: 55, p5y: 104,
  p6x: 65, p6y: 150,
  p7x: -500, p7y: 80
};

// 2 BUTTONS: sqA + sqB (p6 remains resting at closed flap coords)
const flapOpenState2_AB = {
  p1x: 0, p1y: -40,
  p2x: 160, p2y: 40,   // active sqA
  p3x: 104, p3y: 60,
  p4x: 140, p4y: 110,  // active sqB
  p5x: 40, p5y: 60,    // resting
  p6x: 20, p6y: 60,    // resting (sqC hidden)
  p7x: -500, p7y: 80
};

// 2 BUTTONS: sqB + sqC (p2 remains resting at closed flap coords)
const flapOpenState2_BC = {
  p1x: 0, p1y: -40,
  p2x: 60, p2y: 20,    // resting (sqA hidden)
  p3x: 60, p3y: 40,    // resting
  p4x: 140, p4y: 110,  // active sqB
  p5x: 55, p5y: 104,
  p6x: 65, p6y: 150,   // active sqC
  p7x: -500, p7y: 80
};

// Default 2-button fallback
const flapOpenState2 = flapOpenState2_AB;

// 1 BUTTON FLAP (only sqB active — p2 and p6 remain resting)
const flapOpenState1 = {
  p1x: 0, p1y: -40,
  p2x: 60, p2y: 20,   // resting (sqA hidden)
  p3x: 60, p3y: 40,   // resting
  p4x: 140, p4y: 110, // active sqB
  p5x: 40, p5y: 60,   // resting
  p6x: 20, p6y: 60,   // resting (sqC hidden)
  p7x: -500, p7y: 80
};

// Default fallback
const flapOpenState = flapOpenState3;

// ----------------------------------------------------
// SQUARE (BOX) CONTROLS
// Controls the geometry, wobbly strokes, and thickness of the boxes
// ----------------------------------------------------
const sqProps = {
  sqA: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqB: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqC: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 }
};

// Diamond corner coordinates for the action buttons
const sqCorners = [
  { x: -8, y: 0 },
  { x: 0, y: -8 },
  { x: 8, y: 0 },
  { x: 0, y: 8 }
];

// ----------------------------------------------------
// OFFSET CONTROLS: Change these x/y values to pull the 
// squares closer or further from their vertex points!
// 'origin' controls the pivot point for scaling.
// "0px 0px" = Exact Center. (Note: Because the SVG is rotated 180deg, "8px 8px" is visually the Top-Left corner!)
// ----------------------------------------------------
const offsets = {
  sqA: { x: 0, y: 0, rotation: -10, origin: "0px 8px" },   // Blue Square (Summary)
  sqB: { x: 0, y: 0, rotation: 25, origin: "6px 8px" },    // Lime Square (View Project)
  sqC: { x: 0, y: 0, rotation: 35, origin: "6px 6px" }    // Magenta Square (Media)
};

// ----------------------------------------------------
// MOBILE HOLD DELAY
// ----------------------------------------------------
// How long a user must hold their finger on the main card before the peel activates.
// This allows them to scroll natively without triggering the drag!
const MOBILE_HOLD_DELAY = 150;

// ----------------------------------------------------
// CLICK-TO-VIEW AUTO DRAG DISTANCE
// ----------------------------------------------------
// When you tap/click the card, it automatically drags the peel over the View button.
// Increase/decrease these numbers to manually nudge how far it drags (in SVG units)!
// X = drag left, Y = drag up.
const CLICK_DRAG_X = 100;
const CLICK_DRAG_Y = 80;

// ----------------------------------------------------
// BUTTON DESTINATION PAGES
// Easily change which HTML page each button opens!
// ----------------------------------------------------
const routes = {
  sqA: 'summary.html',   // Top button: Summary page
  sqB: 'project1.html',  // Middle button: Project page
  sqC: 'media.html'      // Bottom button: Media page
};

// ----------------------------------------------------
// KEYBOARD ACCESSIBILITY NUDGE TARGETS
// When tabbing to a button, the peel nudges to these coordinates.
// ----------------------------------------------------
const focusNudge = {
  sqA: { x: -130, y: -40 },
  sqB: { x: -CLICK_DRAG_X, y: -CLICK_DRAG_Y },
  sqC: { x: -40, y: -140 }
};

// ----------------------------------------------------
// BUTTON PROXIMITY & SELECTION CONTROLS
// Controls when buttons grow, when icons appear, and when
// they switch from default to highlighted/selected state.
// ----------------------------------------------------
const buttonProximityProps = {
  startDistance: 80,     // Pixel distance where button begins growing and icon appears
  fullSizeDistance: 15,  // Pixel distance where button reaches full size in gradual mode
  instantIcon: true,     // true = icon appears instantly at 100% solid opacity (no ghosting)
  // false = gradual opacity fade-in
  growthMode: 'gradual', // 'tween' = button smoothly springs to max scale when in range
  // 'gradual' = button scales continuously with distance
  iconAppearPercent: 0.5,// What percentage of size growth (0.0 to 1.0, e.g. 0.5 = 50% size) the icon pops in and starts animating
  maxScale: 5            // Full scale target
};

// ----------------------------------------------------
// BUTTON REVEALED TEXT LABELS
// Text displayed behind the card when hovering or focusing buttons
// ----------------------------------------------------
const buttonLabels = {
  sqA: 'Summary',
  sqB: 'Project 1',
  sqC: 'Media'
};

// ----------------------------------------------------
// BUTTON TEXT OVERLAY CONTROLS
// Centralized controls for text displayed on/attached to each button.
// Features independent offset & rotation per button, global typography,
// and appear threshold controls matching the icon logic.
// ----------------------------------------------------
const buttonTextProps = {
  // Global typography
  font: "'Departure Mono', monospace",
  size: '2.8px',         // Font size in button coordinate space (scales up crisply with button)
  weight: 400,           // 400, 600, 700, 800
  spacing: '0.04em',     // Letter spacing
  color: '#111111',      // Default text color inside the white box
  activeColor: '#000000ff',// Text color when button is selected/locked (stands out cleanly on white box)
  transform: 'none',// 'uppercase', 'none', 'capitalize', 'lowercase'

  // Label Box Container Controls (always white box)
  box: {
    fill: '#ffffff',       // Always white box
    paddingX: 1,         // Horizontal padding around text
    paddingY: 0.5,         // Vertical padding around text
    radius: 0,           // Corner radius (0 = sharp rectangle, >0 = subtle rounded box)
    stroke: 'none',        // Border stroke color ('none', or '#000000', etc.)
    strokeWidth: 0
  },

  // Visibility threshold: control at what button size the box & text appear
  textAppearPercent: 0.99,// What percentage of button size (0.0 to 1.0, e.g. 0.5 = 50% size) they appear
  instantText: true,     // true = pops in instantly at 100% opacity, false = gradual fade

  // Per-button custom offsets, rotation, and label text
  // IMPORTANT: The box & text are strictly attached to the button; the button's center,
  // bounding box, and proximity hit-detection remain strictly anchored to the diamond button!
  buttons: {
    sqA: { text: 'the Tech', x: 7, y: 7, rotation: 135 },
    sqB: { text: 'View', x: 7, y: 7, rotation: 137 },
    sqC: { text: 'the Art', x: 7, y: 7, rotation: 137 }
  }
};

// ----------------------------------------------------
// CARD HEADER / TITLE STYLING
// Centralized controls for font family, size, weight, letter-spacing, and color
// ----------------------------------------------------
const titleProps = {
  font: "'Departure Mono', monospace",
  size: '16px',
  weight: 400,
  spacing: '0',
  color: '#111111',
  transform: 'none' // 'none', 'uppercase', 'capitalize', 'lowercase'
};

// ----------------------------------------------------
// PROJECT CARDS CATALOG
// Define each card's title, revealed label, and destination routes.
// Add image/media paths here later when ready!
// ----------------------------------------------------
const projects = [
  {
    title: 'Project A',
    label: 'Project 1',
    // 3 Buttons: sqA, sqB, sqC (uses flapOpenState3)
    // Uses default signature green: #1A885C
    routes: { sqA: 'summary.html', sqB: 'project1.html', sqC: 'media.html' }
  },
  {
    title: 'Project B',
    label: 'Project 2',
    // 2 Buttons: sqB, sqC (uses flapOpenState2_BC, hides sqA)
    routes: { sqC: 'summary.html', sqB: 'project1.html' }
  },
  {
    title: 'Project C',
    label: 'Project 3',
    // 1 Button: sqB (uses flapOpenState1, hides sqA and sqC)
    routes: { sqB: 'project1.html' }
  },
  {
    title: 'Project D',
    label: 'Project 4',
    // 3 Buttons: sqA, sqB, sqC (uses flapOpenState3)
    // Uses default signature green: #1A885C
    routes: { sqA: 'summary.html', sqB: 'project1.html', sqC: 'media.html' }
  }
];

// ----------------------------------------------------
// PROJECT CARDS GRID SPACING & PADDING CONTROLS
// Adjust the spacing and space above the cards for the sticker
// ----------------------------------------------------
const gridProps = {
  paddingTop: 180,            // Top padding in px (space above project cards)
  paddingBottom: 64,          // Bottom padding in px
  paddingX: 2,               // Horizontal padding on mobile (px)
  gap: 32                     // Gap between cards in px (2rem)
};

// ----------------------------------------------------
// WORK & ABOUT STICKER ARCHITECTURE CONFIGURATION
// Multi-sticker system supporting local Tier 1 inspection,
// Tier 2 page compound state, Tier 3 card clamping, and sleep/wake.
// ----------------------------------------------------
const stickerProps = {
  // Global settings
  scale: 0.6,
  physics: {
    dragThreshold: 5,
    liftScale: 1.07,
    settleDuration: 0.22,
    shadowLiftY: 34,
    shadowLiftBlur: 44,
    shadowRestY: 16,
    shadowRestBlur: 28
  },
  shadow: { enabled: false },

  // PBR Gloss & Specular Sheen (Derived from sticker-gloss-config (1).json)
  gloss: {
    tilt: {
      enabled: false,
      maxTilt: 20,
      multX: 1,
      multY: 1,
      invX: false,
      invY: false,
      lockX: false,
      lockY: false,
      smoothing: 0.1,
      perspective: 900
    },
    specular: {
      enabled: true,
      intensity: 0.28,
      size: 80,
      falloff: 0.84,
      travel: 44,
      color: "golden"
    },
    fresnel: {
      enabled: true,
      intensity: 0.4,
      exponent: 3,
      rimWidth: 20
    },
    environment: {
      enabled: true,
      intensity: 0.25,
      blur: 12,
      preset: "studio"
    },
    surface: {
      washout: true,
      washoutStrength: 0.15,
      iridescence: false,
      iridescenceStrength: 0.08
    },
    backlight: {
      enabled: false,
      brightness: 0.74,
      contrast: 1.1,
      saturation: 1.5,
      glowIntensity: 0.6,
      glowBlur: 38,
      color: "cool"
    },
    input: {
      source: "auto",
      gyroSensitivity: 1.5,
      mouseSensitivity: 0
    },
    idle: {
      enabled: true,
      speed: 0.8,
      amplitude: 0.35,
      tilt: false
    }
  },
  get glare() { return this.gloss; },

  // 1. Work Navigation Sticker (CRT Monitor)
  work: {
    id: 'work',
    name: 'Work CRT',
    scale: 0.6,
    width: 220,
    height: 230,
    initialPosition: {
      anchor: 'grid',
      align: 'left',
      offsetX: 0,
      offsetY: 24,
      screenX: 48,
      screenY: 24
    },
    appliedByDefault: true,
    peel: { mode: 'auto', x: 71, y: 67, scale: 1.3, rotation: 0 },
    hitbox: { visible: false, offsetX: 0, offsetY: 0, padding: 0 }
  },

  // 2. About Me Modifier Sticker (Bio / 3D Story)
  about: {
    id: 'about',
    name: 'About Me',
    scale: 0.6,
    width: 220,
    height: 230,
    initialPosition: {
      anchor: 'grid',
      align: 'right',     // Aligns above Card 2 column
      offsetX: 0,
      offsetY: 24,
      screenX: 380,
      screenY: 24
    },
    appliedByDefault: false,
    initialSleeping: true,
    peel: { mode: 'auto', x: 71, y: 67, scale: 1.3, rotation: 0 },
    hitbox: { visible: false, offsetX: 0, offsetY: 0, padding: 0 }
  },

  // Backward compatibility aliases for existing references
  width: 220,
  height: 230,
  get initialPosition() { return this.work.initialPosition; },
  appliedByDefault: true,
  get peel() { return this.work.peel; },
  get hitbox() { return this.work.hitbox; },
  boil: { enabled: false, scale: 2.2, fps: 2 },
  navigation: { enabled: false }
};

// Group everything into a single namespace object for easy access
const CardConfig = {
  themeProps,
  buttonTextProps,
  grainProps,
  titleProps,
  projects,
  strokeProps,
  LINE_MODE: 4,
  transitionProps,
  eyeProps,
  summaryProps,
  buttonProximityProps,
  cardProps,
  innerTriProps,
  flapClosedState,
  greenPeelClosedState,
  greenPeelOpenState,
  flapOpenState,
  flapOpenState3,
  flapOpenState2,
  flapOpenState2_AB,
  flapOpenState2_BC,
  flapOpenState1,
  sqProps,
  sqCorners,
  offsets,
  MOBILE_HOLD_DELAY,
  CLICK_DRAG_X,
  CLICK_DRAG_Y,
  routes,
  focusNudge,
  buttonLabels,
  gridProps,
  stickerProps
};

// Expose globally to window
window.CardConfig = CardConfig;
window.gridProps = gridProps;
window.stickerProps = stickerProps;

