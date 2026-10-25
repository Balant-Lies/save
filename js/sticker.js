// ====================================================
// UNIVERSAL STICKER & MODIFIER ENGINE
// - Surface-Agnostic Hit Detection & Modifier Architecture
// - Tier 1: Sticker ON Sticker (Local Modifier Scope & Parent-Child Drag Grouping)
// - Tier 2: Multiple Stickers on Shared Host (Compound Page State Evaluator)
// - Tier 3: Single Sticker on Card Object (Inner Edge Clamping on Shrink)
// - Click-to-Toggle State (Active with Peeled Corner vs. Sleeping with Grayscale/Sepia)
// - Intelligent Collision Escape (Zero Unintended Overlap on Grid Resize)
// - Hardware-Accelerated Studio Bar Specular Sheen (Gyro on Mobile)
// ====================================================

(function() {
  'use strict';

  // Read configuration with fallback safety
  const rawCfg = (window.stickerProps) || (window.CardConfig && window.CardConfig.stickerProps) || {};

  const globalCfg = {
    scale: rawCfg.scale != null ? rawCfg.scale : 0.6,
    physics: Object.assign({
      dragThreshold: 5,
      liftScale: 1.07,
      settleDuration: 0.22,
      shadowLiftY: 34,
      shadowLiftBlur: 44,
      shadowRestY: 16,
      shadowRestBlur: 28
    }, rawCfg.physics || {}),
    glare: Object.assign({
      enabled: true,
      autoLoop: {
        enabled: true,
        speed: 1.0,
        range: 36
      },
      multiplier: 1.5,
      intensity: 0.65,
      angle: -135,
      barWidth: 20,
      softness: 14,
      dualBar: true,
      dualBarOffset: 26,
      blendMode: 'overlay',
      tint: '255, 255, 255',
      smoothing: 0.12,
      mouseTracking: true,
      gyroscope: true,
      restPosition: 50
    }, rawCfg.glare || rawCfg.gloss || {}),
    work: Object.assign({
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
    }, rawCfg.work || {}),
    about: Object.assign({
      id: 'about',
      name: 'About Me',
      scale: 0.6,
      width: 220,
      height: 230,
      initialPosition: {
        anchor: 'grid',
        align: 'right',
        offsetX: 0,
        offsetY: 24,
        screenX: 380,
        screenY: 24
      },
      appliedByDefault: false,
      initialSleeping: true,
      peel: { mode: 'auto', x: 71, y: 67, scale: 1.3, rotation: 0 },
      hitbox: { visible: false, offsetX: 0, offsetY: 0, padding: 0 }
    }, rawCfg.about || {})
  };

  // ----------------------------------------------------
  // SPECULAR GLOSS SHEEN GENERATOR (PHOTOREALISTIC VINYL)
  // Generates studio bank reflections with dual light bars and diffusion
  // ----------------------------------------------------
  function getGlossyGradient(posPct, glareCfg) {
    if (!glareCfg || glareCfg.enabled === false) return 'none';

    const angle = `${glareCfg.angle != null ? glareCfg.angle : -135}deg`;
    const tint = glareCfg.tint || '255, 255, 255';
    const halfW = (glareCfg.barWidth || 20) / 2;
    const soft = glareCfg.softness || 25;
    const peakAlpha = 0.95;

    // Helper to generate a smooth, photographic bell-curve stop sequence for a light bar
    function makeBarStops(center, w, s, peak) {
      const spread = w + s;
      return [
        { pos: center - spread, alpha: 0 },
        { pos: center - spread * 0.65, alpha: peak * 0.22 },
        { pos: center - w * 0.5, alpha: peak * 0.72 },
        { pos: center, alpha: peak },
        { pos: center + w * 0.5, alpha: peak * 0.72 },
        { pos: center + spread * 0.65, alpha: peak * 0.22 },
        { pos: center + spread, alpha: 0 }
      ];
    }

    let rawStops = makeBarStops(posPct, halfW, soft, peakAlpha);

    if (glareCfg.dualBar) {
      const off = glareCfg.dualBarOffset || 26;
      const secCenter = posPct + off;
      const secStops = makeBarStops(secCenter, halfW * 0.55, soft * 0.75, peakAlpha * 0.38);
      rawStops = rawStops.concat(secStops);
    }

    // Sort strictly in ascending position order to prevent any CSS zero-distance clamp lines
    rawStops.sort((a, b) => a.pos - b.pos);

    // Filter adjacent duplicate positions to keep gradient mathematically clean
    const formatted = [];
    let lastPos = -9999;
    for (const stop of rawStops) {
      const p = Math.round(stop.pos * 10) / 10;
      if (p <= lastPos) continue;
      lastPos = p;
      formatted.push(`rgba(${tint}, ${stop.alpha.toFixed(3)}) ${p}%`);
    }

    return `linear-gradient(${angle},
      ${formatted.join(',\n      ')}
    )`;
  }

  // ----------------------------------------------------
  // HELPER: VERIFY IF A POSITION IS 100% CLEAR OF ALL CARDS
  // Prevents jumping between cards or stopping on top of cards during resize
  // ----------------------------------------------------
  function isPositionClearOfCards(x, y, width, height) {
    const cardWraps = document.querySelectorAll('.grid .wrap');
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const testBox = {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height
    };

    for (const wrap of cardWraps) {
      const targetEl = wrap.querySelector('.inner-rect') || wrap;
      const r = targetEl.getBoundingClientRect();
      const cardBox = {
        left: r.left + scrollX,
        top: r.top + scrollY,
        right: r.right + scrollX,
        bottom: r.bottom + scrollY
      };

      const overlapX = Math.max(0, Math.min(testBox.right, cardBox.right) - Math.max(testBox.left, cardBox.left));
      const overlapY = Math.max(0, Math.min(testBox.bottom, cardBox.bottom) - Math.max(testBox.top, cardBox.top));

      if (overlapX > 6 && overlapY > 6) {
        return false;
      }
    }
    return true;
  }

  // ----------------------------------------------------
  // STICKER INSTANCE CLASS
  // Represents an interactive sticker in the physical DOM
  // ----------------------------------------------------
  class StickerInstance {
    constructor(id, rootEl, config) {
      this.id = id;
      this.rootEl = rootEl;
      this.config = config;

      // Sub-elements
      this.bodyEl = rootEl.querySelector('.sticker-body');
      this.artWrapEl = rootEl.querySelector('.sticker-art-wrap');
      this.glintEl = rootEl.querySelector('.sticker-gloss-glint');
      this.peelOverlayEl = rootEl.querySelector('.sticker-peel-overlay');

      // State tracking (supports inactive by default)
      this.isSleeping = config.initialSleeping === true || rootEl.classList.contains('is-sleeping');
      if (this.isSleeping) {
        this.rootEl.classList.add('is-sleeping');
      }

      this.currentX = 0;
      this.currentY = 0;
      this.hasBeenMoved = false;

      // Dynamic Glare Physics State (Smooth liquid vinyl lerp)
      this.currentGlarePos = globalCfg.glare.restPosition || 50;
      this.targetGlarePos = globalCfg.glare.restPosition || 50;
      this.mouseGlareBias = 0;

      // Hierarchy: Tier 1 (Sticker-on-Sticker)
      this.parentSticker = null;
      this.childrenStickers = [];
      this.childRelativeOffsetX = 0;
      this.childRelativeOffsetY = 0;

      // Attachment: Tier 2 (Page) vs Tier 3 (Card)
      this.attachedSurface = 'page'; // 'page' | cardElement | StickerInstance
      this.cardRelativeOffsetX = 0;
      this.cardRelativeOffsetY = 0;
      this.cardInitialWidth = 0;
      this.cardInitialHeight = 0;
      this.cardRelativeRatioX = 0;
      this.cardRelativeRatioY = 0;
      this.relativeGridOffsetX = 0;
      this.deskOffsetY = 24;

      // Drag interaction state
      this.isPointerActive = false;
      this.activePointerId = null;
      this.isDraggingMode = false;
      this.startPointerX = 0;
      this.startPointerY = 0;
      this.originX = 0;
      this.originY = 0;

      this.init();
    }

    init() {
      // Calculate initial layout position
      const initPos = this.calculateInitialPosition();
      this.deskOffsetY = initPos.y;
      this.updatePosition(initPos.x, initPos.y);

      // Resting visual state
      this.updatePeelStateVisuals(false);

      // Initial resting glare render
      if (this.glintEl) {
        this.glintEl.style.background = getGlossyGradient(globalCfg.glare.restPosition || 50, globalCfg.glare);
      }

      // Bind tactile pointer events
      this.bindPointerEvents();
    }

    getEffectiveWidth() {
      const scale = this.config.scale != null ? this.config.scale : globalCfg.scale;
      return (this.config.width || 220) * scale;
    }

    getEffectiveHeight() {
      const scale = this.config.scale != null ? this.config.scale : globalCfg.scale;
      return (this.config.height || 230) * scale;
    }

    updatePosition(x, y) {
      this.currentX = x;
      this.currentY = y;
      this.rootEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0px)`;

      // Tier 1: Parent moves all children with their relative offsets in lockstep!
      for (const child of this.childrenStickers) {
        child.updatePosition(x + child.childRelativeOffsetX, y + child.childRelativeOffsetY);
      }
    }

    calculateInitialPosition() {
      const pos = this.config.initialPosition || {};
      const scale = this.config.scale != null ? this.config.scale : globalCfg.scale;
      const effectiveWidth = (this.config.width || 220) * scale;
      const minX = 16;
      const maxX = Math.max(minX, window.innerWidth - effectiveWidth - 16);

      let targetX = pos.screenX != null ? pos.screenX : 48;
      let targetY = pos.offsetY != null ? pos.offsetY : 24;

      if (pos.anchor === 'grid') {
        const wraps = document.querySelectorAll('.grid .wrap');
        const firstCard = wraps[0];
        const secondCard = wraps[1];

        if (firstCard) {
          const firstInner = firstCard.querySelector('.inner-rect') || firstCard;
          const cardRect = firstInner.getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset || 0;
          const cardLeft = cardRect.left + scrollX;
          const isTwoCol = window.innerWidth >= 768;

          if (this.id === 'about' && isTwoCol && secondCard) {
            // Align About sticker above Card 2 column
            const secondInner = secondCard.querySelector('.inner-rect') || secondCard;
            const secondRect = secondInner.getBoundingClientRect();
            targetX = secondRect.left + scrollX + (pos.offsetX || 0);
          } else if (this.id === 'about' && !isTwoCol) {
            // Mobile 1-col: offset slightly to the right of Work sticker so both are accessible
            targetX = cardLeft + 110 + (pos.offsetX || 0);
          } else if (pos.align === 'center') {
            const containerWidth = isTwoCol ? (300 * 2 + 32) : cardRect.width;
            targetX = cardLeft + (containerWidth - effectiveWidth) / 2;
          } else if (pos.align === 'right' && isTwoCol) {
            const containerWidth = 300 * 2 + 32;
            targetX = cardLeft + containerWidth - effectiveWidth + (pos.offsetX || 0);
          } else {
            // 'left': flush with Card 1
            targetX = cardLeft + (pos.offsetX || 0);
          }
        }
      }

      const clampedX = Math.max(minX, Math.min(targetX, maxX));
      return { x: clampedX, y: targetY };
    }

    // ----------------------------------------------------
    // CLICK DISCRIMINATOR: TOGGLE SLEEPING VS AWAKE
    // ----------------------------------------------------
    toggleSleeping() {
      this.isSleeping = !this.isSleeping;

      if (this.isSleeping) {
        this.rootEl.classList.add('is-sleeping');
      } else {
        this.rootEl.classList.remove('is-sleeping');
      }

      this.updatePeelStateVisuals(false);

      // Tactile wake/sleep spring bounce
      if (window.gsap && this.bodyEl) {
        gsap.fromTo(this.bodyEl,
          { scale: 0.94 },
          { scale: 1.0, duration: 0.25, ease: "back.out(2)" }
        );
      }

      // Notify global engine to evaluate compound state & local inspection
      StickerEngine.onStickerStateChanged(this);
    }

    updatePeelStateVisuals(isDragging) {
      if (!this.peelOverlayEl) return;

      let effectiveState = 'inactive';

      if (isDragging) {
        // While dragging in air: ALWAYS FLAT/INACTIVE
        effectiveState = 'inactive';
      } else if (this.isSleeping) {
        // Sleeping: ALWAYS FLAT/INACTIVE (unpeeled state with sepia/grayscale)
        effectiveState = 'inactive';
      } else if (this.attachedSurface) {
        // Active and applied: PEEL FLAP ACTIVE
        effectiveState = 'active';
      } else {
        effectiveState = 'inactive';
      }

      this.peelOverlayEl.className = `sticker-peel-overlay peel-state-${effectiveState}`;
    }

    // ----------------------------------------------------
    // GLOSSY VINYL GLARE RENDERER (LERP SMOOTHING - ZERO JUMPS/FREEZING)
    // ----------------------------------------------------
    setTargetGlare(targetPct) {
      this.targetGlarePos = Math.max(5, Math.min(95, targetPct));
      StickerEngine.requestGlareTick();
    }

    renderGlareFrame() {
      if (!this.glintEl) return false;

      const diff = this.targetGlarePos - this.currentGlarePos;
      const smoothing = globalCfg.glare.smoothing || 0.12;

      this.currentGlarePos += diff * smoothing;
      this.glintEl.style.background = getGlossyGradient(this.currentGlarePos, globalCfg.glare);

      return Math.abs(diff) > 0.05;
    }

    // ----------------------------------------------------
    // CORNER PEEL HITBOX RESOLVER
    // ----------------------------------------------------
    getPeelHitboxRect() {
      const rootRect = this.rootEl.getBoundingClientRect();
      const scale = this.config.scale != null ? this.config.scale : globalCfg.scale;
      const baseWidth = 50.3 * scale;
      const baseHeight = 49.7 * scale;
      const baseLeft = rootRect.left + (162.1 * scale);
      const baseTop = rootRect.top + (165.8 * scale);

      return {
        left: baseLeft,
        top: baseTop,
        right: baseLeft + baseWidth,
        bottom: baseTop + baseHeight,
        width: baseWidth,
        height: baseHeight
      };
    }

    // ----------------------------------------------------
    // TIER 1: PARENT-CHILD ATTACHMENT & Z-INDEX HIERARCHY
    // Ensures parent NEVER draws over the child attached to it!
    // ----------------------------------------------------
    updateHierarchyZIndex() {
      const baseZ = parseInt(this.rootEl.style.zIndex || '1000', 10);
      this.childrenStickers.forEach((child, idx) => {
        child.rootEl.style.zIndex = String(baseZ + idx + 1);
        child.updateHierarchyZIndex();
      });
    }

    attachChild(childSticker, dropX, dropY) {
      childSticker.detachFromParent();

      childSticker.parentSticker = this;
      childSticker.attachedSurface = this;
      childSticker.childRelativeOffsetX = dropX - this.currentX;
      childSticker.childRelativeOffsetY = dropY - this.currentY;

      if (!this.childrenStickers.includes(childSticker)) {
        this.childrenStickers.push(childSticker);
      }

      this.rootEl.classList.add('has-child');
      this.updateHierarchyZIndex();

      StickerEngine.onStickerStateChanged(this);
    }

    detachFromParent() {
      if (!this.parentSticker) return;

      const p = this.parentSticker;
      p.childrenStickers = p.childrenStickers.filter(c => c !== this);
      if (p.childrenStickers.length === 0) {
        p.rootEl.classList.remove('has-child');
      }
      this.parentSticker = null;

      p.updateHierarchyZIndex();
      StickerEngine.onStickerStateChanged(p);
    }

    // ----------------------------------------------------
    // TIER 3: CARD INNER-EDGE CLAMPING
    // ----------------------------------------------------
    updateAttachedCardPosition() {
      if (!this.attachedSurface || this.attachedSurface === 'page' || this.attachedSurface instanceof StickerInstance) return;

      const targetEl = this.attachedSurface.querySelector ? (this.attachedSurface.querySelector('.inner-rect') || this.attachedSurface) : this.attachedSurface;
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scale = this.config.scale != null ? this.config.scale : globalCfg.scale;
      const effectiveWidth = this.getEffectiveWidth();

      const peelRelX = 97 * (scale / 0.6);
      const peelRelY = 99 * (scale / 0.6);
      const peelW = 32 * (scale / 0.6);
      const peelH = 32 * (scale / 0.6);

      let offsetX = this.cardRelativeOffsetX;
      let offsetY = this.cardRelativeOffsetY;
      if (this.cardInitialWidth > 0 && Math.abs(targetRect.width - this.cardInitialWidth) > 1) {
        offsetX = this.cardRelativeRatioX * targetRect.width;
      }
      if (this.cardInitialHeight > 0 && Math.abs(targetRect.height - this.cardInitialHeight) > 1) {
        offsetY = this.cardRelativeRatioY * targetRect.height;
      }

      // CLAMP TO BLACK RECTANGLE INNER EDGES WHEN IT SHRINKS:
      const minOffsetX = 0 - peelRelX;
      const maxOffsetX = targetRect.width - peelRelX - peelW;
      const minOffsetY = 0 - peelRelY;
      const maxOffsetY = targetRect.height - peelRelY - peelH;

      const clampedOffsetX = Math.max(minOffsetX, Math.min(offsetX, maxOffsetX));
      const clampedOffsetY = Math.max(minOffsetY, Math.min(offsetY, maxOffsetY));

      const minX = 16;
      const maxX = Math.max(minX, window.innerWidth - effectiveWidth - 16);
      const targetX = Math.max(minX, Math.min(targetRect.left + scrollX + clampedOffsetX, maxX));
      const targetY = targetRect.top + scrollY + clampedOffsetY;

      this.updatePosition(targetX, targetY);
    }

    // ----------------------------------------------------
    // TACTILE POINTER DRAG & TAP BINDING (SINGLE-POINTER LOCK)
    // ----------------------------------------------------
    bindPointerEvents() {
      this.rootEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        // Multi-touch lock: if an active pointer interaction is already in progress, ignore secondary touches!
        if (this.isPointerActive) return;

        this.isPointerActive = true;
        this.activePointerId = e.pointerId;
        this.isDraggingMode = false;

        try { this.rootEl.setPointerCapture(e.pointerId); } catch(err) {}

        this.startPointerX = e.clientX;
        this.startPointerY = e.clientY;
        this.originX = this.currentX;
        this.originY = this.currentY;

        // Layering: Dragged sticker is elevated, but attached children stay strictly on top!
        document.querySelectorAll('.sticker-root').forEach(el => el.style.zIndex = '1000');
        this.rootEl.style.zIndex = '1050';
        this.updateHierarchyZIndex();

        if (window.gsap && this.bodyEl) {
          gsap.killTweensOf(this.bodyEl);
        }

        const onMove = (ev) => {
          if (!this.isPointerActive || ev.pointerId !== this.activePointerId) return;
          const dx = ev.clientX - this.startPointerX;
          const dy = ev.clientY - this.startPointerY;
          const dist = Math.hypot(dx, dy);

          // Threshold crossed: become DRAG
          if (!this.isDraggingMode && dist > globalCfg.physics.dragThreshold) {
            this.isDraggingMode = true;
            document.body.classList.add('is-dragging');

            // If this was attached as a child, peel off parent independently!
            if (this.parentSticker) {
              this.detachFromParent();
            }

            if (window.gsap && this.bodyEl) {
              gsap.to(this.bodyEl, { scale: globalCfg.physics.liftScale, duration: 0.18, ease: "power2.out" });
            }

            // Corner peel must be flat while in air
            this.updatePeelStateVisuals(true);
          }

          if (this.isDraggingMode) {
            const nextX = this.originX + dx;
            const nextY = this.originY + dy;
            this.updatePosition(nextX, nextY);

            // Dynamic light sweep as sticker travels across the desk
            if (globalCfg.glare.enabled !== false) {
              const angleRad = ((globalCfg.glare.angle != null ? globalCfg.glare.angle : -135) + 90) * (Math.PI / 180);
              const multiplier = globalCfg.glare.multiplier != null ? globalCfg.glare.multiplier : 1.5;
              const rest = globalCfg.glare.restPosition || 50;

              const normX = ((ev.clientX / window.innerWidth) - 0.5) * 2;
              const normY = ((ev.clientY / window.innerHeight) - 0.5) * 2;
              const proj = (normX * Math.cos(angleRad) + normY * Math.sin(angleRad));
              const target = rest + (proj * 42 * multiplier);

              this.setTargetGlare(target);
              for (const child of this.childrenStickers) {
                child.setTargetGlare(target);
              }
            }
          }
        };

        const onUp = (ev) => {
          if (!this.isPointerActive || ev.pointerId !== this.activePointerId) return;
          this.isPointerActive = false;
          this.activePointerId = null;
          document.body.classList.remove('is-dragging');

          try { this.rootEl.releasePointerCapture(ev.pointerId); } catch(err) {}
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          // Smoothly glide reflection back to resting light position
          const rest = globalCfg.glare.restPosition || 50;
          this.setTargetGlare(rest);
          for (const child of this.childrenStickers) {
            child.setTargetGlare(rest);
          }

          // CASE 1: CLICK / TAP (<5px movement) -> TOGGLE SLEEP/WAKE!
          if (!this.isDraggingMode) {
            this.toggleSleeping();
            return;
          }

          // CASE 2: DROP EVENT -> SURFACE HIT DETECTION & MODIFIER ATTACHMENT
          this.isDraggingMode = false;
          this.hasBeenMoved = true;

          if (window.gsap && this.bodyEl) {
            gsap.to(this.bodyEl, { scale: 1.0, duration: 0.2, ease: "power2.out" });
          }

          const scrollX = window.scrollX || window.pageXOffset || 0;
          const scrollY = window.scrollY || window.pageYOffset || 0;

          // Surface-Agnostic Hit Detection:
          // Check what lies underneath this sticker's peel corner or center
          const surfaceHit = StickerEngine.findSurfaceUnder(this);

          if (surfaceHit.type === 'sticker') {
            // TIER 1: STICKER ON STICKER!
            const parent = surfaceHit.instance;
            parent.attachChild(this, this.currentX, this.currentY);
            this.attachedSurface = parent;

            if (window.gsap && this.bodyEl) {
              gsap.fromTo(this.bodyEl, { scale: 0.96 }, { scale: 1.0, duration: globalCfg.physics.settleDuration, ease: "back.out(1.5)" });
            }
          } else if (surfaceHit.type === 'card') {
            // TIER 3: STICKER ON PROJECT CARD OBJECT!
            this.attachedSurface = surfaceHit.element;
            const targetEl = surfaceHit.element.querySelector('.inner-rect') || surfaceHit.element;
            const targetRect = targetEl.getBoundingClientRect();

            this.cardRelativeOffsetX = this.currentX - (targetRect.left + scrollX);
            this.cardRelativeOffsetY = this.currentY - (targetRect.top + scrollY);
            this.cardInitialWidth = targetRect.width;
            this.cardInitialHeight = targetRect.height;
            this.cardRelativeRatioX = targetRect.width > 0 ? (this.cardRelativeOffsetX / targetRect.width) : 0;
            this.cardRelativeRatioY = targetRect.height > 0 ? (this.cardRelativeOffsetY / targetRect.height) : 0;
            this.relativeGridOffsetX = 0;

            if (window.gsap && this.bodyEl) {
              gsap.fromTo(this.bodyEl, { scale: 0.96 }, { scale: 1.0, duration: globalCfg.physics.settleDuration, ease: "back.out(1.5)" });
            }
          } else {
            // TIER 2: STICKER ON PAGE DESK!
            // Zero auto-snapping: stays exactly where dropped!
            this.attachedSurface = 'page';
            this.deskOffsetY = this.currentY;

            const firstInner = document.querySelector('.grid .wrap .inner-rect') || document.querySelector('.grid .wrap');
            if (firstInner) {
              const cardRect = firstInner.getBoundingClientRect();
              this.relativeGridOffsetX = this.currentX - (cardRect.left + scrollX);
            }

            if (window.gsap && this.bodyEl) {
              gsap.fromTo(this.bodyEl, { scale: 0.96 }, { scale: 1.0, duration: globalCfg.physics.settleDuration, ease: "back.out(1.5)" });
            }
          }

          this.updatePeelStateVisuals(false);
          this.updateHierarchyZIndex();
          StickerEngine.onStickerStateChanged(this);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
    }
  }

  // ----------------------------------------------------
  // GLOBAL STICKER SYSTEM & ENGINE
  // Coordinates all stickers, compound states, and surface collisions
  // ----------------------------------------------------
  const StickerEngine = {
    stickers: new Map(),
    resizeTimer: null,
    lastIsTwoCol: typeof window !== 'undefined' ? (window.innerWidth >= 768) : true,
    lastWindowWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,

    init() {
      this.applyCSSVariables();

      // Register Work CRT sticker
      const workEl = document.getElementById('stickerRoot');
      if (workEl) {
        const workInstance = new StickerInstance('work', workEl, globalCfg.work);
        this.stickers.set('work', workInstance);
      }

      // Register About Modifier sticker
      const aboutEl = document.getElementById('aboutStickerRoot');
      if (aboutEl) {
        const aboutInstance = new StickerInstance('about', aboutEl, globalCfg.about);
        this.stickers.set('about', aboutInstance);
      }

      this.bindGlobalMotion();
      this.bindWindowResize();
      this.initResizeObserver();
      this.updateCompoundState();

      // Start auto-loop specular sweep if enabled
      if (this.isAutoLoopActive()) {
        this.requestGlareTick();
      }
    },

    applyCSSVariables() {
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--sticker-scale', globalCfg.scale);

      const gridProps = window.gridProps || (window.CardConfig && window.CardConfig.gridProps);
      if (gridProps) {
        if (gridProps.paddingTop != null) rootStyle.setProperty('--grid-padding-top', `${gridProps.paddingTop}px`);
        if (gridProps.paddingBottom != null) rootStyle.setProperty('--grid-padding-bottom', `${gridProps.paddingBottom}px`);
        if (gridProps.paddingX != null) rootStyle.setProperty('--grid-padding-x', `${gridProps.paddingX}px`);
        if (gridProps.gap != null) rootStyle.setProperty('--grid-gap', `${gridProps.gap}px`);
      }

      rootStyle.setProperty('--peel-x', `${globalCfg.work.peel.x}px`);
      rootStyle.setProperty('--peel-y', `${globalCfg.work.peel.y}px`);
      rootStyle.setProperty('--peel-scale', globalCfg.work.peel.scale);
      rootStyle.setProperty('--peel-rotate', `${globalCfg.work.peel.rotation}deg`);

      rootStyle.setProperty('--gloss-angle', `${globalCfg.glare.angle != null ? globalCfg.glare.angle : -135}deg`);
      rootStyle.setProperty('--sheen-opacity', globalCfg.glare.intensity != null ? globalCfg.glare.intensity : 0.65);
      rootStyle.setProperty('--sheen-blend', globalCfg.glare.blendMode || 'overlay');
    },

    // ----------------------------------------------------
    // SURFACE HIT DETECTION RESOLVER
    // Evaluates what surface is underneath a sticker:
    // Priority: Other Stickers (Tier 1) > Project Cards (Tier 3) > Page Canvas (Tier 2)
    // ----------------------------------------------------
    findSurfaceUnder(activeSticker) {
      const peelRect = activeSticker.getPeelHitboxRect();
      const stickerCenter = {
        x: activeSticker.currentX + activeSticker.getEffectiveWidth() / 2,
        y: activeSticker.currentY + activeSticker.getEffectiveHeight() / 2
      };

      // 1. Check Other Stickers in DOM (Tier 1: Sticker on Sticker)
      for (const [id, other] of this.stickers.entries()) {
        if (other === activeSticker || activeSticker.childrenStickers.includes(other)) continue;

        const otherRect = other.rootEl.getBoundingClientRect();
        // Check if peel hitbox or center overlaps other sticker
        const overlapX = Math.max(0, Math.min(peelRect.right, otherRect.right) - Math.max(peelRect.left, otherRect.left));
        const overlapY = Math.max(0, Math.min(peelRect.bottom, otherRect.bottom) - Math.max(peelRect.top, otherRect.top));

        const centerInside = (
          stickerCenter.x >= otherRect.left &&
          stickerCenter.x <= otherRect.right &&
          stickerCenter.y >= otherRect.top &&
          stickerCenter.y <= otherRect.bottom
        );

        if ((overlapX > 15 && overlapY > 15) || centerInside) {
          return { type: 'sticker', instance: other, element: other.rootEl };
        }
      }

      // 2. Check Project Card Black Rectangles (.inner-rect, Tier 3)
      const cardWraps = document.querySelectorAll('.grid .wrap');
      for (const wrap of cardWraps) {
        const innerRectEl = wrap.querySelector('.inner-rect') || wrap;
        const rect = innerRectEl.getBoundingClientRect();

        const overlapX = Math.max(0, Math.min(peelRect.right, rect.right) - Math.max(peelRect.left, rect.left));
        const overlapY = Math.max(0, Math.min(peelRect.bottom, rect.bottom) - Math.max(peelRect.top, rect.top));

        if (overlapX > 2 && overlapY > 2) {
          return { type: 'card', element: wrap, innerRect: innerRectEl };
        }
      }

      // 3. Page Surface (Tier 2)
      return { type: 'page', element: document.body };
    },

    // ----------------------------------------------------
    // TIER 2: COMPOUND PAGE MODIFIER STATE EVALUATOR
    // Re-evaluates active vs sleeping modifiers and updates HUD & DOM events
    // ----------------------------------------------------
    onStickerStateChanged(sticker) {
      this.updateCompoundState();
    },

    updateCompoundState() {
      const pageStickers = Array.from(this.stickers.values()).filter(s => s.attachedSurface === 'page');
      const activeModifiers = pageStickers.filter(s => !s.isSleeping).map(s => s.id);
      const sleepingModifiers = pageStickers.filter(s => s.isSleeping).map(s => s.id);

      let compoundState = 'none';
      let hudLabel = 'MODIFIERS ASLEEP';

      const hasWork = activeModifiers.includes('work');
      const hasAbout = activeModifiers.includes('about');

      if (hasWork && hasAbout) {
        compoundState = 'work+about';
        hudLabel = 'WORK + ABOUT ACTIVE';
      } else if (hasWork) {
        compoundState = 'work';
        hudLabel = 'WORK ACTIVE';
      } else if (hasAbout) {
        compoundState = 'about';
        hudLabel = 'ABOUT ACTIVE';
      } else {
        compoundState = 'none';
        hudLabel = 'ALL MODIFIERS ASLEEP';
      }

      // Dispatch global CustomEvent for application modules
      window.dispatchEvent(new CustomEvent('page:modifiers-changed', {
        detail: {
          compoundState,
          activeModifiers,
          sleepingModifiers
        }
      }));
    },

    // ----------------------------------------------------
    // WINDOW RESIZE: REFLOW TRACKING & INTEL ESCAPE
    // ----------------------------------------------------
    bindWindowResize() {
      const handleResize = () => {
        const currentWidth = window.innerWidth;
        // On mobile devices, vertical scrolling causes the browser URL bar to collapse/expand.
        // This fires window.resize and visualViewport.resize with a changed height, but IDENTICAL width.
        // If width hasn't changed, ignore to prevent stickers from jumping or shifting while scrolling!
        if (Math.abs(currentWidth - this.lastWindowWidth) < 2) {
          return;
        }
        this.lastWindowWidth = currentWidth;

        // Suppress CSS transitions during resize / Ctrl-zoom so corner peel stays 100% locked
        document.body.classList.add('is-resizing');
        clearTimeout(this.resizeEndTimer);
        this.resizeEndTimer = setTimeout(() => {
          document.body.classList.remove('is-resizing');
        }, 120);

        const isTwoCol = window.innerWidth >= 768;
        const breakpointShift = (isTwoCol !== this.lastIsTwoCol);
        this.lastIsTwoCol = isTwoCol;

        for (const sticker of this.stickers.values()) {
          if (sticker.isDraggingMode || sticker.parentSticker) continue;

          const scale = sticker.config.scale != null ? sticker.config.scale : globalCfg.scale;
          const effectiveWidth = sticker.getEffectiveWidth();
          const minX = 16;
          const maxX = Math.max(minX, window.innerWidth - effectiveWidth - 16);

          if (!sticker.hasBeenMoved) {
            const initPos = sticker.calculateInitialPosition();
            sticker.deskOffsetY = initPos.y;
            sticker.updatePosition(initPos.x, initPos.y);
          } else if (sticker.attachedSurface && sticker.attachedSurface !== 'page') {
            sticker.updateAttachedCardPosition();
          } else {
            // Page desk dropped: maintain grid-relative offset
            const firstInner = document.querySelector('.grid .wrap .inner-rect') || document.querySelector('.grid .wrap');
            if (firstInner && sticker.relativeGridOffsetX !== 0) {
              const cardRect = firstInner.getBoundingClientRect();
              const scrollX = window.scrollX || window.pageXOffset || 0;
              const targetX = Math.max(minX, Math.min(cardRect.left + scrollX + sticker.relativeGridOffsetX, maxX));
              sticker.updatePosition(targetX, sticker.deskOffsetY);
            } else {
              const clampedX = Math.max(minX, Math.min(sticker.currentX, maxX));
              sticker.updatePosition(clampedX, sticker.currentY);
            }
          }
        }

        // Collision escape resolution
        if (breakpointShift) {
          this.resolveAllCollisions();
        } else {
          clearTimeout(this.resizeTimer);
          this.resizeTimer = setTimeout(() => {
            this.resolveAllCollisions();
          }, 80);
        }
      };

      window.addEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
      }
    },

    initResizeObserver() {
      if (!window.ResizeObserver) return;
      const ro = new ResizeObserver(() => {
        for (const sticker of this.stickers.values()) {
          if (sticker.isDraggingMode || sticker.parentSticker) continue;
          if (sticker.attachedSurface && sticker.attachedSurface !== 'page') {
            sticker.updateAttachedCardPosition();
          }
        }
      });

      document.querySelectorAll('.grid .wrap .inner-rect').forEach(el => ro.observe(el));
    },

    resolveAllCollisions() {
      for (const sticker of this.stickers.values()) {
        if (sticker.isDraggingMode || sticker.parentSticker) continue;
        if (sticker.attachedSurface !== 'page') continue;

        this.resolveCardCollisionFor(sticker);
      }
    },

    resolveCardCollisionFor(sticker) {
      const effectiveWidth = sticker.getEffectiveWidth();
      const effectiveHeight = sticker.getEffectiveHeight();
      const minX = 16;
      const maxX = Math.max(minX, window.innerWidth - effectiveWidth - 16);
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      const stickerBox = {
        left: sticker.currentX,
        top: sticker.currentY,
        right: sticker.currentX + effectiveWidth,
        bottom: sticker.currentY + effectiveHeight
      };

      const cardWraps = document.querySelectorAll('.grid .wrap');
      let collidingCard = null;
      let maxOverlapArea = 0;
      let minGridTop = Infinity;
      let maxGridBottom = -Infinity;

      for (const wrap of cardWraps) {
        const targetEl = wrap.querySelector('.inner-rect') || wrap;
        const r = targetEl.getBoundingClientRect();
        const cardBox = {
          left: r.left + scrollX,
          top: r.top + scrollY,
          right: r.right + scrollX,
          bottom: r.bottom + scrollY,
          width: r.width,
          height: r.height
        };

        minGridTop = Math.min(minGridTop, cardBox.top);
        maxGridBottom = Math.max(maxGridBottom, cardBox.bottom);

        const overlapX = Math.max(0, Math.min(stickerBox.right, cardBox.right) - Math.max(stickerBox.left, cardBox.left));
        const overlapY = Math.max(0, Math.min(stickerBox.bottom, cardBox.bottom) - Math.max(stickerBox.top, cardBox.top));
        const area = overlapX * overlapY;

        if (overlapX > 15 && overlapY > 15 && area > maxOverlapArea) {
          maxOverlapArea = area;
          collidingCard = cardBox;
        }
      }

      if (!collidingCard) return;

      const candidates = [];

      // Candidate 1: Above this card
      const yAbove = collidingCard.top - effectiveHeight - 16;
      if (yAbove >= 16 && isPositionClearOfCards(sticker.currentX, yAbove, effectiveWidth, effectiveHeight)) {
        candidates.push({ x: sticker.currentX, y: yAbove, dist: Math.abs(sticker.currentY - yAbove) });
      }

      // Candidate 2: Below this card
      const yBelow = collidingCard.bottom + 16;
      if (isPositionClearOfCards(sticker.currentX, yBelow, effectiveWidth, effectiveHeight)) {
        candidates.push({ x: sticker.currentX, y: yBelow, dist: Math.abs(yBelow - sticker.currentY) });
      }

      // Candidate 3: Left margin
      const xLeft = Math.max(minX, collidingCard.left - effectiveWidth - 16);
      if ((collidingCard.left - effectiveWidth - 16) >= minX && isPositionClearOfCards(xLeft, sticker.currentY, effectiveWidth, effectiveHeight)) {
        candidates.push({ x: xLeft, y: sticker.currentY, dist: Math.abs(sticker.currentX - xLeft) });
      }

      // Candidate 4: Right margin
      const xRight = Math.min(maxX, collidingCard.right + 16);
      if ((collidingCard.right + 16) <= maxX && isPositionClearOfCards(xRight, sticker.currentY, effectiveWidth, effectiveHeight)) {
        candidates.push({ x: xRight, y: sticker.currentY, dist: Math.abs(xRight - sticker.currentX) });
      }

      // Candidate 5: Top of grid open padding
      const yAboveGrid = Math.max(24, minGridTop - effectiveHeight - 16);
      if (isPositionClearOfCards(sticker.currentX, yAboveGrid, effectiveWidth, effectiveHeight)) {
        candidates.push({ x: sticker.currentX, y: yAboveGrid, dist: Math.abs(sticker.currentY - yAboveGrid) });
      }

      // Candidate 6: Below entire grid
      const yBelowGrid = maxGridBottom + 24;
      candidates.push({ x: sticker.currentX, y: yBelowGrid, dist: Math.abs(yBelowGrid - sticker.currentY) });

      candidates.sort((a, b) => a.dist - b.dist);
      const best = candidates[0];
      if (!best) return;

      const targetX = Math.max(minX, Math.min(best.x, maxX));
      const targetY = Math.max(16, best.y);

      sticker.updatePosition(targetX, targetY);
      sticker.deskOffsetY = targetY;

      const firstInner = document.querySelector('.grid .wrap .inner-rect') || document.querySelector('.grid .wrap');
      if (firstInner) {
        const r = firstInner.getBoundingClientRect();
        sticker.relativeGridOffsetX = targetX - (r.left + scrollX);
      }
    },

    // ----------------------------------------------------
    // GLOBAL GLARE TICKER & MOTION TRACKING (AUTO-LOOP READY)
    // ----------------------------------------------------
    isGlareTicking: false,
    autoLoopTime: 0,
    lastFrameTime: 0,

    isAutoLoopActive() {
      return Boolean(
        globalCfg.glare &&
        globalCfg.glare.enabled !== false &&
        globalCfg.glare.autoLoop &&
        globalCfg.glare.autoLoop.enabled
      );
    },

    requestGlareTick() {
      if (this.isGlareTicking) return;
      this.isGlareTicking = true;
      this.lastFrameTime = performance.now();

      const tick = (now) => {
        const dt = Math.min(0.1, (now - (this.lastFrameTime || now)) / 1000);
        this.lastFrameTime = now;

        const autoLoopActive = this.isAutoLoopActive();

        if (autoLoopActive) {
          const speed = globalCfg.glare.autoLoop.speed != null ? globalCfg.glare.autoLoop.speed : 1.0;
          const range = globalCfg.glare.autoLoop.range != null ? globalCfg.glare.autoLoop.range : 36;
          const multiplier = globalCfg.glare.multiplier != null ? globalCfg.glare.multiplier : 1.5;
          const rest = globalCfg.glare.restPosition || 50;

          // Advance loop time smoothly with sinusoidal cadence
          this.autoLoopTime += dt * 1.8 * speed;

          for (const sticker of this.stickers.values()) {
            if (sticker.isDraggingMode) continue; // Direct tactile drag has precedence

            // Spatial phase offset based on physical screen X position
            // Left stickers catch the studio light slightly ahead of right stickers!
            const rect = sticker.rootEl.getBoundingClientRect();
            const screenFraction = (rect.left + rect.width / 2) / Math.max(1, window.innerWidth);
            const phase = (screenFraction - 0.5) * 1.2;

            // Harmonic sweep across sticker surface
            const sweep = Math.sin(this.autoLoopTime - phase) * range * multiplier;

            // Interactive mouse perspective bias (if cursor is moving)
            const mouseBias = sticker.mouseGlareBias || 0;
            const target = Math.max(5, Math.min(95, rest + sweep + mouseBias));

            sticker.targetGlarePos = target;
          }
        }

        let keepTicking = false;
        for (const sticker of this.stickers.values()) {
          const needsMore = sticker.renderGlareFrame();
          if (needsMore) keepTicking = true;
        }

        if (autoLoopActive || keepTicking) {
          requestAnimationFrame(tick);
        } else {
          this.isGlareTicking = false;
        }
      };

      requestAnimationFrame(tick);
    },

    bindGlobalMotion() {
      const angleRad = ((globalCfg.glare.angle != null ? globalCfg.glare.angle : -135) + 90) * (Math.PI / 180);
      const multiplier = globalCfg.glare.multiplier != null ? globalCfg.glare.multiplier : 1.5;
      const rest = globalCfg.glare.restPosition || 50;

      // 1. Mouse Tracking across desk
      if (globalCfg.glare.mouseTracking) {
        window.addEventListener('pointermove', (e) => {
          const clientX = e.clientX;
          const clientY = e.clientY;

          for (const sticker of this.stickers.values()) {
            if (sticker.isDraggingMode) continue;

            const rect = sticker.rootEl.getBoundingClientRect();
            const stickerCenterX = rect.left + rect.width / 2;
            const stickerCenterY = rect.top + rect.height / 2;

            // Normalized vector relative to sticker center
            const dx = (clientX - stickerCenterX) / (window.innerWidth * 0.5);
            const dy = (clientY - stickerCenterY) / (window.innerHeight * 0.5);

            // Project onto the glare travel axis perpendicular to the glare angle
            const proj = (dx * Math.cos(angleRad) + dy * Math.sin(angleRad));

            if (this.isAutoLoopActive()) {
              // Mouse gently biases the sweeping light beam perspective
              sticker.mouseGlareBias = proj * 20 * multiplier;
            } else {
              // Standard manual mode
              const target = rest + (proj * 42 * multiplier);
              sticker.setTargetGlare(target);
            }
          }
        }, { passive: true });

        // When mouse leaves the window, smoothly return to resting position
        window.addEventListener('pointerleave', () => {
          for (const sticker of this.stickers.values()) {
            sticker.mouseGlareBias = 0;
            if (!this.isAutoLoopActive()) {
              sticker.setTargetGlare(rest);
            }
          }
        });
      }

      // 2. Mobile Gyroscope with smooth lerp
      if (globalCfg.glare.gyroscope && window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
          if (e.gamma == null || e.beta == null) return;
          const normX = Math.max(-1.1, Math.min(1.1, (e.gamma / 30)));
          const normY = Math.max(-1.1, Math.min(1.1, ((e.beta - 35) / 30)));

          const proj = (normX * Math.cos(angleRad) + normY * Math.sin(angleRad));

          if (this.isAutoLoopActive()) {
            for (const s of this.stickers.values()) {
              s.mouseGlareBias = proj * 20 * multiplier;
            }
          } else {
            const target = rest + (proj * 42 * multiplier);
            for (const s of this.stickers.values()) {
              s.setTargetGlare(target);
            }
          }
        }, { passive: true });
      }
    },

    // Runtime controls for test / debugging
    setAutoLoop(enabled, speed, range) {
      if (!globalCfg.glare.autoLoop) {
        globalCfg.glare.autoLoop = { enabled: false, speed: 1.0, range: 36 };
      }
      if (typeof enabled === 'boolean') globalCfg.glare.autoLoop.enabled = enabled;
      if (typeof speed === 'number') globalCfg.glare.autoLoop.speed = speed;
      if (typeof range === 'number') globalCfg.glare.autoLoop.range = range;
      if (this.isAutoLoopActive()) {
        this.requestGlareTick();
      }
    },

    setGlareMultiplier(val) {
      if (typeof val === 'number') {
        globalCfg.glare.multiplier = val;
      }
    },

    setGlareIntensity(val) {
      if (typeof val === 'number') {
        globalCfg.glare.intensity = val;
        document.documentElement.style.setProperty('--sheen-opacity', val);
      }
    }
  };

  // Expose global controller
  window.StickerController = StickerEngine;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StickerEngine.init());
  } else {
    StickerEngine.init();
  }
})();
