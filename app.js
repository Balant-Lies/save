// ----------------------------------------------------
// LINE MODES
// 0: Current setup (Wobbly outlines everywhere)
// 1: Normal straight lines (No wobble)
// 3: No outlines (Fills only, no strokes)
// 4: Outlines only on the outside card and buttons (Inner peel has no outlines)
// ----------------------------------------------------
const LINE_MODE = 4;

// ----------------------------------------------------
// EYE CONTROLS
// ----------------------------------------------------
// By using width/height, we strictly lock the eye's bounding box so it doesn't break GSAP's square scaling!
const eyeProps = {
  width: 10,        // Width of the eye inside the square (made it smaller than the square!)
  height: 5.8,      // Height of the eye (maintaining Figma's 67x39 ratio)
  x: -5,            // X position (half of width to center it)
  y: -3,          // Y position (half of height to center it)
  rotation: 135     // Rotation in degrees
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
  freq: 0.15,  // Frequency of the waves
  amp: 0.9,    // Wiggle amplitude (height of the waves)
  smoothness: 5// Length of each mathematical segment
};

// ----------------------------------------------------
// INNER TRIANGLE CONTROLS
// A slightly smaller 3-point triangle drawn over the animated flap
// ----------------------------------------------------
const innerTriProps = {
  // Offsets from the main flap's Top, Bottom-Right, and Bottom-Left corners!
  p1Offset: { x: -2, y: 2 },   // Top corner offset
  p2Offset: { x: -2, y: -2 },  // Bottom-Right corner offset
  p3Offset: { x: 2, y: -2 },  // Bottom-Left corner offset

  // Physics controls (matches card by default)
  freq: 0.15,
  amp: 0.9,
  smoothness: 5
};

// ----------------------------------------------------
// FLAP OPEN CONTROLS
// The exact coordinates the white flap animates to when opened.
// ----------------------------------------------------
const flapOpenState = {
  p1x: 0, p1y: -40,
  p2x: 160, p2y: 40,
  p3x: 104, p3y: 60,
  p4x: 140, p4y: 110,
  p5x: 55, p5y: 104,
  p6x: 65, p6y: 150,
  p7x: -500, p7y: 80
};

// ----------------------------------------------------
// SQUARE (BOX) CONTROLS
// Controls the geometry, wobbly strokes, and thickness of the boxes
// ----------------------------------------------------
const sqProps = {
  sqA: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqB: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqC: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 }
};

// A generic function that takes ANY array of corner coordinates
// and generates a mathematical wobbly path between them!
function generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset = 0, forceStraight = false) {
  let d = "";

  // Mode 1: Normal straight lines
  if (LINE_MODE === 1 || forceStraight) {
    for (let i = 0; i < corners.length; i++) {
      if (i === 0) d += `M ${corners[i].x.toFixed(1)},${corners[i].y.toFixed(1)} `;
      else d += `L ${corners[i].x.toFixed(1)},${corners[i].y.toFixed(1)} `;
    }
    d += "Z";
    return d;
  }

  let noiseOffset = seedOffset;

  for (let i = 0; i < corners.length; i++) {
    const pStart = corners[i];
    const pEnd = corners[(i + 1) % corners.length];

    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const dist = Math.hypot(dx, dy);

    // If points are extremely close together, skip displacement
    if (dist < 0.1) continue;

    const steps = Math.max(1, Math.floor(dist / segmentLen));

    const nx = -dy / dist;
    const ny = dx / dist;

    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      let bx = pStart.x + dx * t;
      let by = pStart.y + dy * t;

      // UNEVEN DISTRIBUTION: We modulate the amplitude using a slow, low-frequency wave!
      const ampMod = 0.5 + 0.5 * Math.sin(noiseOffset * freq * 0.3);

      // The high-frequency jagged noise
      const noise = (Math.sin(noiseOffset * freq) + Math.sin(noiseOffset * freq * 2.3 + 1.5)) * 0.5;

      // Multiply amplitude by the slow modulator for organic thickness variation
      bx += nx * noise * amp * ampMod;
      by += ny * noise * amp * ampMod;

      if (i === 0 && j === 0) {
        d += `M ${bx.toFixed(1)},${by.toFixed(1)} `;
      } else {
        d += `L ${bx.toFixed(1)},${by.toFixed(1)} `;
      }
      noiseOffset += segmentLen;
    }
  }
  d += "Z";
  return d;
}

const wraps = document.querySelectorAll('.wrap');

wraps.forEach(wrap => {
  const card = wrap.querySelector('.card');
  const hitbox = card.querySelector('.hitbox');
  const path = card.querySelector('.triangle-path');
  const innerPath = card.querySelector('.inner-triangle-path');

  const bgPath = wrap.querySelector('.card-bg-path');
  const clipPath = wrap.querySelector('.card-clip-path');

  // Initialize the wavy outline for this card!
  function renderCardOutline() {
    const cardCorners = [
      { x: 0, y: 0 },
      { x: cardProps.width, y: 0 },
      { x: cardProps.width, y: cardProps.height - cardProps.clipY },
      { x: cardProps.width - cardProps.clipX, y: cardProps.height },
      { x: 0, y: cardProps.height }
    ];
    const d = generateWobblyPolygon(cardCorners, cardProps.freq, cardProps.amp, cardProps.smoothness, 0);
    bgPath.setAttribute('d', d);
    clipPath.setAttribute('d', d);
  }
  renderCardOutline(); // Draw it once at startup

  const sqA = card.querySelector('.sq-A');
  const sqB = card.querySelector('.sq-B');
  const sqC = card.querySelector('.sq-C');

  // Inject the Figma Eye exclusively into the Lime green squares (sqB)
  [sqB].forEach(sq => {
    // We use a NESTED <svg> tag. This natively handles the 67x39 viewBox math 
    // AND prevents the eye from artificially inflating the square's bounding box!
    const eyeSVG = `
      <svg class="eye-wrapper" viewBox="0 0 67 39" x="${eyeProps.x}" y="${eyeProps.y}" width="${eyeProps.width}" height="${eyeProps.height}" style="transform: rotate(${eyeProps.rotation}deg); overflow: visible; opacity: 0;">
        <path class="eye-lid" d="M29.8665 37.0981C42.4609 37.0981 64.7881 20.0518 64.7881 20.0518C64.7881 20.0518 42.8777 -0.163855 29.8665 1.05279C16.8553 2.26944 1.34717 20.0518 1.34717 20.0518C1.34717 20.0518 17.272 37.0981 29.8665 37.0981Z" fill="black" stroke="black" stroke-width="2"/>
        <circle class="eye-pupil" cx="31.1463" cy="18.9801" r="11.6854" fill="none" stroke="white" stroke-width="6"/>
      </svg>
    `;

    // Safely parse the SVG string in the SVG namespace
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${eyeSVG}</svg>`, "image/svg+xml");
    const eyeNode = doc.documentElement.firstElementChild;
    sq.appendChild(eyeNode);
  });

  // Generate the wobbly paths for the squares once at startup!
  const sqCorners = [
    { x: -8, y: 0 },
    { x: 0, y: -8 },
    { x: 8, y: 0 },
    { x: 0, y: 8 }
  ];

  // Generate the wobbly paths independently for each box type using their specific properties!
  const dSqA = generateWobblyPolygon(sqCorners, sqProps.sqA.freq, sqProps.sqA.amp, sqProps.sqA.smoothness, 201);
  const dSqB = generateWobblyPolygon(sqCorners, sqProps.sqB.freq, sqProps.sqB.amp, sqProps.sqB.smoothness, 202);
  const dSqC = generateWobblyPolygon(sqCorners, sqProps.sqC.freq, sqProps.sqC.amp, sqProps.sqC.smoothness, 203);

  // Dynamically apply shape, stroke, and color
  const pathA = sqA.querySelector('path');
  pathA.setAttribute('d', dSqA);
  pathA.setAttribute('stroke-width', sqProps.sqA.strokeWidth);
  pathA.setAttribute('fill', 'var(--btn-default)');

  const pathB = sqB.querySelector('path');
  pathB.setAttribute('d', dSqB);
  pathB.setAttribute('stroke-width', sqProps.sqB.strokeWidth);
  pathB.setAttribute('fill', 'var(--btn-default)');

  const pathC = sqC.querySelector('path');
  pathC.setAttribute('d', dSqC);
  pathC.setAttribute('stroke-width', sqProps.sqC.strokeWidth);
  pathC.setAttribute('fill', 'var(--btn-default)');

  // Apply LINE_MODE stroke settings
  if (LINE_MODE === 3) {
    bgPath.setAttribute('stroke-width', '0');
    innerPath.setAttribute('stroke-width', '0');
    path.setAttribute('stroke-width', '0');
    pathA.setAttribute('stroke-width', '0');
    pathB.setAttribute('stroke-width', '0');
    pathC.setAttribute('stroke-width', '0');
  } else if (LINE_MODE === 4) {
    innerPath.setAttribute('stroke-width', '0');
    path.setAttribute('stroke-width', '0');
  }

  // ----------------------------------------------------
  // OFFSET CONTROLS: Change these x/y values to pull the 
  // squares closer or further from their vertex points!
  // 'origin' controls the pivot point for scaling.
  // "0px 0px" = Exact Center. (Note: Because the SVG is rotated 180deg, "8px 8px" is visually the Top-Left corner!)
  // ----------------------------------------------------
  const offsets = {
    sqA: { x: 0, y: 0, rotation: -10, origin: "0px 8px" },   // Blue Square
    sqB: { x: 0, y: 0, rotation: 25, origin: "6px 8px" },   // Lime Square
    sqC: { x: 0, y: 0, rotation: 35, origin: "6px 6px" }   // Magenta Square
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

  const state = {
    p1x: 60, p1y: 0,
    p2x: 60, p2y: 20,
    p3x: 60, p3y: 40,
    p4x: 60, p4y: 60,
    p5x: 40, p5y: 60,
    p6x: 20, p6y: 60,
    p7x: 0, p7y: 60,
    opacity: 0,

    // NEW: Inner Triangle Peeling State (Anchored exactly to the white flap's corners!)
    innerP1x: 60, innerP1y: 0,
    innerP2x: 60, innerP2y: 60,
    innerP3x: 0, innerP3y: 60,

    // NEW: Dynamic Clip State for the main card background
    clipX: cardProps.clipX,
    clipY: cardProps.clipY
  };

  let isDragging = false;
  let currentMouseX = 0;
  let currentMouseY = 0;
  let startX = 0;
  let startY = 0;
  let lockedButton = null;
  let initialPressX = 0;
  let initialPressY = 0;
  let pointerDownTime = 0;
  let holdTimer = null;
  let isCardPress = false;
  let canPeel = true;

  function updateProximity() {
    if (!isDragging) return; // ONLY allow the proximity effect when peeling!

    // Calculate tip coordinates exactly in the shared SVG space!
    const svgTipX = state.innerP2x;
    const svgTipY = state.innerP2y;

    // Helper function for strict Point-in-Triangle mathematical bounding!
    function isPointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
      const area = 0.5 * (-by * cx + ay * (-bx + cx) + ax * (by - cy) + bx * cy);
      if (Math.abs(area) < 0.1) return false;
      const s = 1 / (2 * area) * (ay * cx - ax * cy + (cy - ay) * px + (ax - cx) * py);
      const t = 1 / (2 * area) * (ax * by - ay * bx + (ay - by) * px + (bx - ax) * py);
      return s >= -0.05 && t >= -0.05 && 1 - s - t >= -0.05; // 5% tolerance margin
    }

    // PASS 1: STATE EVALUATION!
    // We evaluate logic for all buttons first to prevent 1-frame animation glitches

    // Calculate the centroid of the green triangle to determine how "deep" a button is inside it!
    const centroidX = (state.innerP1x + svgTipX + state.innerP3x) / 3;
    const centroidY = (state.innerP1y + svgTipY + state.innerP3y) / 3;

    const sqData = [sqA, sqB, sqC].map(sq => {
      let sqX = 0, sqY = 0;
      if (sq === sqA) { sqX = state.p2x + offsets.sqA.x; sqY = state.p2y + offsets.sqA.y; }
      if (sq === sqB) { sqX = state.p4x + offsets.sqB.x; sqY = state.p4y + offsets.sqB.y; }
      if (sq === sqC) { sqX = state.p6x + offsets.sqC.x; sqY = state.p6y + offsets.sqC.y; }

      // 1. Is the button inside the green triangle?
      // We strictly check the exact center of the button to prevent finicky selections!
      let isInsideTriangle = isPointInTriangle(sqX, sqY, state.innerP1x, state.innerP1y, svgTipX, svgTipY, state.innerP3x, state.innerP3y);

      // 2. Distances for tie-breaking and proximity swells
      const rect = sq.getBoundingClientRect();
      const sqCenterX = rect.left + rect.width / 2;
      const sqCenterY = rect.top + rect.height / 2;

      const mouseDist = Math.hypot(currentMouseX - sqCenterX, currentMouseY - sqCenterY);
      const tipDist = Math.hypot(svgTipX - sqX, svgTipY - sqY);
      const centroidDist = Math.hypot(centroidX - sqX, centroidY - sqY); // How deep inside the green area it is

      return { sq, tipDist, mouseDist, centroidDist, isInsideTriangle };
    });

    // Resolve Locks! (Purely Physics Based)
    lockedButton = null;

    // ONLY buttons that are actually inside the green area are eligible to be selected!
    let candidates = sqData.filter(d => d.isInsideTriangle);

    if (candidates.length > 0) {
      // If multiple buttons are covered by the green triangle:
      candidates.sort((a, b) => {
        const diff = a.centroidDist - b.centroidDist; // Primary: Closer to the centroid wins!

        // TIE-BREAKER: If they are roughly at the same depth inside the green area (within 15px of each other)
        if (Math.abs(diff) < 15) {
          // If the View button (sqB) is tied, it always wins!
          if (a.sq === sqB) return -1;
          if (b.sq === sqB) return 1;
        }

        return diff;
      });
      lockedButton = candidates[0].sq;
    }

    // PASS 2: VISUAL ANIMATION!
    sqData.forEach(data => {
      const { sq, tipDist, mouseDist } = data;

      // Determine visual state
      let scaleTarget = 1;
      let eyeOpacity = 0;
      let sqFill = "var(--btn-default)"; // Initial default color for ALL buttons

      if (lockedButton === sq) {
        // Stay fully highlighted and green as long as it's locked!
        scaleTarget = 4; // Max lock scale
        eyeOpacity = 1;
        sqFill = "var(--btn-active)";
      } else if (!lockedButton) {
        // If NO button is locked yet, do a subtle proximity swell effect (based on nearest actor)
        const maxDist = 50;
        if (tipDist < maxDist || mouseDist < maxDist) {
          const effectiveDist = Math.min(tipDist, mouseDist);
          // Subtle pop up to 2x max before it actually locks
          scaleTarget = 1 + (1 - effectiveDist / maxDist) * 1.0;
          eyeOpacity = 1;
        }
      }

      // Animate scale smoothly
      gsap.to(sq, { scale: scaleTarget, duration: 0.15, overwrite: "auto" });

      const sqPath = sq.querySelector('.sq-path');
      if (sqPath) {
        gsap.to(sqPath, { fill: sqFill, duration: 0.15, overwrite: "auto" });
      }

      // Animate eye opacity and colors if this square has an eye inside it!
      const eye = sq.querySelector('.eye-wrapper');
      if (eye) {
        let eyeLidColor = "var(--btn-default)";
        let eyePupilColor = "var(--btn-default)";

        if (lockedButton === sq) {
          eyeLidColor = "var(--eye-lid)";
          eyePupilColor = "var(--eye-pupil)";
        }

        gsap.to(eye, { opacity: eyeOpacity, duration: 0.15, overwrite: "auto" });
        gsap.to(eye.querySelector('.eye-lid'), { fill: eyeLidColor, stroke: eyeLidColor, duration: 0.15, overwrite: "auto" });
        gsap.to(eye.querySelector('.eye-pupil'), { stroke: eyePupilColor, duration: 0.15, overwrite: "auto" });
      }
    });
  }

  function render() {
    // UPDATE THE CARD BACKGROUND CLIP (Dynamic Peeling!)
    // We mathematically calculate the exact intersections to slice off corners when peeled outside!
    const cw = cardProps.width;
    const ch = cardProps.height;

    let cardCorners = [];
    const foldTopY = ch - state.clipY;
    const foldLeftX = cw - state.clipX;

    // Mathematical slope of the fold line (prevent divide by zero)
    const m = state.clipX === 0 ? -1 : state.clipY / -state.clipX;

    // Calculate where the fold line intersects the top (y=0) and left (x=0) axes
    const intersectX = m === 0 ? cw : cw - foldTopY / m;
    const intersectY = foldTopY - m * cw;

    // If the peel has completely crossed the top-left corner, the card is fully peeled away!
    if (intersectX <= 0 && intersectY <= 0) {
      cardCorners = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]; // Zero area polygon
    } else {
      cardCorners.push({ x: 0, y: 0 }); // Top-Left

      // Top Edge / Right Edge logic
      if (foldTopY < 0) {
        cardCorners.push({ x: Math.max(0, intersectX), y: 0 });
      } else {
        cardCorners.push({ x: cw, y: 0 });
        cardCorners.push({ x: cw, y: foldTopY });
      }

      // Bottom Edge / Left Edge logic
      if (foldLeftX < 0) {
        cardCorners.push({ x: 0, y: Math.max(0, Math.min(ch, intersectY)) });
      } else {
        cardCorners.push({ x: foldLeftX, y: ch });
        cardCorners.push({ x: 0, y: ch });
      }
    }

    const dCard = generateWobblyPolygon(cardCorners, cardProps.freq, cardProps.amp, cardProps.smoothness, 0);
    bgPath.setAttribute('d', dCard);
    clipPath.setAttribute('d', dCard);

    // DRAW THE WHITE 7-POINT FLAP
    const triCorners = [
      { x: state.p1x, y: state.p1y },
      { x: state.p2x, y: state.p2y },
      { x: state.p3x, y: state.p3y },
      { x: state.p4x, y: state.p4y },
      { x: state.p5x, y: state.p5y },
      { x: state.p6x, y: state.p6y },
      { x: state.p7x, y: state.p7y },
    ];
    // Re-calculate the wobbly path for the triangle on every frame as it animates!
    const isFlapStraight = LINE_MODE === 4; // Mode 4 flattens the peel polygons!
    const dTri = generateWobblyPolygon(triCorners, cardProps.freq, cardProps.amp * 1.5, cardProps.smoothness, 100, isFlapStraight);
    path.setAttribute('d', dTri);

    // DRAW THE INDEPENDENT INNER 3-POINT PEEL TRIANGLE
    if (innerPath) {
      const innerCorners = [
        // Apply the user's custom offsets dynamically to the vertices!
        { x: state.innerP1x + innerTriProps.p1Offset.x, y: state.innerP1y + innerTriProps.p1Offset.y },
        { x: state.innerP2x + innerTriProps.p2Offset.x, y: state.innerP2y + innerTriProps.p2Offset.y },
        { x: state.innerP3x + innerTriProps.p3Offset.x, y: state.innerP3y + innerTriProps.p3Offset.y }
      ];
      // Generate its own mathematical wobble
      const dInner = generateWobblyPolygon(innerCorners, innerTriProps.freq, innerTriProps.amp, innerTriProps.smoothness, 101, isFlapStraight);
      innerPath.setAttribute('d', dInner);
    }

    // Physically lock the squares to the vertices plus their custom offsets!
    gsap.set(sqA, { x: state.p2x + offsets.sqA.x, y: state.p2y + offsets.sqA.y, rotation: offsets.sqA.rotation, opacity: state.opacity, transformOrigin: offsets.sqA.origin });
    gsap.set(sqB, { x: state.p4x + offsets.sqB.x, y: state.p4y + offsets.sqB.y, rotation: offsets.sqB.rotation, opacity: state.opacity, transformOrigin: offsets.sqB.origin });
    gsap.set(sqC, { x: state.p6x + offsets.sqC.x, y: state.p6y + offsets.sqC.y, rotation: offsets.sqC.rotation, opacity: state.opacity, transformOrigin: offsets.sqC.origin });

    // CONTINUOUSLY recalculate proximity while the squares are moving!
    updateProximity();
  }

  render();

  const duration = 0.4;
  const customEase = "back.out(1.2)";

  // THE PROXIMITY LOGIC (Optimal Window implementation)
  function handleMouseMove(e) {
    if (!isDragging) return;

    // Check if it's a real browser event vs our fake GSAP cursor
    const isRealEvent = e && e.type && e.type !== 'fake';
    const isInstant = e && e.isInstant;

    if (isRealEvent) {
      currentMouseX = e.touches ? e.touches[0].clientX : e.clientX;
      currentMouseY = e.touches ? e.touches[0].clientY : e.clientY;

      // If they haven't held long enough to lock the peel, check if they are trying to scroll!
      if (!canPeel) {
        const moveDist = Math.hypot(currentMouseX - initialPressX, currentMouseY - initialPressY);
        if (moveDist > 10) {
          // They moved a lot before the hold timer fired. This is a scroll! Abort the peel!
          isDragging = false;
          handleMouseUp({ isAbort: true });
          return;
        }
        return; // Ignore tiny finger jitters while waiting for the hold timer
      }

      // If we reach here, canPeel is true (either it's the hitbox, or they held the card long enough).
      // We block native browser scrolling so our peel is silky smooth!
      if (e.cancelable && e.preventDefault) e.preventDefault();
    } else {
      // It's the fake event from GSAP or timeout
      currentMouseX = e.clientX;
      currentMouseY = e.clientY;
    }

    // Calculate how far the mouse has been dragged diagonally.
    const rawDx = startX - currentMouseX;
    const rawDy = startY - currentMouseY;

    // Mobile thumb-obscurity fix: Multiply the physical drag distance on touch devices 
    // so the green peel stays visually ahead of the user's thumb!
    // We only multiply positive (forward) drag so pushing backward remains 1:1.
    const dragMultiplier = e.touches ? 1.6 : 1.0;
    const computedDx = rawDx > 0 ? rawDx * dragMultiplier : rawDx;
    const computedDy = rawDy > 0 ? rawDy * dragMultiplier : rawDy;

    // We allow negative drag so you can push the peel backward, but we clamp it 
    // exactly at the unpeeled bounds (-60, -56) so it can't go outside the card!
    const dragDistanceX = Math.max(-cardProps.clipX, computedDx);
    const dragDistanceY = Math.max(-cardProps.clipY, computedDy);

    // Calculate a dynamic organic "sway" using sine waves so the base points wobble as you drag!
    // This breaks the rigid 90-deg angle at the tip dynamically!
    const swayX = Math.sin(dragDistanceY * 0.05) * 12;
    const swayY = Math.sin(dragDistanceX * 0.05) * 12;

    // Sync the inner sticker and card background perfectly to the mouse drag!
    // We clamp to 0 to prevent the 'sway' from pushing the points outside the rectangle when pushed fully back!
    gsap.to(state, {
      clipX: Math.max(0, cardProps.clipX + dragDistanceX + swayX),
      clipY: Math.max(0, cardProps.clipY + dragDistanceY + swayY),

      // innerP1 (Bottom Cut) slides horizontally, but now dynamically SWAYS along the X axis!
      innerP1x: Math.max(0, 60 + dragDistanceX + swayX),
      innerP1y: 0,

      // innerP3 (Top Cut) slides vertically, but now dynamically SWAYS along the Y axis!
      innerP3x: 0,
      innerP3y: Math.max(0, 60 + dragDistanceY + swayY),

      // The tip vertex moves freely in both directions with the cursor!
      innerP2x: Math.max(0, 60 + dragDistanceX),
      innerP2y: Math.max(0, 60 + dragDistanceY),

      // We set duration to 0 so it instantly tracks the finger 1:1 with ZERO latency!
      duration: 0,
      overwrite: "auto",
      onUpdate: render
    });

    updateProximity();
  }

  // THE RELEASE LOGIC
  function handleMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;

    // Always clear the timer so a scroll or fast release doesn't accidentally trigger a late peel!
    clearTimeout(holdTimer);

    // Clean up window listeners immediately so real mouse movements don't interfere with animations!
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchend', handleMouseUp);
    window.removeEventListener('touchcancel', handleMouseUp);

    const isAbort = e && e.isAbort;
    if (isAbort) lockedButton = null;

    const pressDuration = Date.now() - pointerDownTime;
    const endX = e && e.changedTouches ? e.changedTouches[0].clientX : (e ? e.clientX : currentMouseX);
    const endY = e && e.changedTouches ? e.changedTouches[0].clientY : (e ? e.clientY : currentMouseY);
    const physicalDragDist = Math.hypot(endX - initialPressX, endY - initialPressY);

    const executeFlyaway = () => {
      // Kill any lingering animations on 'state' (like the white flap opening) so it doesn't fight the flyaway math!
      gsap.killTweensOf(state);

      let targetPage = 'project1.html';
      if (lockedButton === sqA) targetPage = 'summary.html';
      if (lockedButton === sqB) targetPage = 'project1.html';
      if (lockedButton === sqC) targetPage = 'media.html';

      // Lock interactions
      document.body.style.pointerEvents = 'none';

      // 1. Preload the exact selected page while the animation plays!
      const prefetch = document.createElement('link');
      prefetch.rel = 'prefetch';
      prefetch.href = targetPage;
      document.head.appendChild(prefetch);

      const activeWrap = card.closest('.wrap');

      // Calculate the vector of the drag so the peel flies off in the exact direction!
      const dragDx = startX - currentMouseX;
      const dragDy = startY - currentMouseY;

      // If there is almost no drag (e.g. just a click), give it a default diagonal trajectory
      const dirX = Math.abs(dragDx) > 1 ? dragDx : 10;
      const dirY = Math.abs(dragDy) > 1 ? dragDy : 10;

      const mag = Math.hypot(dirX, dirY);
      const normX = dirX / mag;
      const normY = dirY / mag;

      // Capture the exact starting position of the dynamic clip and inner triangle!
      const releaseBases = {
        clipX: state.clipX,
        clipY: state.clipY,
        innerP1x: state.innerP1x,
        innerP3y: state.innerP3y,
        innerP2x: state.innerP2x,
        innerP2y: state.innerP2y,
      };

      // Capture the EXACT position of the white flap at the moment of release!
      const flapBases = {
        p1x: state.p1x, p1y: state.p1y,
        p2x: state.p2x, p2y: state.p2y,
        p3x: state.p3x, p3y: state.p3y,
        p4x: state.p4x, p4y: state.p4y,
        p5x: state.p5x, p5y: state.p5y,
        p6x: state.p6x, p6y: state.p6y,
        p7x: state.p7x, p7y: state.p7y,
      };

      // We animate a proxy value representing the "continuous pull distance"
      const proxy = { dist: 0, blend: 0 };
      gsap.to(proxy, {
        dist: 1200, // Pull it 1200 pixels away!
        blend: 1,   // Curve fully to the target trajectory by the end
        duration: 0.6,
        ease: "power2.in",
        onUpdate: () => {
          const targetNormX = 1;
          const targetNormY = 1;
          const targetMag = Math.hypot(targetNormX, targetNormY);

          const curX = normX * (1 - proxy.blend) + (targetNormX / targetMag) * proxy.blend;
          const curY = normY * (1 - proxy.blend) + (targetNormY / targetMag) * proxy.blend;
          const curMag = Math.hypot(curX, curY);
          const curvedNormX = curX / curMag;
          const curvedNormY = curY / curMag;

          const extraX = proxy.dist * curvedNormX;
          const extraY = proxy.dist * curvedNormY;

          state.clipX = releaseBases.clipX + extraX;
          state.clipY = releaseBases.clipY + extraY;

          state.innerP1x = releaseBases.innerP1x + extraX; state.innerP1y = 0;
          state.innerP3x = 0; state.innerP3y = releaseBases.innerP3y + extraY;
          state.innerP2x = releaseBases.innerP2x + extraX; state.innerP2y = releaseBases.innerP2y + extraY;

          const dx = proxy.dist * curvedNormX;
          const dy = proxy.dist * curvedNormY;

          state.p1x = flapBases.p1x + dx;
          state.p1y = flapBases.p1y + dy;
          state.p2x = flapBases.p2x + dx;
          state.p2y = flapBases.p2y + dy;
          state.p3x = flapBases.p3x + dx;
          state.p3y = flapBases.p3y + dy;
          state.p4x = flapBases.p4x + dx;
          state.p4y = flapBases.p4y + dy;
          state.p5x = flapBases.p5x + dx;
          state.p5y = flapBases.p5y + dy;
          state.p6x = flapBases.p6x + dx;
          state.p6y = flapBases.p6y + dy;
          state.p7x = flapBases.p7x + dx;
          state.p7y = flapBases.p7y + dy;

          render();
        },
        onComplete: () => {
          window.location.href = targetPage;
        }
      });

      gsap.to(activeWrap, { opacity: 0, duration: 0.3, delay: 0.3, ease: "power2.in" });
    };

    // 1. TAP / CLICK ON MAIN CARD DETECTED: Emulate cursor drag to view (sqB)
    if (isCardPress && !isAbort && pressDuration < 250 && physicalDragDist < 10) {
      isDragging = true;

      // Because we delayed the white flap animation to the hold timer, we must manually snap it open now
      // so that it visually exists during the click emulation and flyaway!
      gsap.to(state, {
        duration: 0.35,
        ease: customEase,
        overwrite: "auto",
        ...flapOpenState,
        opacity: 1
      });

      // We simulate a drag that moves exactly CLICK_DRAG_X and CLICK_DRAG_Y SVG units diagonally.
      // This allows you to manually nudge where the peel tip lands over the button!
      // By using 0 as the start, and animating to negative values, we get exactly the requested distance cleanly.
      startX = 0;
      startY = 0;

      const fakeCursor = { x: 0, y: 0 };
      const targetX = -CLICK_DRAG_X; // Yields a precise rawDx of CLICK_DRAG_X
      const targetY = -CLICK_DRAG_Y; // Yields a precise rawDy of CLICK_DRAG_Y

      gsap.to(fakeCursor, {
        x: targetX,
        y: targetY,
        duration: 0.35,
        ease: "power2.inOut",
        onUpdate: () => {
          // Feed the fake cursor directly into the native mouse move logic!
          // We pass isInstant: true so the green peel precisely follows the fake cursor without any visual drag/lag.
          handleMouseMove({ clientX: fakeCursor.x, clientY: fakeCursor.y, type: 'fake', isInstant: true });
        },
        onComplete: () => {
          lockedButton = sqB;
          executeFlyaway();
        }
      });
      return;
    }

    // 2. EXCESSIVE DRAG DETECTED: Default to view (sqB) if dragged heavily towards opposite diagonal but missed buttons
    if (!lockedButton && (state.innerP2x > 160 && state.innerP2y > 160)) {
      lockedButton = sqB;
    }

    // Execute transition if a button was locked!
    if (lockedButton) {
      executeFlyaway();
      return; // Skip the snap-back animation entirely!
    }

    // Reset square scales
    gsap.to([sqA, sqB, sqC], { scale: 1, duration: 0.3, overwrite: "auto" });

    // Interrupt and fade out any active eyes when the mouse is released!
    const activeEyes = card.querySelectorAll('.eye-wrapper');
    if (activeEyes.length > 0) {
      gsap.to(activeEyes, { opacity: 0, duration: 0.3, overwrite: "auto" });
    }

    // Snap the physics state back
    gsap.to(state, {
      duration,
      ease: "power3.out", // Changed to power3 to prevent overshoot when pulling back!
      overwrite: true,
      p1x: 60, p1y: 0,
      p2x: 60, p2y: 20,
      p3x: 60, p3y: 40,
      p4x: 60, p4y: 60,
      p5x: 40, p5y: 60,
      p6x: 20, p6y: 60,
      p7x: 0, p7y: 60,
      opacity: 0,

      // Reset the inner sticker peel to exactly match the white flap
      innerP1x: 60, innerP1y: 0,
      innerP2x: 60, innerP2y: 60,
      innerP3x: 0, innerP3y: 60,
      clipX: cardProps.clipX,
      clipY: cardProps.clipY,

      onUpdate: render
    });
  }

  // THE PRESS LOGIC
  function handleMouseDown(e) {
    if (isDragging) return; // Prevent double firing
    isDragging = true;
    lockedButton = null; // Reset selection lock on new press

    // Check if the user pressed the main card instead of the corner hitbox
    isCardPress = !e.target.closest('.hitbox');
    const isTouch = !!e.touches;

    // On PC (mouse), we can peel immediately because there is no touch-scrolling gesture to wait for!
    // On mobile (touch), if they touch the main card, we wait 250ms to ensure they aren't trying to swipe/scroll.
    canPeel = !isTouch || !isCardPress;

    // Capture initial mouse position instantly
    currentMouseX = isTouch ? e.touches[0].clientX : e.clientX;
    currentMouseY = isTouch ? e.touches[0].clientY : e.clientY;

    initialPressX = currentMouseX;
    initialPressY = currentMouseY;
    pointerDownTime = Date.now();

    startX = currentMouseX;
    startY = currentMouseY;

    const openWhiteFlap = () => {
      gsap.to(state, {
        duration,
        ease: customEase,
        overwrite: "auto",
        ...flapOpenState,
        opacity: 1,
        onUpdate: render
      });
    };

    // Hold timer for exactly matching the drag delta without jumping!
    clearTimeout(holdTimer);
    if (!canPeel) {
      holdTimer = setTimeout(() => {
        if (!isDragging) return;
        canPeel = true; // Timer fired! They held it long enough. Allow peeling!

        openWhiteFlap(); // Visually reveal the flap!

        // Update startX/Y to the CURRENT mouse position!
        startX = currentMouseX;
        startY = currentMouseY;

      }, MOBILE_HOLD_DELAY);
    } else {
      // It's PC or the hitbox! Open the flap immediately!
      openWhiteFlap();
    }

    window.addEventListener('mousemove', handleMouseMove);
    // MUST be passive: false so we can e.preventDefault() later if they peel!
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp, { passive: true });
    window.addEventListener('touchcancel', handleMouseUp, { passive: true });
  }

  // Attach interaction to the entire card
  // (We removed touchAction: 'none' so the browser CAN scroll if they swipe immediately)
  card.addEventListener('mousedown', handleMouseDown);
  card.addEventListener('touchstart', handleMouseDown, { passive: true });

  // ----------------------------------------------------
  // ACCESSIBILITY & KEYBOARD SUPPORT
  // ----------------------------------------------------
  // When a user Tabs to a button, we visually pop it out!
  // When they hit Enter/Space, we trigger the click emulation for that specific button!
  // A shared persistent tracker so we can smoothly transition between buttons!
  let fakeCursor = { x: 0, y: 0 };

  [sqA, sqB, sqC].forEach(sq => {
    sq.addEventListener('focus', () => {
      // Nudge the flap mathematically over the focused button to complete the visual effect
      let targetX = 0, targetY = 0;
      if (sq === sqA) { targetX = -130; targetY = -40; }
      if (sq === sqB) { targetX = -CLICK_DRAG_X; targetY = -CLICK_DRAG_Y; }
      if (sq === sqC) { targetX = -40; targetY = -140; }

      // If we are already dragging (i.e. tabbing from another button), don't reset the cursor!
      // This makes the green peel slide smoothly from one option to the other.
      isDragging = true;
      startX = 0; startY = 0;

      gsap.killTweensOf(fakeCursor); // Cancel any previous fake drag
      gsap.killTweensOf(state); // Cancel the snap-back from the blur event!

      // 1. Visually open the white flap just like when physically holding down!
      gsap.to(state, {
        duration: 0.3,
        ...flapOpenState,
        opacity: 1,
        onUpdate: render
      });

      // 2. Simultaneously drag the green peel over the button!
      gsap.to(fakeCursor, {
        x: targetX, y: targetY, duration: 0.35, ease: "power2.out",
        onUpdate: () => handleMouseMove({ clientX: fakeCursor.x, clientY: fakeCursor.y, type: 'fake', isInstant: true }),
        onComplete: () => { lockedButton = sq; }
      });
    });

    sq.addEventListener('blur', () => {
      lockedButton = null;
      isDragging = true;
      gsap.killTweensOf(fakeCursor);
      handleMouseUp({ type: 'fake', isAbort: true });
    });

    sq.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        lockedButton = sq; // Ensure it is locked for the flyaway
        isDragging = true;
        handleMouseUp({ type: 'fake' });
      }
    });
  });
});
