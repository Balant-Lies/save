// ----------------------------------------------------
// EYE CONTROLS
// ----------------------------------------------------
// By using width/height, we strictly lock the eye's bounding box so it doesn't break GSAP's square scaling!
const eyeProps = {
  width: 10,        // Width of the eye inside the square (made it smaller than the square!)
  height: 5.8,      // Height of the eye (maintaining Figma's 67x39 ratio)
  x: -5,            // X position (half of width to center it)
  y: -2.9,          // Y position (half of height to center it)
  rotation: 160     // Rotation in degrees
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
  p1Offset: { x: -4, y: 3 },   // Top corner offset
  p2Offset: { x: -2, y: -3 },  // Bottom-Right corner offset
  p3Offset: { x: 2, y: -3 },  // Bottom-Left corner offset

  // Physics controls (matches card by default)
  freq: 0.15,
  amp: 0.9,
  smoothness: 5
};

// ----------------------------------------------------
// SQUARE (BOX) CONTROLS
// Controls the geometry, wobbly strokes, and thickness of the boxes
// ----------------------------------------------------
const sqProps = {
  sqA: { color: "white", strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqB: { color: "white", strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqC: { color: "white", strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 }
};

// A generic function that takes ANY array of corner coordinates
// and generates a mathematical wobbly path between them!
function generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset = 0) {
  let d = "";
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
  pathA.setAttribute('fill', sqProps.sqA.color);

  const pathB = sqB.querySelector('path');
  pathB.setAttribute('d', dSqB);
  pathB.setAttribute('stroke-width', sqProps.sqB.strokeWidth);
  pathB.setAttribute('fill', sqProps.sqB.color);

  const pathC = sqC.querySelector('path');
  pathC.setAttribute('d', dSqC);
  pathC.setAttribute('stroke-width', sqProps.sqC.strokeWidth);
  pathC.setAttribute('fill', sqProps.sqC.color);

  // ----------------------------------------------------
  // OFFSET CONTROLS: Change these x/y values to pull the 
  // squares closer or further from their vertex points!
  // 'origin' controls the pivot point for scaling.
  // "0px 0px" = Exact Center. (Note: Because the SVG is rotated 180deg, "8px 8px" is visually the Top-Left corner!)
  // ----------------------------------------------------
  const offsets = {
    sqA: { x: 0, y: 0, origin: "0px 8px" },   // Blue Square
    sqB: { x: 0, y: 0, origin: "4px 4px" },   // Lime Square
    sqC: { x: 0, y: 0, origin: "8px 0px" }   // Magenta Square
  };

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
    const sqData = [sqA, sqB, sqC].map(sq => {
      let sqX = 0, sqY = 0;
      if (sq === sqA) { sqX = state.p2x + offsets.sqA.x; sqY = state.p2y + offsets.sqA.y; }
      if (sq === sqB) { sqX = state.p4x + offsets.sqB.x; sqY = state.p4y + offsets.sqB.y; }
      if (sq === sqC) { sqX = state.p6x + offsets.sqC.x; sqY = state.p6y + offsets.sqC.y; }

      // 1. Is the button inside the green triangle?
      let isInsideTriangle = false;
      // We check the center and a small radius around the button to see if the triangle covers it
      const r = 10;
      const pts = [
        { x: sqX, y: sqY }, { x: sqX - r, y: sqY }, { x: sqX + r, y: sqY }, { x: sqX, y: sqY - r }, { x: sqX, y: sqY + r }
      ];
      for (let pt of pts) {
        if (isPointInTriangle(pt.x, pt.y, state.innerP1x, state.innerP1y, svgTipX, svgTipY, state.innerP3x, state.innerP3y)) {
          isInsideTriangle = true; break;
        }
      }

      // 2. Is the physical mouse touching it? (Fallback for mobile)
      const rect = sq.getBoundingClientRect();
      const sqCenterX = rect.left + rect.width / 2;
      const sqCenterY = rect.top + rect.height / 2;
      const mouseDist = Math.hypot(currentMouseX - sqCenterX, currentMouseY - sqCenterY);
      const isMouseTouching = mouseDist < 20;

      // Distance to the green tip
      const tipDist = Math.hypot(svgTipX - sqX, svgTipY - sqY);

      return { sq, tipDist, mouseDist, isInsideTriangle, isMouseTouching };
    });

    // Resolve Locks! (Purely Physics Based)
    lockedButton = null;
    let candidates = sqData.filter(d => d.isInsideTriangle || d.isMouseTouching);

    if (candidates.length > 0) {
      // TIE-BREAKER: If multiple buttons are covered by the green triangle, 
      // the one CLOSEST TO THE TIP (or physical mouse) wins! This makes the tip act like a cursor.
      candidates.sort((a, b) => {
        const distA = Math.min(a.tipDist, a.mouseDist);
        const distB = Math.min(b.tipDist, b.mouseDist);
        return distA - distB;
      });
      lockedButton = candidates[0].sq;
    }

    // PASS 2: VISUAL ANIMATION!
    sqData.forEach(data => {
      const { sq, tipDist, mouseDist } = data;

      // Determine visual state
      let scaleTarget = 1;
      let eyeOpacity = 0;
      let sqFill = "white"; // Initial white color for ALL buttons

      if (lockedButton === sq) {
        // Stay fully highlighted and green as long as it's locked!
        scaleTarget = 4; // Max lock scale
        eyeOpacity = 1;
        sqFill = "#1A885C";
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
        let eyeLidColor = "black";
        let eyePupilColor = "white";

        if (lockedButton === sq) {
          eyeLidColor = "white";
          eyePupilColor = "#1A885C";
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
    const dTri = generateWobblyPolygon(triCorners, cardProps.freq, cardProps.amp * 1.5, cardProps.smoothness, 100);
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
      const dInner = generateWobblyPolygon(innerCorners, innerTriProps.freq, innerTriProps.amp, innerTriProps.smoothness, 101);
      innerPath.setAttribute('d', dInner);
    }

    // Physically lock the squares to the vertices plus their custom offsets!
    gsap.set(sqA, { x: state.p2x + offsets.sqA.x, y: state.p2y + offsets.sqA.y, opacity: state.opacity, transformOrigin: offsets.sqA.origin });
    gsap.set(sqB, { x: state.p4x + offsets.sqB.x, y: state.p4y + offsets.sqB.y, opacity: state.opacity, transformOrigin: offsets.sqB.origin });
    gsap.set(sqC, { x: state.p6x + offsets.sqC.x, y: state.p6y + offsets.sqC.y, opacity: state.opacity, transformOrigin: offsets.sqC.origin });

    // CONTINUOUSLY recalculate proximity while the squares are moving!
    updateProximity();
  }

  render();

  const duration = 0.4;
  const customEase = "back.out(1.2)";

  // THE PROXIMITY LOGIC (Optimal Window implementation)
  function handleMouseMove(e) {
    if (!isDragging) return;

    // Support both mouse and touch locations natively
    currentMouseX = e.touches ? e.touches[0].clientX : e.clientX;
    currentMouseY = e.touches ? e.touches[0].clientY : e.clientY;

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
      duration: 0.1,
      overwrite: "auto",
      onUpdate: render
    });

    updateProximity();
  }

  // THE RELEASE LOGIC
  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;

    // Execute transition if a button was locked!
    if (lockedButton) {
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
      // This ensures absolutely zero jumping when the animation takes over, preserving 
      // the exact state (including sway and mobile multipliers) from the final frame!
      const releaseBases = {
        clipX: state.clipX,
        clipY: state.clipY,
        innerP1x: state.innerP1x,
        innerP3y: state.innerP3y,
        innerP2x: state.innerP2x,
        innerP2y: state.innerP2y,
      };

      // Capture the EXACT position of the white flap at the moment of release!
      // This guarantees it will not jump or teleport when the transition starts!
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
      // We also animate a blend factor to smoothly curve the trajectory toward the top-left (1,1)
      // so that it ALWAYS cleanly completes the clipping peel off the screen, regardless of which button was selected!
      const proxy = { dist: 0, blend: 0 };
      gsap.to(proxy, {
        dist: 1200, // Pull it 1200 pixels away!
        blend: 1,   // Curve fully to the target trajectory by the end
        duration: 0.6,
        ease: "power2.in",
        onUpdate: () => {
          // Target vector to cleanly finish peeling off the top-left corner
          const targetNormX = 1;
          const targetNormY = 1;
          const targetMag = Math.hypot(targetNormX, targetNormY);

          // Interpolate the direction vector as we fly away!
          const curX = normX * (1 - proxy.blend) + (targetNormX / targetMag) * proxy.blend;
          const curY = normY * (1 - proxy.blend) + (targetNormY / targetMag) * proxy.blend;
          const curMag = Math.hypot(curX, curY);
          const curvedNormX = curX / curMag;
          const curvedNormY = curY / curMag;

          const extraX = proxy.dist * curvedNormX;
          const extraY = proxy.dist * curvedNormY;

          // Sync all dynamic elements to fly off in the curved direction starting EXACTLY from their last known position!
          state.clipX = releaseBases.clipX + extraX;
          state.clipY = releaseBases.clipY + extraY;

          state.innerP1x = releaseBases.innerP1x + extraX; state.innerP1y = 0;
          state.innerP3x = 0; state.innerP3y = releaseBases.innerP3y + extraY;
          state.innerP2x = releaseBases.innerP2x + extraX; state.innerP2y = releaseBases.innerP2y + extraY;

          // Animate the white flap linearly from its EXACT current position, along the curve!
          // No multipliers, so the flap stays perfectly solid and maintains its shape as it flies!
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

      // Fade the entire wrap slightly at the very end so that if the mathematical polygon
      // inverts outside the SVG bounds, we don't see any visual glitch!
      gsap.to(activeWrap, { opacity: 0, duration: 0.3, delay: 0.3, ease: "power2.in" });

      // The OTHER cards are left completely alone, exactly as requested!

      return; // Skip the snap-back animation entirely!
    }

    // Clean up window listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchend', handleMouseUp);

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

    // Capture initial mouse position instantly
    currentMouseX = e.touches ? e.touches[0].clientX : e.clientX;
    currentMouseY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = currentMouseX;
    startY = currentMouseY;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp, { passive: true });

    gsap.to(state, {
      duration,
      ease: customEase,
      overwrite: "auto",

      // ONLY animate the white flap! (The inner triangle and clip are handled by the mouse drag)
      p1x: 0, p1y: -40,
      p2x: 160, p2y: 30,
      p3x: 104, p3y: 60,
      p4x: 140, p4y: 110,
      p5x: 55, p5y: 104,
      p6x: 65, p6y: 150,
      p7x: -500, p7y: 80,
      opacity: 1,

      onUpdate: render
    });
  }

  // Only the initial press is attached to the hitbox itself
  hitbox.addEventListener('mousedown', handleMouseDown);
  hitbox.addEventListener('touchstart', handleMouseDown, { passive: true });
});
