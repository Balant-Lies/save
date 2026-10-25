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

  const defaultGloss = {
    enabled: true,
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
      intensity: 0.01,
      size: 80,
      falloff: 0.72,
      travel: 40,
      color: "warm"
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
      washoutStrength: 0.1,
      iridescence: false,
      iridescenceStrength: 0.08
    },
    input: {
      source: "auto",
      gyroSensitivity: 1.5,
      mouseSensitivity: 1
    },
    idle: {
      enabled: true,
      speed: 0.8,
      amplitude: 0.35,
      tilt: false
    }
  };

  const rawGloss = rawCfg.gloss || rawCfg.glare || {};
  const mergedGloss = {
    enabled: rawGloss.enabled !== false,
    tilt: Object.assign({}, defaultGloss.tilt, rawGloss.tilt || {}),
    specular: Object.assign({}, defaultGloss.specular, rawGloss.specular || {}),
    fresnel: Object.assign({}, defaultGloss.fresnel, rawGloss.fresnel || {}),
    environment: Object.assign({}, defaultGloss.environment, rawGloss.environment || {}),
    surface: Object.assign({}, defaultGloss.surface, rawGloss.surface || {}),
    input: Object.assign({}, defaultGloss.input, rawGloss.input || {}),
    idle: Object.assign({}, defaultGloss.idle, rawGloss.idle || {})
  };

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
    gloss: mergedGloss,
    get glare() { return this.gloss; },
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
  // PHYSICALLY-BASED OPTICAL GLOSS & LIGHTING PRESETS
  // Derived directly from sticker-lab.html & sticker-gloss-config.json
  // Strictly 2D on-screen simulation (no CSS 3D transforms applied)
  // ----------------------------------------------------
  const LIGHT_COLORS = {
    warm:    { core: [255, 248, 235], edge: [255, 235, 210] },
    cool:    { core: [235, 240, 255], edge: [210, 220, 255] },
    neutral: { core: [255, 255, 255], edge: [240, 240, 240] },
    golden:  { core: [255, 230, 180], edge: [255, 210, 140] }
  };

  const ENV_PRESETS = {
    studio: (nx, ny) => {
      const cx = 50 + nx * 20;
      const cy = 30 + ny * 15;
      return `radial-gradient(ellipse 80% 50% at ${cx}% ${cy}%, rgba(255,252,245,0.35) 0%, rgba(255,252,245,0.08) 40%, transparent 70%)`;
    },
    window: (nx, ny) => {
      const cx = 70 + nx * 15;
      const cy = 25 + ny * 10;
      return `radial-gradient(ellipse 60% 90% at ${cx}% ${cy}%, rgba(200,220,255,0.3) 0%, rgba(200,220,255,0.05) 50%, transparent 80%)`;
    },
    outdoor: (nx, ny) => {
      const cy = 35 + ny * 15;
      return `linear-gradient(180deg, rgba(160,200,255,0.2) 0%, transparent ${cy}%, rgba(180,160,130,0.08) 100%)`;
    },
    neon: (nx, ny) => {
      const cx = 50 + nx * 25;
      const cy = 50 + ny * 25;
      return `radial-gradient(ellipse 50% 50% at ${cx}% ${cy}%, rgba(255,100,200,0.2) 0%, rgba(100,100,255,0.1) 40%, transparent 70%)`;
    }
  };

  function fresnelFactor(tiltX, tiltY, maxTilt, frExp) {
    const tiltMag = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
    const normAngle = Math.min(tiltMag / (maxTilt || 1), 1);
    const f0 = 0.04;
    return f0 + (1 - f0) * Math.pow(normAngle, frExp || 3);
  }

  function renderSpecular(el, nx, ny, fresnel, cfg) {
    if (!el) return;
    if (!cfg || cfg.enabled === false) { el.style.opacity = '0'; return; }

    const colors = LIGHT_COLORS[cfg.color] || LIGHT_COLORS.warm;
    const travel = cfg.travel != null ? cfg.travel : 40;
    const rx = 50 - nx * travel;
    const ry = 50 - ny * travel;

    const size = cfg.size != null ? cfg.size : 80;
    const fall = cfg.falloff != null ? cfg.falloff : 0.72;

    const mid1 = Math.round(size * fall * 0.3);
    const mid2 = Math.round(size * fall * 0.7);

    const core = colors.core;
    const edge = colors.edge;

    el.style.background = `radial-gradient(ellipse ${size}% ${size * 0.85}% at ${rx}% ${ry}%,
      rgba(${core[0]},${core[1]},${core[2]}, 0.95) 0%,
      rgba(${core[0]},${core[1]},${core[2]}, 0.7) ${mid1}%,
      rgba(${edge[0]},${edge[1]},${edge[2]}, 0.3) ${mid2}%,
      rgba(${edge[0]},${edge[1]},${edge[2]}, 0.05) ${size}%,
      transparent ${size + 15}%
    )`;

    const baseOpacity = cfg.intensity != null ? cfg.intensity : 0.01;
    const fresnelBoost = fresnel * 0.4;
    el.style.opacity = String(Math.min(1, baseOpacity + fresnelBoost));
  }

  function renderFresnel(el, nx, ny, fresnel, cfg) {
    if (!el) return;
    if (!cfg || cfg.enabled === false) { el.style.opacity = '0'; return; }

    const rimW = cfg.rimWidth != null ? cfg.rimWidth : 20;
    const leftWeight  = Math.max(0, -nx);
    const rightWeight = Math.max(0,  nx);
    const topWeight   = Math.max(0, -ny);
    const botWeight   = Math.max(0,  ny);

    const base = fresnel * (cfg.intensity != null ? cfg.intensity : 0.4);
    const lA = (base * (0.3 + leftWeight  * 0.7)).toFixed(3);
    const rA = (base * (0.3 + rightWeight * 0.7)).toFixed(3);
    const tA = (base * (0.3 + topWeight   * 0.7)).toFixed(3);
    const bA = (base * (0.3 + botWeight   * 0.7)).toFixed(3);

    el.style.background = `
      linear-gradient(90deg,  rgba(255,255,255,${lA}) 0%, transparent ${rimW}%, transparent ${100-rimW}%, rgba(255,255,255,${rA}) 100%),
      linear-gradient(180deg, rgba(255,255,255,${tA}) 0%, transparent ${rimW}%, transparent ${100-rimW}%, rgba(255,255,255,${bA}) 100%)
    `;
    el.style.opacity = '1';
  }

  function renderEnvReflection(el, nx, ny, cfg) {
    if (!el) return;
    if (!cfg || cfg.enabled === false) { el.style.opacity = '0'; return; }

    const presetFn = ENV_PRESETS[cfg.preset] || ENV_PRESETS.studio;
    el.style.background = presetFn(nx, ny);
    el.style.opacity = String(cfg.intensity != null ? cfg.intensity : 0.25);
    el.style.filter = (cfg.blur && cfg.blur > 0) ? `blur(${cfg.blur}px)` : 'none';
  }

  function renderWashout(el, fresnel, cfg) {
    if (!el) return;
    if (!cfg || cfg.washout === false) { el.style.opacity = '0'; return; }
    el.style.opacity = String(fresnel * (cfg.washoutStrength != null ? cfg.washoutStrength : 0.1));
  }

  function renderIridescence(el, nx, ny, fresnel, cfg) {
    if (!el) return;
    if (!cfg || !cfg.iridescence) { el.style.opacity = '0'; return; }

    const angle = Math.atan2(ny, nx) * (180 / Math.PI);
    const hue1 = (angle + 180) % 360;
    const hue2 = (hue1 + 60) % 360;
    const hue3 = (hue1 + 180) % 360;

    const cx = 50 - nx * 30;
    const cy = 50 - ny * 30;

    el.style.background = `
      radial-gradient(ellipse 70% 70% at ${cx}% ${cy}%,
        hsla(${hue1}, 100%, 70%, 0.3) 0%,
        hsla(${hue2}, 80%, 60%, 0.15) 40%,
        hsla(${hue3}, 70%, 50%, 0.05) 70%,
        transparent 100%
      )
    `;
    el.style.opacity = String(fresnel * (cfg.iridescenceStrength != null ? cfg.iridescenceStrength : 0.08) * 4);
  }

  // Fallback linear sheen generator
  function getGlossyGradient(posPct, glareCfg) {
    if (!glareCfg || glareCfg.enabled === false) return 'none';
    const angle = `${glareCfg.angle != null ? glareCfg.angle : -135}deg`;
    const tint = glareCfg.tint || '255, 255, 255';
    const halfW = (glareCfg.barWidth || 20) / 2;
    const soft = glareCfg.softness || 25;
    const peakAlpha = 0.95;

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
    rawStops.sort((a, b) => a.pos - b.pos);
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
      this.peelOverlayEl = rootEl.querySelector('.sticker-peel-overlay');

      // PBR Gloss Sub-Layers
      this.highlightLayer = rootEl.querySelector('.sticker-highlight-layer');
      this.lSpecular = rootEl.querySelector('.specular-hotspot');
      this.lFresnel = rootEl.querySelector('.fresnel-rim');
      this.lEnv = rootEl.querySelector('.env-reflect');
      this.lWashout = rootEl.querySelector('.washout');
      this.lIridescence = rootEl.querySelector('.iridescence');

      // State tracking (supports inactive by default)
      this.isSleeping = config.initialSleeping === true || rootEl.classList.contains('is-sleeping');
      if (this.isSleeping) {
        this.rootEl.classList.add('is-sleeping');
      }

      this.currentX = 0;
      this.currentY = 0;
      this.hasBeenMoved = false;

      // Dynamic Gloss Physics State (Optical vectors, strictly 2D flat on screen)
      this.tgtTX = 0; this.tgtTY = 0;
      this.curTX = 0; this.curTY = 0;
      this.tgtNX = 0; this.tgtNY = 0;
      this.curNX = 0; this.curNY = 0;
      this.lastRenderedNX = null;
      this.lastRenderedNY = null;
      this.currentGlarePos = 50;
      this.targetGlarePos = 50;
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

      // Initial resting PBR gloss render
      this.renderGlossFrame(globalCfg.gloss);

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
    // PHYSICALLY-BASED OPTICAL GLOSS RENDERER (PBR OPTICS)
    // Renders specular hotspot, fresnel rim, env reflection,
    // washout, and iridescence without applying 3D tilt
    // ----------------------------------------------------
    setTargetGlare(targetPct) {
      const nx = ((targetPct - 50) / 50);
      this.tgtNX = Math.max(-1, Math.min(1, nx));
      const maxTilt = (globalCfg.gloss && globalCfg.gloss.tilt && globalCfg.gloss.tilt.maxTilt) || 20;
      this.tgtTX = this.tgtNX * maxTilt;
      StickerEngine.requestGlossTick();
    }

    renderGlareFrame() {
      return this.renderGlossFrame(globalCfg.gloss);
    }

    renderGlossFrame(glossCfg) {
      const cfg = glossCfg || globalCfg.gloss;
      if (!cfg || cfg.enabled === false) return false;

      const tiltCfg = cfg.tilt || {};
      const maxTilt = tiltCfg.maxTilt || 20;
      const sm = tiltCfg.smoothing != null ? tiltCfg.smoothing : 0.1;

      this.curTX += (this.tgtTX - this.curTX) * sm;
      this.curTY += (this.tgtTY - this.curTY) * sm;
      this.curNX += (this.tgtNX - this.curNX) * sm;
      this.curNY += (this.tgtNY - this.curNY) * sm;

      let tx = Math.max(-maxTilt, Math.min(maxTilt, this.curTX));
      let ty = Math.max(-maxTilt, Math.min(maxTilt, this.curTY));
      if (tiltCfg.lockX) tx = 0;
      if (tiltCfg.lockY) ty = 0;

      let nx = Math.max(-1, Math.min(1, this.curNX));
      let ny = Math.max(-1, Math.min(1, this.curNY));

      const diff = Math.abs(this.tgtNX - this.curNX) + Math.abs(this.tgtNY - this.curNY);
      const rNX = Math.round(nx * 200) / 200;
      const rNY = Math.round(ny * 200) / 200;

      // Skip redundant re-renders if visually unchanged
      if (rNX === this.lastRenderedNX && rNY === this.lastRenderedNY && diff < 0.001) {
        return false;
      }
      this.lastRenderedNX = rNX;
      this.lastRenderedNY = rNY;

      // Calculate optical Fresnel
      const frExp = cfg.fresnel ? cfg.fresnel.exponent : 3;
      const fresnel = fresnelFactor(tx, ty, maxTilt, frExp);

      // Render PBR sub-layers (Notice: NO 3D transform is ever applied to rootEl or bodyEl!)
      if (this.lSpecular) renderSpecular(this.lSpecular, nx, ny, fresnel, cfg.specular);
      if (this.lFresnel) renderFresnel(this.lFresnel, nx, ny, fresnel, cfg.fresnel);
      if (this.lEnv) renderEnvReflection(this.lEnv, nx, ny, cfg.environment);
      if (this.lWashout) renderWashout(this.lWashout, fresnel, cfg.surface);
      if (this.lIridescence) renderIridescence(this.lIridescence, nx, ny, fresnel, cfg.surface);

      return diff > 0.001;
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

            // Freeze gloss on dragged sticker at resting center (no movement while dragging)
            this.tgtNX = 0;
            this.tgtNY = 0;
            this.tgtTX = 0;
            this.tgtTY = 0;
            this.curNX = 0;
            this.curNY = 0;
            this.curTX = 0;
            this.curTY = 0;
            this.renderGlossFrame(globalCfg.gloss);

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

          // Smoothly glide gloss back to resting light position
          this.tgtNX = 0;
          this.tgtNY = 0;
          this.tgtTX = 0;
          this.tgtTY = 0;
          for (const child of this.childrenStickers) {
            child.tgtNX = 0;
            child.tgtNY = 0;
            child.tgtTX = 0;
            child.tgtTY = 0;
          }
          StickerEngine.requestGlossTick();

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

      // Start PBR gloss simulation / ticker
      this.requestGlossTick();
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
    // GLOBAL PBR GLOSS TICKER & GYROSCOPE/MOTION TRACKING
    // Strictly 2D on-screen simulation (no CSS 3D transforms applied)
    // Mobile: driven exclusively by gyroscope, zero touch interference
    // Isolated: dragging one sticker or card never affects another sticker
    // Optimized: on-demand RAF that pauses when stationary
    // ----------------------------------------------------
    isGlossTicking: false,
    idleTime: 0,
    lastFrameTime: 0,
    activeInputDevice: null,

    isIdleActive() {
      const g = globalCfg.gloss;
      return Boolean(g && g.enabled !== false && g.idle && g.idle.enabled);
    },

    isAutoLoopActive() {
      return this.isIdleActive();
    },

    requestGlossTick() {
      if (this.isGlossTicking) return;
      this.isGlossTicking = true;
      this.lastFrameTime = performance.now();

      const tick = (now) => {
        const dt = Math.min(0.1, (now - (this.lastFrameTime || now)) / 1000);
        this.lastFrameTime = now;

        const glossCfg = globalCfg.gloss || {};
        const idleCfg = glossCfg.idle || {};
        const isIdle = this.isIdleActive();

        if (isIdle && !this.activeInputDevice) {
          const speed = idleCfg.speed != null ? idleCfg.speed : 0.8;
          const amp = idleCfg.amplitude != null ? idleCfg.amplitude : 0.35;
          this.idleTime += dt * speed;

          // Smooth Lissajous pattern from sticker-lab
          const idleNX = Math.sin(this.idleTime * 0.7) * amp;
          const idleNY = Math.sin(this.idleTime * 0.5 + 1.2) * amp * 0.7;
          const maxTilt = (glossCfg.tilt && glossCfg.tilt.maxTilt) || 20;

          for (const sticker of this.stickers.values()) {
            if (sticker.isDraggingMode || sticker.isPointerActive) continue;
            sticker.tgtNX = idleNX;
            sticker.tgtNY = idleNY;
            sticker.tgtTX = idleNX * maxTilt;
            sticker.tgtTY = idleNY * maxTilt;
          }
        }

        let keepTicking = false;
        for (const sticker of this.stickers.values()) {
          const needsMore = sticker.renderGlossFrame(glossCfg);
          if (needsMore) keepTicking = true;
        }

        if (isIdle || keepTicking) {
          requestAnimationFrame(tick);
        } else {
          this.isGlossTicking = false;
        }
      };

      requestAnimationFrame(tick);
    },

    requestGlareTick() {
      this.requestGlossTick();
    },

    bindGlobalMotion() {
      const glossCfg = globalCfg.gloss || {};
      const inputCfg = glossCfg.input || {};
      const tiltCfg = glossCfg.tilt || {};
      const maxTilt = tiltCfg.maxTilt || 20;
      const multX = tiltCfg.multX || 1;
      const multY = tiltCfg.multY || 1;

      // 1. Mobile Gyroscope (DeviceOrientation)
      let gyroBeta = null, gyroGamma = null, gyroCal = false;

      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
          if (inputCfg.source === 'mouse' || inputCfg.source === 'sim') return;
          if (e.beta === null || e.gamma === null) return;

          if (!gyroCal) {
            gyroBeta = e.beta;
            gyroGamma = e.gamma;
            gyroCal = true;
          }

          const sens = inputCfg.gyroSensitivity || 1.5;
          let dg = (e.gamma - gyroGamma) * sens;
          let db = (e.beta - gyroBeta) * sens;

          let tiltX = (dg / 45) * maxTilt * multX;
          let tiltY = (db / 45) * maxTilt * multY;
          if (tiltCfg.invX) tiltX *= -1;
          if (tiltCfg.invY) tiltY *= -1;

          const nx = Math.max(-1, Math.min(1, dg / 45));
          const ny = Math.max(-1, Math.min(1, db / 45));

          this.activeInputDevice = 'gyro';

          for (const s of this.stickers.values()) {
            if (s.isDraggingMode || s.isPointerActive) continue;
            s.tgtTX = tiltX;
            s.tgtTY = tiltY;
            s.tgtNX = nx;
            s.tgtNY = ny;
          }
          this.requestGlossTick();
        }, { passive: true });
      }

      // 2. Desktop Mouse Hovering (Completely disabled on touch, zero interference during dragging)
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        if (inputCfg.source === 'gyro' || inputCfg.source === 'sim') return;
        if (document.body.classList.contains('is-dragging') || document.body.classList.contains('is-peeling')) return;

        const sens = inputCfg.mouseSensitivity || 1;
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        for (const sticker of this.stickers.values()) {
          if (sticker.isDraggingMode || sticker.isPointerActive) continue;

          const rect = sticker.rootEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const nx = Math.max(-1, Math.min(1, ((e.clientX - centerX) / (winW * 0.5)) * sens));
          const ny = Math.max(-1, Math.min(1, ((e.clientY - centerY) / (winH * 0.5)) * sens));

          let tiltX = nx * maxTilt * multX;
          let tiltY = ny * maxTilt * multY;
          if (tiltCfg.invX) tiltX *= -1;
          if (tiltCfg.invY) tiltY *= -1;

          sticker.tgtTX = tiltX;
          sticker.tgtTY = tiltY;
          sticker.tgtNX = nx;
          sticker.tgtNY = ny;
        }

        this.activeInputDevice = 'mouse';
        this.requestGlossTick();
      }, { passive: true });

      window.addEventListener('pointerleave', () => {
        if (this.activeInputDevice === 'mouse') {
          this.activeInputDevice = null;
          for (const sticker of this.stickers.values()) {
            sticker.tgtTX = 0;
            sticker.tgtTY = 0;
            sticker.tgtNX = 0;
            sticker.tgtNY = 0;
          }
          this.requestGlossTick();
        }
      });
    },

    // Runtime controls for test / debugging
    setAutoLoop(enabled, speed, range) {
      if (!globalCfg.gloss.idle) {
        globalCfg.gloss.idle = { enabled: false, speed: 0.8, amplitude: 0.35, tilt: false };
      }
      if (typeof enabled === 'boolean') globalCfg.gloss.idle.enabled = enabled;
      if (typeof speed === 'number') globalCfg.gloss.idle.speed = speed;
      if (typeof range === 'number') globalCfg.gloss.idle.amplitude = range / 100;
      if (this.isIdleActive()) {
        this.requestGlossTick();
      }
    },

    setGlareMultiplier(val) {
      if (typeof val === 'number') {
        if (globalCfg.gloss.tilt) globalCfg.gloss.tilt.multX = val;
      }
    },

    setGlareIntensity(val) {
      if (typeof val === 'number') {
        if (globalCfg.gloss.specular) globalCfg.gloss.specular.intensity = val;
        document.documentElement.style.setProperty('--sheen-opacity', val);
        this.requestGlossTick();
      }
    },

    setGlossPreset(presetName) {
      if (globalCfg.gloss.environment) {
        globalCfg.gloss.environment.preset = presetName;
        this.requestGlossTick();
      }
    },

    setGlossColor(colorName) {
      if (globalCfg.gloss.specular) {
        globalCfg.gloss.specular.color = colorName;
        this.requestGlossTick();
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
