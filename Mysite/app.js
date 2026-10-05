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
  p1Offset: { x: -3, y: 5 },   // Top corner offset
  p2Offset: { x: -3, y: -4 },  // Bottom-Right corner offset
  p3Offset: { x: 8, y: -4 },  // Bottom-Left corner offset
  
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
  sqA: { color: "blue", strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqB: { color: "white", strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
  sqC: { color: "magenta", strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 }
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
        <circle class="eye-pupil" cx="31.1463" cy="18.9801" r="11.6854" stroke="white" stroke-width="6"/>
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
    opacity: 0
  };

  let isDragging = false;
  let currentMouseX = 0;
  let currentMouseY = 0;

  function updateProximity() {
    if (!isDragging) return;

    [sqA, sqB, sqC].forEach(sq => {
      // Calculate real screen coordinates dynamically
      const rect = sq.getBoundingClientRect();
      const sqCenterX = rect.left + rect.width / 2;
      const sqCenterY = rect.top + rect.height / 2;

      const dist = Math.hypot(currentMouseX - sqCenterX, currentMouseY - sqCenterY);
      const maxDist = 90;

      let scaleTarget = 1;
      let eyeOpacity = 0;
      
      if (dist < maxDist) {
        // Grow up to 3x (1 + 2) based on your custom modifier
        scaleTarget = 1 + (1 - dist / maxDist) * 3;
        // Trigger a full fade-in the moment the mouse enters the radius!
        eyeOpacity = 1; 
      }

      // Animate scale smoothly
      gsap.to(sq, { scale: scaleTarget, duration: 0.15, overwrite: "auto" });

      // Animate eye opacity if this square has an eye inside it!
      const eye = sq.querySelector('.eye-wrapper');
      if (eye) {
        gsap.to(eye, { opacity: eyeOpacity, duration: 0.15, overwrite: "auto" });
      }
    });
  }

  function render() {
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

    // DRAW THE INNER 3-POINT TRIANGLE
    if (innerPath) {
      const innerCorners = [
        { x: state.p1x + innerTriProps.p1Offset.x, y: state.p1y + innerTriProps.p1Offset.y },
        { x: state.p4x + innerTriProps.p2Offset.x, y: state.p4y + innerTriProps.p2Offset.y },
        { x: state.p7x + innerTriProps.p3Offset.x, y: state.p7y + innerTriProps.p3Offset.y }
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

    updateProximity();
  }

  // THE RELEASE LOGIC
  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;

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
      onUpdate: render
    });
  }

  // THE PRESS LOGIC
  function handleMouseDown(e) {
    if (isDragging) return; // Prevent double firing
    isDragging = true;

    // Capture initial mouse position instantly
    currentMouseX = e.touches ? e.touches[0].clientX : e.clientX;
    currentMouseY = e.touches ? e.touches[0].clientY : e.clientY;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp, { passive: true });

    gsap.to(state, {
      duration,
      ease: customEase,
      overwrite: true,
      // Your exact custom coordinates!
      p1x: 70, p1y: 0,
      p2x: 160, p2y: 30,
      p3x: 104, p3y: 60,
      p4x: 140, p4y: 110,
      p5x: 55, p5y: 104,
      p6x: 65, p6y: 150,
      p7x: -40, p7y: 50,
      opacity: 1,
      onUpdate: render
    });
  }

  // Only the initial press is attached to the hitbox itself
  hitbox.addEventListener('mousedown', handleMouseDown);
  hitbox.addEventListener('touchstart', handleMouseDown, { passive: true });
});
