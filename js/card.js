// ====================================================
// CARD MAIN INTERACTIVE CONTROLLER
// Coordinates drag physics, mouse/touch events, accessibility,
// and orchestrates the modular CardRender, CardButtons, and CardTransitions modules.
// ====================================================

function initCard(wrap, customConfig) {
  // Use custom config if provided, or default to global CardConfig
  const config = customConfig || (typeof CardConfig !== 'undefined' ? CardConfig : {});
  const {
    strokeProps = { card: 2, flap: 0, innerPeel: 0, buttons: 0, wobble: true },
    LINE_MODE,
    transitionProps = { flyawayDuration: 0.45, loadingHoldDuration: 1.2, fadeDuration: 0.25 },
    eyeProps = { width: 10, height: 5.8, x: -5, y: -3, rotation: 135 },
    summaryProps = { scale: 1, x: 0, y: 0, rotation: 0 },
    buttonProximityProps = { startDistance: 85, fullSizeDistance: 45, instantIcon: true, growthMode: 'gradual', iconAppearPercent: 0.5, maxScale: 4 },
    cardProps = { width: 300, height: 250, clipX: 60, clipY: 56, freq: 0.15, amp: 0.9, smoothness: 5 },
    flapClosedState = {
      p1x: 60, p1y: 0,
      p2x: 60, p2y: 20,
      p3x: 60, p3y: 40,
      p4x: 60, p4y: 60,
      p5x: 40, p5y: 60,
      p6x: 20, p6y: 60,
      p7x: 0,  p7y: 60
    },
    greenPeelClosedState = {
      innerP1x: 60, innerP1y: 0,
      innerP2x: 60, innerP2y: 60,
      innerP3x: 0,  innerP3y: 60
    },
    greenPeelOpenState = {
      innerP1x: 60, innerP1y: 0,
      innerP2x: 60, innerP2y: 60,
      innerP3x: 0,  innerP3y: 60
    },
    innerTriProps = {
      p1Offset: { x: -2, y: 2 },
      p2Offset: { x: -2, y: -2 },
      p3Offset: { x: 2, y: -2 },
      freq: 0.15, amp: 0.9, smoothness: 5
    },
    flapOpenState = {
      p1x: 0, p1y: -40,
      p2x: 160, p2y: 40,
      p3x: 104, p3y: 60,
      p4x: 140, p4y: 110,
      p5x: 55, p5y: 104,
      p6x: 65, p6y: 150,
      p7x: -500, p7y: 80
    },
    flapOpenState3,
    flapOpenState2,
    flapOpenState2_AB,
    flapOpenState2_BC,
    flapOpenState1,
    sqProps = {
      sqA: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
      sqB: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 },
      sqC: { strokeWidth: 0.5, freq: 0.25, amp: 0.7, smoothness: 1.5 }
    },
    sqCorners = [
      { x: -8, y: 0 },
      { x: 0, y: -8 },
      { x: 8, y: 0 },
      { x: 0, y: 8 }
    ],
    offsets = {
      sqA: { x: 0, y: 0, rotation: -10, origin: "0px 8px" },
      sqB: { x: 0, y: 0, rotation: 25, origin: "6px 8px" },
      sqC: { x: 0, y: 0, rotation: 35, origin: "6px 6px" }
    },
    MOBILE_HOLD_DELAY = 150,
    CLICK_DRAG_X = 100,
    CLICK_DRAG_Y = 80,
    routes = {
      sqA: 'summary.html',
      sqB: 'project1.html',
      sqC: 'media.html'
    },
    focusNudge = {
      sqA: { x: -130, y: -40 },
      sqB: { x: -CLICK_DRAG_X, y: -CLICK_DRAG_Y },
      sqC: { x: -40, y: -140 }
    },
    buttonLabels = {
      sqA: 'Summary',
      sqB: 'Project 1',
      sqC: 'Media'
    }
  } = config;

  const card = wrap.querySelector('.card');
  const path = card.querySelector('.triangle-path');
  const innerPath = card.querySelector('.inner-triangle-path');
  const innerOuterPath = card.querySelector('.inner-triangle-outer-path');
  const bgPath = wrap.querySelector('.card-bg-path');
  const clipPath = wrap.querySelector('.card-clip-path');

  // 0. Apply per-card theme / active color if specified
  const activeColor = config.activeColor || (config.theme && config.theme.activeColor) || null;
  if (activeColor) {
    wrap.style.setProperty('--card-peel', activeColor);
    wrap.style.setProperty('--btn-active', activeColor);
    wrap.style.setProperty('--eye-pupil', activeColor);
    wrap.style.setProperty('--behind-text', activeColor);
  }

  const effectiveSummaryProps = activeColor ? {
    ...summaryProps,
    colors: {
      ...summaryProps.colors,
      active: {
        ...(summaryProps.colors && summaryProps.colors.active),
        lines: activeColor,
        pupil: activeColor
      }
    }
  } : summaryProps;

  const effectiveEyeProps = activeColor ? {
    ...eyeProps,
    colors: {
      ...eyeProps.colors,
      active: {
        ...(eyeProps.colors && eyeProps.colors.active),
        pupil: activeColor,
        pupilFill: activeColor
      }
    }
  } : (config.eyeProps || eyeProps);

  // Update card title and revealed label if specified in config
  const titleEl = card.querySelector('.card-title');
  if (titleEl) {
    if (config.title) titleEl.textContent = config.title;
    const tp = config.titleProps || (typeof CardConfig !== 'undefined' ? CardConfig.titleProps : null);
    if (tp) {
      if (tp.font) titleEl.style.fontFamily = tp.font;
      if (tp.size) titleEl.style.fontSize = tp.size;
      if (tp.weight) titleEl.style.fontWeight = String(tp.weight);
      if (tp.spacing) titleEl.style.letterSpacing = tp.spacing;
      if (tp.color) titleEl.style.color = tp.color;
      if (tp.transform) titleEl.style.textTransform = tp.transform;
    }
  }

  // Text element revealed behind the card
  const behindTextEl = wrap.querySelector('.card-behind-text');
  if (behindTextEl && config.label) {
    behindTextEl.textContent = config.label;
  }
  const defaultBehindText = config.defaultBehindText || config.label || (behindTextEl ? behindTextEl.textContent.trim() : (buttonLabels.sqB || 'Project 1'));
  const textState = { current: defaultBehindText };

  const setTextFn = (txt) => {
    CardTransitions.setBehindText(behindTextEl, textState, txt);
  };

  // 1. Initialize card SVG outline using CardRender module
  CardRender.renderCardOutline(bgPath, clipPath, cardProps);
  CardRender.applyLineMode({ bgPath, path, innerPath, innerOuterPath }, strokeProps || LINE_MODE);

  // 2. Initialize action buttons & Figma Eye / Summary icon using CardButtons module
  const buttons = CardButtons.setup(card, effectiveEyeProps, effectiveSummaryProps, sqProps, sqCorners, strokeProps || LINE_MODE, config.buttonTextProps);
  const { sqA, sqB, sqC } = buttons;

  // Determine active buttons from routes
  const availableKeys = ['sqA', 'sqB', 'sqC'];
  const activeKeys = routes ? availableKeys.filter(k => Boolean(routes[k])) : availableKeys;
  const buttonCount = activeKeys.length > 0 ? activeKeys.length : 3;

  const hasA = activeKeys.includes('sqA');
  const hasB = activeKeys.includes('sqB');
  const hasC = activeKeys.includes('sqC');

  let defaultFlap;
  if (buttonCount === 1) {
    defaultFlap = config.flapOpenState1 || flapOpenState1;
  } else if (buttonCount === 2) {
    if (hasB && hasC && !hasA) {
      defaultFlap = config.flapOpenState2_BC || flapOpenState2_BC || config.flapOpenState2 || flapOpenState2;
    } else {
      defaultFlap = config.flapOpenState2_AB || flapOpenState2_AB || config.flapOpenState2 || flapOpenState2;
    }
  } else {
    defaultFlap = config.flapOpenState3 || flapOpenState3;
  }

  // Determine active flap open coordinates (allows custom per-project override or picks matching flap state)
  const activeFlapOpenState = config.projectFlapOpenState || defaultFlap || flapOpenState;

  // Hide buttons that are not present in routes, and update accessibility attributes
  [
    { sq: sqA, key: 'sqA' },
    { sq: sqB, key: 'sqB' },
    { sq: sqC, key: 'sqC' }
  ].forEach(({ sq, key }) => {
    if (!sq) return;
    if (activeKeys.length > 0 && !activeKeys.includes(key)) {
      sq.style.display = 'none';
      sq.setAttribute('aria-hidden', 'true');
      sq.setAttribute('tabindex', '-1');
    } else {
      sq.style.display = '';
      sq.removeAttribute('aria-hidden');
      sq.setAttribute('tabindex', '0');
    }
  });

  // 3. Card physics state
  const state = {
    ...flapClosedState,
    ...greenPeelClosedState,
    opacity: 0,
    clipX: cardProps.clipX,
    clipY: cardProps.clipY
  };

  let isDragging = false;
  let isFlyingAway = false;
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
  let activeCardRect = null;

  function updateProximity() {
    // If flyaway animation is running or card is not dragging, NEVER recompute proximity!
    if (!isDragging || isFlyingAway) return;
    if (isCardPress && !canPeel) return;

    lockedButton = CardButtons.evaluateProximity({
      buttons,
      state,
      mouse: { x: currentMouseX, y: currentMouseY },
      offsets,
      buttonLabels,
      defaultBehindText,
      setTextFn,
      proximityProps: buttonProximityProps,
      summaryProps: effectiveSummaryProps,
      buttonTextProps: config.buttonTextProps,
      eyeProps: effectiveEyeProps,
      cardRect: activeCardRect
    });
  }

  function render() {
    // Update SVG clipping & flap polygons
    CardRender.renderCardPaths({ bgPath, clipPath, path, innerPath, innerOuterPath }, state, cardProps, innerTriProps, strokeProps || LINE_MODE);

    // Physically lock squares to flap vertices
    CardButtons.updatePositions(buttons, state, offsets);

    // Evaluate proximity on moving squares
    updateProximity();
  }

  render();

  const duration = 0.4;
  const customEase = "back.out(1.2)";

  // THE PROXIMITY LOGIC (Mouse / Touch move)
  function handleMouseMove(e) {
    if (!isDragging) return;

    const isRealEvent = e && e.type && e.type !== 'fake';

    if (isRealEvent) {
      currentMouseX = e.touches ? e.touches[0].clientX : e.clientX;
      currentMouseY = e.touches ? e.touches[0].clientY : e.clientY;

      if (!canPeel) {
        const moveDist = Math.hypot(currentMouseX - initialPressX, currentMouseY - initialPressY);
        if (moveDist > 10) {
          isDragging = false;
          handleMouseUp({ isAbort: true });
          return;
        }
        return;
      }

      if (e.cancelable && e.preventDefault) e.preventDefault();
    } else {
      currentMouseX = e.clientX;
      currentMouseY = e.clientY;
    }

    const rawDx = startX - currentMouseX;
    const rawDy = startY - currentMouseY;

    const dragMultiplier = (e && e.touches) ? 1.6 : 1.0;
    const computedDx = rawDx > 0 ? rawDx * dragMultiplier : rawDx;
    const computedDy = rawDy > 0 ? rawDy * dragMultiplier : rawDy;

    const dragDistanceX = Math.max(-cardProps.clipX, computedDx);
    const dragDistanceY = Math.max(-cardProps.clipY, computedDy);

    const swayX = Math.sin(dragDistanceY * 0.05) * 12;
    const swayY = Math.sin(dragDistanceX * 0.05) * 12;

    const effectiveOpenPeel = {
      ...greenPeelClosedState,
      ...greenPeelOpenState,
      ...activeFlapOpenState
    };
    const baseP1x = effectiveOpenPeel.innerP1x !== undefined ? effectiveOpenPeel.innerP1x : 60;
    const baseP1y = effectiveOpenPeel.innerP1y !== undefined ? effectiveOpenPeel.innerP1y : 0;
    const baseP2x = effectiveOpenPeel.innerP2x !== undefined ? effectiveOpenPeel.innerP2x : 60;
    const baseP2y = effectiveOpenPeel.innerP2y !== undefined ? effectiveOpenPeel.innerP2y : 60;
    const baseP3x = effectiveOpenPeel.innerP3x !== undefined ? effectiveOpenPeel.innerP3x : 0;
    const baseP3y = effectiveOpenPeel.innerP3y !== undefined ? effectiveOpenPeel.innerP3y : 60;

    gsap.to(state, {
      clipX: Math.max(0, cardProps.clipX + dragDistanceX + swayX),
      clipY: Math.max(0, cardProps.clipY + dragDistanceY + swayY),
      innerP1x: Math.max(0, baseP1x + dragDistanceX + swayX),
      innerP1y: Math.max(0, baseP1y),
      innerP3x: Math.max(0, baseP3x),
      innerP3y: Math.max(0, baseP3y + dragDistanceY + swayY),
      innerP2x: Math.max(0, baseP2x + dragDistanceX),
      innerP2y: Math.max(0, baseP2y + dragDistanceY),
      duration: 0,
      overwrite: "auto",
      onUpdate: render
    });
  }

  // THE RELEASE LOGIC
  function handleMouseUp(e) {
    document.body.classList.remove('is-peeling');
    if (!isDragging) return;
    isDragging = false;
    activeCardRect = null;

    clearTimeout(holdTimer);

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

    const startFlyaway = () => {
      isFlyingAway = true;
      isDragging = false;

      const dragDx = startX - currentMouseX;
      const dragDy = startY - currentMouseY;
      const dirX = Math.abs(dragDx) > 1 ? dragDx : 10;
      const dirY = Math.abs(dragDy) > 1 ? dragDy : 10;
      const mag = Math.hypot(dirX, dirY);

      CardTransitions.executeFlyaway({
        wrap, card, state, buttons,
        releaseBases: {
          clipX: state.clipX, clipY: state.clipY,
          innerP1x: state.innerP1x, innerP3y: state.innerP3y,
          innerP2x: state.innerP2x, innerP2y: state.innerP2y,
        },
        flapBases: {
          p1x: state.p1x, p1y: state.p1y,
          p2x: state.p2x, p2y: state.p2y,
          p3x: state.p3x, p3y: state.p3y,
          p4x: state.p4x, p4y: state.p4y,
          p5x: state.p5x, p5y: state.p5y,
          p6x: state.p6x, p6y: state.p6y,
          p7x: state.p7x, p7y: state.p7y,
        },
        normX: dirX / mag,
        normY: dirY / mag,
        routes, lockedButton, buttonLabels, defaultBehindText,
        transitionProps, behindTextEl, textState,
        renderFn: render
      });
    };

    // 1. TAP / CLICK ON MAIN CARD: Natural drag emulation over active button
    if (isCardPress && !isAbort && pressDuration < 250 && physicalDragDist < 10) {
      isDragging = true;
      canPeel = true;

      gsap.to(state, {
        duration: 0.35,
        ease: customEase,
        overwrite: "auto",
        ...greenPeelOpenState,
        ...activeFlapOpenState,
        opacity: 1
      });

      startX = 0;
      startY = 0;

      const defaultTargetKey = activeKeys.includes('sqB') ? 'sqB' : (activeKeys[0] || 'sqB');
      const defaultTargetSq = buttons[defaultTargetKey] || sqB;

      const fakeCursor = { x: 0, y: 0 };
      const targetX = focusNudge[defaultTargetKey] ? focusNudge[defaultTargetKey].x : -CLICK_DRAG_X;
      const targetY = focusNudge[defaultTargetKey] ? focusNudge[defaultTargetKey].y : -CLICK_DRAG_Y;

      gsap.to(fakeCursor, {
        x: targetX,
        y: targetY,
        duration: 0.35,
        ease: "power2.inOut",
        onUpdate: () => {
          handleMouseMove({ clientX: fakeCursor.x, clientY: fakeCursor.y, type: 'fake', isInstant: true });
        },
        onComplete: () => {
          lockedButton = lockedButton || defaultTargetSq;
          startFlyaway();
        }
      });
      return;
    }

    // 2. EXCESSIVE DRAG DETECTED: Default to view (sqB or active button) if dragged heavily towards opposite diagonal
    if (!lockedButton && (state.innerP2x > 160 && state.innerP2y > 160)) {
      const fallbackKey = activeKeys.includes('sqB') ? 'sqB' : (activeKeys[0] || 'sqB');
      lockedButton = buttons[fallbackKey] || sqB;
    }

    // Execute transition if a button was locked!
    if (lockedButton) {
      startFlyaway();
      return;
    }

    // Reset square scales & behind-card text on release
    CardButtons.reset(buttons, effectiveSummaryProps, config.buttonTextProps, effectiveEyeProps);
    setTextFn(defaultBehindText);

    const activeEyes = card.querySelectorAll('.eye-wrapper');
    if (activeEyes.length > 0) {
      gsap.to(activeEyes, { opacity: 0, duration: 0.3, overwrite: "auto" });
    }

    // Snap physics state back
    gsap.to(state, {
      duration,
      ease: "power3.out",
      overwrite: true,
      ...flapClosedState,
      ...greenPeelClosedState,
      opacity: 0,
      clipX: cardProps.clipX,
      clipY: cardProps.clipY,
      onUpdate: render
    });
  }

  // THE PRESS LOGIC
  function handleMouseDown(e) {
    if (isDragging || isFlyingAway) return;
    isDragging = true;
    activeCardRect = wrap.getBoundingClientRect();
    lockedButton = null;

    isCardPress = !e.target.closest('.hitbox');
    if (!isCardPress) {
      document.body.classList.add('is-peeling');
    }
    const isTouch = !!e.touches;
    canPeel = !isTouch || !isCardPress;

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
        ...greenPeelOpenState,
        ...activeFlapOpenState,
        opacity: 1,
        onUpdate: render
      });
    };

    clearTimeout(holdTimer);
    if (!canPeel) {
      holdTimer = setTimeout(() => {
        if (!isDragging) return;
        canPeel = true;
        openWhiteFlap();
        startX = currentMouseX;
        startY = currentMouseY;
      }, MOBILE_HOLD_DELAY);
    } else {
      openWhiteFlap();
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp, { passive: true });
    window.addEventListener('touchcancel', handleMouseUp, { passive: true });
  }

  card.addEventListener('mousedown', handleMouseDown);
  card.addEventListener('touchstart', handleMouseDown, { passive: true });

  // ----------------------------------------------------
  // ACCESSIBILITY & KEYBOARD SUPPORT
  // ----------------------------------------------------
  let fakeCursor = { x: 0, y: 0 };

  [sqA, sqB, sqC].forEach(sq => {
    const key = sq === sqA ? 'sqA' : sq === sqB ? 'sqB' : 'sqC';
    if (!activeKeys.includes(key)) return;

    sq.addEventListener('focus', () => {
      let targetX = 0, targetY = 0;
      if (sq === sqA) { targetX = focusNudge.sqA.x; targetY = focusNudge.sqA.y; }
      if (sq === sqB) { targetX = focusNudge.sqB.x; targetY = focusNudge.sqB.y; }
      if (sq === sqC) { targetX = focusNudge.sqC.x; targetY = focusNudge.sqC.y; }

      if (sq === sqA) setTextFn(buttonLabels.sqA || 'Summary');
      if (sq === sqB) setTextFn(defaultBehindText || buttonLabels.sqB || 'Project 1');
      if (sq === sqC) setTextFn(buttonLabels.sqC || 'Media');

      isDragging = true;
      startX = 0; startY = 0;

      gsap.killTweensOf(fakeCursor);
      gsap.killTweensOf(state);

      gsap.to(state, {
        duration: 0.3,
        ...greenPeelOpenState,
        ...activeFlapOpenState,
        opacity: 1,
        onUpdate: render
      });

      gsap.to(fakeCursor, {
        x: targetX, y: targetY, duration: 0.35, ease: "power2.out",
        onUpdate: () => handleMouseMove({ clientX: fakeCursor.x, clientY: fakeCursor.y, type: 'fake', isInstant: true }),
        onComplete: () => { lockedButton = sq; }
      });
    });

    sq.addEventListener('blur', () => {
      lockedButton = null;
      isDragging = true;
      setTextFn(defaultBehindText);
      gsap.killTweensOf(fakeCursor);
      handleMouseUp({ type: 'fake', isAbort: true });
    });

    sq.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        lockedButton = sq;
        isDragging = true;
        handleMouseUp({ type: 'fake' });
      }
    });
  });

  // Expose an in-place instant reset method for this card (bfcache restoration)
  wrap._resetCard = () => {
    gsap.killTweensOf(state);
    Object.assign(state, flapClosedState, greenPeelClosedState, {
      opacity: 0,
      clipX: cardProps.clipX,
      clipY: cardProps.clipY
    });

    isDragging = false;
    isFlyingAway = false;
    lockedButton = null;
    canPeel = true;
    clearTimeout(holdTimer);

    const cardLoadingBar = wrap.querySelector('.card-loading-bar');
    const cardLoadingProgress = wrap.querySelector('.card-loading-progress');
    const behindContent = wrap.querySelector('.card-behind-content') || behindTextEl;

    if (cardLoadingBar) cardLoadingBar.classList.remove('active');
    if (cardLoadingProgress) {
      gsap.killTweensOf(cardLoadingProgress);
      gsap.set(cardLoadingProgress, { scaleX: 0 });
    }
    if (behindContent) {
      gsap.killTweensOf(behindContent);
      gsap.set(behindContent, { opacity: 1 });
    }

    if (behindTextEl) {
      gsap.killTweensOf(behindTextEl);
      behindTextEl.textContent = defaultBehindText;
      textState.current = defaultBehindText;
      gsap.set(behindTextEl, { opacity: 1, scale: 1 });
    }

    render();
    CardRender.applyLineMode({ bgPath, path, innerPath, innerOuterPath }, strokeProps || LINE_MODE);
    CardButtons.reset(buttons, effectiveSummaryProps, config.buttonTextProps, effectiveEyeProps);

    wrap.style.opacity = '1';
    wrap.style.pointerEvents = '';
    card.style.pointerEvents = '';
  };
}

// Expose globally
window.initCard = initCard;
