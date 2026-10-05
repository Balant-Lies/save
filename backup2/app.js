const cards = document.querySelectorAll('.card');

cards.forEach(card => {
  const hitbox = card.querySelector('.hitbox');
  const path = card.querySelector('.triangle-path');

  const sqA = card.querySelector('.sq-A');
  const sqB = card.querySelector('.sq-B');
  const sqC = card.querySelector('.sq-C');

  // ----------------------------------------------------
  // OFFSET CONTROLS: Change these x/y values to pull the 
  // squares closer or further from their vertex points!
  // 'origin' controls the pivot point for scaling.
  // "0px 0px" = Exact Center. (Note: Because the SVG is rotated 180deg, "8px 8px" is visually the Top-Left corner!)
  // ----------------------------------------------------
  const offsets = {
    sqA: { x: 0, y: 0, origin: "0px 8px" },   // Blue Square
    sqB: { x: 0, y: 0, origin: "0px 0px" },   // Lime Square
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
      if (dist < maxDist) {
        // Grow up to 3x (1 + 2) based on your custom modifier
        scaleTarget = 1 + (1 - dist / maxDist) * 2;
      }

      // Animate scale smoothly
      gsap.to(sq, { scale: scaleTarget, duration: 0.15, overwrite: "auto" });
    });
  }

  function render() {
    const d = `M ${state.p1x},${state.p1y} L ${state.p2x},${state.p2y} L ${state.p3x},${state.p3y} L ${state.p4x},${state.p4y} L ${state.p5x},${state.p5y} L ${state.p6x},${state.p6y} L ${state.p7x},${state.p7y} Z`;
    path.setAttribute('d', d);

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

    // Snap the physics state back
    gsap.to(state, {
      duration,
      ease: customEase,
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
