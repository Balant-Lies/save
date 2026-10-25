// ====================================================
// CARD BUTTONS MODULE
// Responsible for:
// 1. Initializing action buttons (sqA, sqB, sqC) and Figma Eye SVG
// 2. Button position locking to flap vertices
// 3. Proximity detection (hit testing button centroids inside green peel triangle)
// 4. Visual state transitions (proximity swells, active lock scale, eye opening)
// ====================================================

(function() {
  const getWobblyPolygon = (corners, freq, amp, segmentLen, seedOffset, forceStraight) => {
    if (typeof CardGeometry !== 'undefined' && CardGeometry.generateWobblyPolygon) {
      return CardGeometry.generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset, forceStraight);
    }
    return generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset, forceStraight);
  };

  const checkPointInTriangle = (px, py, ax, ay, bx, by, cx, cy) => {
    if (typeof CardGeometry !== 'undefined' && CardGeometry.isPointInTriangle) {
      return CardGeometry.isPointInTriangle(px, py, ax, ay, bx, by, cx, cy);
    }
    return isPointInTriangle(px, py, ax, ay, bx, by, cx, cy);
  };

  let summaryMaskCount = 0;
  let summaryGlobalCompleted = false;

  function setAllSummaryCompleted() {
    summaryGlobalCompleted = true;
    document.querySelectorAll('.summary-icon-wrapper').forEach(svg => {
      svg.classList.remove('is-animating');
      svg.classList.add('is-completed');
      try {
        svg.setCurrentTime(2);
        svg.pauseAnimations();
      } catch (e) {}
    });
  }

  function triggerSummaryPlay(sqA) {
    if (!sqA) return;
    const svg = sqA.querySelector('.summary-icon-wrapper');
    if (!svg) return;

    if (summaryGlobalCompleted) {
      svg.classList.remove('is-animating');
      svg.classList.add('is-completed');
      try {
        svg.setCurrentTime(2);
        svg.pauseAnimations();
      } catch (e) {}
      return;
    }

    if (!sqA._summaryState) {
      sqA._summaryState = { animating: false, timer: null };
    }
    const state = sqA._summaryState;

    if (!state.animating) {
      state.animating = true;
      svg.classList.remove('is-completed');
      svg.classList.add('is-animating');
      try {
        svg.setCurrentTime(0);
        svg.unpauseAnimations();
        svg.querySelectorAll('.sum-anim').forEach(a => {
          if (typeof a.beginElement === 'function') a.beginElement();
        });
      } catch (e) {}

      state.timer = setTimeout(() => {
        state.animating = false;
        state.timer = null;
        setAllSummaryCompleted();
      }, 2000);
    }
  }

  function stopSummaryPlay(sqA) {
    if (!sqA) return;
    const svg = sqA.querySelector('.summary-icon-wrapper');
    if (!svg) return;

    if (summaryGlobalCompleted) {
      svg.classList.remove('is-animating');
      svg.classList.add('is-completed');
      return;
    }

    const state = sqA._summaryState;
    if (state && state.animating) {
      clearTimeout(state.timer);
      state.timer = null;
      state.animating = false;
      svg.classList.remove('is-animating', 'is-completed');
      try {
        svg.setCurrentTime(0);
        svg.pauseAnimations();
      } catch (e) {}
    }
  }

  const CardButtons = {
    // Helper to get active vs default summary colors
    getSummaryColors(summaryProps) {
      const active = (summaryProps && summaryProps.colors && summaryProps.colors.active)
        || (summaryProps && summaryProps.colors && summaryProps.colors.flap ? summaryProps.colors : null)
        || { flap: '#ffffff', lines: '#ffffff', eyelid: '#ffffff', pupil: '#ffffff', pupilFill: '#0c0c0c' };
      const def = (summaryProps && summaryProps.colors && summaryProps.colors.default)
        || { flap: '#0c0c0c', lines: '#0c0c0c', eyelid: '#0c0c0c', pupil: '#ffffff', pupilFill: '#0c0c0c' };
      return { active, default: def };
    },

    // Helper to get active vs default eye colors
    getEyeColors(eyeProps) {
      const cfg = eyeProps || (typeof CardConfig !== 'undefined' ? CardConfig.eyeProps : null);
      const active = (cfg && cfg.colors && cfg.colors.active)
        || { lid: '#ffffff', pupil: '#0c0c0c', pupilFill: '#0c0c0c' };
      const def = (cfg && cfg.colors && cfg.colors.default)
        || { lid: '#0c0c0c', pupil: '#ffffff', pupilFill: '#0c0c0c' };
      return {
        active: {
          lid: active.lid || '#ffffff',
          pupil: active.pupil || '#0c0c0c',
          pupilFill: active.pupilFill !== undefined ? active.pupilFill : '#0c0c0c'
        },
        default: {
          lid: def.lid || '#0c0c0c',
          pupil: def.pupil || '#ffffff',
          pupilFill: def.pupilFill !== undefined ? def.pupilFill : '#0c0c0c'
        }
      };
    },

    // Setup button SVGs, Figma Eye, Summary Icon, and wobbly diamond paths
    setup(card, eyeProps, summaryProps = { scale: 1, x: 0, y: 0, rotation: 0 }, sqProps, sqCorners, strokeProps, buttonTextProps) {
      const sqA = card.querySelector('.sq-A');
      const sqB = card.querySelector('.sq-B');
      const sqC = card.querySelector('.sq-C');

      // 1. Generate the wobbly paths independently for each box type using their specific properties
      const dSqA = getWobblyPolygon(sqCorners, sqProps.sqA.freq, sqProps.sqA.amp, sqProps.sqA.smoothness, 201);
      const dSqB = getWobblyPolygon(sqCorners, sqProps.sqB.freq, sqProps.sqB.amp, sqProps.sqB.smoothness, 202);
      const dSqC = getWobblyPolygon(sqCorners, sqProps.sqC.freq, sqProps.sqC.amp, sqProps.sqC.smoothness, 203);

      const btnStroke = (strokeProps && typeof strokeProps === 'object' && typeof strokeProps.buttons === 'number')
        ? strokeProps.buttons
        : (strokeProps === 3 || strokeProps === 4 ? 0 : sqProps.sqA.strokeWidth);

      const pathA = sqA.querySelector('path');
      pathA.setAttribute('d', dSqA);
      pathA.setAttribute('stroke-width', btnStroke);
      pathA.setAttribute('fill', 'var(--btn-default)');

      const pathB = sqB.querySelector('path');
      pathB.setAttribute('d', dSqB);
      pathB.setAttribute('stroke-width', btnStroke);
      pathB.setAttribute('fill', 'var(--btn-default)');

      const pathC = sqC.querySelector('path');
      pathC.setAttribute('d', dSqC);
      pathC.setAttribute('stroke-width', btnStroke);
      pathC.setAttribute('fill', 'var(--btn-default)');

      // Lock getBBox strictly to the diamond outline path for ALL buttons so child icons and text NEVER corrupt GSAP's origin or button offset controls
      [sqA, sqB, sqC].forEach(sq => {
        if (!sq) return;
        const p = sq.querySelector('.sq-path') || sq.querySelector('path');
        if (p) {
          sq.getBBox = () => p.getBBox();
        }
      });

      // 2. Inject the Animated Summary Icon in an isolated invisible container inside sqA
      if (sqA && !sqA.querySelector('.summary-container')) {
        sqA._summaryState = { completed: false, animating: false, timer: null };
        const maskId = `sum_mask_${++summaryMaskCount}`;
        const btnClipId = `sum_btn_clip_${summaryMaskCount}`;

        const iconScale = typeof summaryProps.scale === 'number'
          ? summaryProps.scale
          : (summaryProps.width ? summaryProps.width / 12 : 1);
        const iconX = typeof summaryProps.x === 'number' ? summaryProps.x : 0;
        const iconY = typeof summaryProps.y === 'number' ? summaryProps.y : 0;
        const iconRot = typeof summaryProps.rotation === 'number' ? summaryProps.rotation : 0;

        const shouldClip = summaryProps.clip !== false;
        const sumColorSets = CardButtons.getSummaryColors(summaryProps);
        const colors = sumColorSets.default;

        const sumContainerSVG = `
          <g class="summary-container" style="pointer-events: none;">
            ${shouldClip ? `
            <defs>
              <clipPath id="${btnClipId}">
                <path d="${dSqA}" />
              </clipPath>
            </defs>` : ''}
            <rect class="summary-anchor" x="-8" y="-8" width="16" height="16" fill="none" stroke="none" opacity="0" />
            <g class="summary-clip-wrap"${shouldClip ? ` clip-path="url(#${btnClipId})"` : ''}>
              <svg class="summary-icon-wrapper" viewBox="0 0 121 103" x="${-8 + iconX}" y="${-8 + iconY}" width="16" height="16" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" style="overflow: visible; opacity: 0;">
                <defs>
                  <mask id="${maskId}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="121" height="103">
                    <path class="sum-eyelid-mask" transform="translate(4.0924 0)" d="M12.575 7.08815C17.1996 7.69413 27.9729 3.74097 27.9729 3.74097C27.9729 3.74097 18.3119 -0.228532 12.575 0.0103664C6.83798 0.249265 0 3.74097 0 3.74097C0 3.74097 7.95033 6.48217 12.575 7.08815Z" fill="#ffffff" stroke="#ffffff" stroke-width="0.88">
                      <animate class="sum-anim" attributeName="d"
                        values="M12.575 7.08815C17.1996 7.69413 27.9729 3.74097 27.9729 3.74097C27.9729 3.74097 18.3119 -0.228532 12.575 0.0103664C6.83798 0.249265 0 3.74097 0 3.74097C0 3.74097 7.95033 6.48218 12.575 7.08815Z;
                                M12.575 7.08815C17.1996 7.69413 27.9729 3.74097 27.9729 3.74097C27.9729 3.74097 18.3119 -0.228532 12.575 0.0103664C6.83798 0.249265 0 3.74097 0 3.74097C0 3.74097 7.95033 6.48218 12.575 7.08815Z;
                                M12.575 16.7479C17.1996 18.1797 27.9729 8.83916 27.9729 8.83916C27.9729 8.83916 18.3119 -0.539976 12.575 0.0244937C6.83798 0.588963 0 8.83916 0 8.83916C0 8.83916 7.95033 15.3161 12.575 16.7479Z;
                                M12.575 16.7479C17.1996 18.1797 27.9729 8.83916 27.9729 8.83916C27.9729 8.83916 18.3119 -0.539976 12.575 0.0244937C6.83798 0.588963 0 8.83916 0 8.83916C0 8.83916 7.95033 15.3161 12.575 16.7479Z"
                        keyTimes="0; 0.0350785; 0.349872; 1"
                        keySplines="0 0 1 1; 0.45 1 0.8 1; 0 0 1 1"
                        dur="2s" calcMode="spline" repeatCount="1" fill="freeze" />
                    </path>
                  </mask>
                </defs>
                <style>
                  .summary-icon-wrapper.is-completed .sum-frame {
                    transform: rotate(-71.5deg) !important;
                  }
                  .summary-icon-wrapper.is-completed .sum-pupil-wrap {
                    transform: translate(12.04px, 5.743px) !important;
                  }
                </style>
                <g id="Frame_476" transform="translate(28 26) translate(32.5 25) rotate(${iconRot}) scale(${iconScale}) translate(-32.5 -25)">
                  <g transform="translate(37.5 3)">
                    <g class="sum-frame" id="Frame_478" transform="rotate(18.9)">
                      <animateTransform class="sum-anim" attributeName="transform" type="rotate"
                        values="18.9; 18.9; -8.2; -71.5; -71.5"
                        keyTimes="0; 0.0244; 0.1254; 0.3613; 1"
                        keySplines="0.5 0 0.5 1; 0.11 0.54 0.36 0.84; 0 0 1 1; 0 0 1 1"
                        dur="2s" calcMode="spline" repeatCount="1" fill="freeze" restart="always" />
                      <path class="sum-polygon" d="M16.4135 0L32.9433 99.3644L0 97.5882L16.4135 0Z" fill="${colors.flap}" transform="translate(-8 -10.5) rotate(90)">
                        <animate class="sum-anim" attributeName="d"
                          values="M32.9433 99.3644C32.9433 99.3644 0 97.5882 0 97.5882C0 97.5882 16.4135 0 16.4135 0C16.4135 0 32.9433 99.3644 32.9433 99.3644Z;
                                  M32.9433 99.3644C32.9433 99.3644 0 97.5882 0 97.5882C0 97.5882 16.4135 0 16.4135 0C16.4135 0 32.9433 99.3644 32.9433 99.3644Z;
                                  M125.5545 99.3644C125.5545 99.3644 -91.9595 97.5882 -91.9595 97.5882C-91.9595 97.5882 16.4135 0 16.4135 0C16.4135 0 125.5545 99.3644 125.5545 99.3644Z;
                                  M125.5545 99.3644C125.5545 99.3644 -91.9595 97.5882 -91.9595 97.5882C-91.9595 97.5882 16.4135 0 16.4135 0C16.4135 0 125.5545 99.3644 125.5545 99.3644Z"
                          keyTimes="0; 0.125391; 0.558218; 1"
                          keySplines="0 0 1 1; 0.7 0 0.4 1; 0 0 1 1"
                          dur="2s" calcMode="spline" repeatCount="1" fill="freeze" />
                      </path>
                    </g>
                  </g>
                  <g id="para" transform="translate(0 15.3082)">
                    <path id="Union" d="M15.1094 2.37695L13.96 5.74121L10.2246 4.46484L4.40137 20.2266L7.97852 21.5488L6.89941 24.4717L0 21.9229L0.0117188 21.8887L0 21.8848L8.05469 0.0859375L8.1123 0.106445L8.14941 0L15.1094 2.37695Z" fill="${colors.lines}"/>
                    <path id="Union_2" transform="translate(45 16)" d="M14.667 2.54297L14.6279 2.64844L14.6865 2.66895L8.2666 21.5186L8.27734 21.5225L7.6377 23.3652L7.19531 24.667L7.1875 24.6641L7.11328 24.8809L0 22.416L1.16406 19.0566L4.9082 20.3545L10.2393 4.69922L6.53711 3.33496L7.7666 0L14.667 2.54297Z" fill="${colors.lines}"/>
                    <rect id="Rectangle_34624378" transform="translate(16.7426 8.99997) rotate(20.3956)" width="33" height="5" fill="${colors.lines}"/>
                    <rect id="Rectangle_34624379" transform="translate(13.7753 17.6404) rotate(20.3956)" width="10.8465" height="5" fill="${colors.lines}"/>
                    <rect id="Rectangle_34624380" transform="translate(26.7426 23) rotate(20.3956)" width="19.0404" height="5" fill="${colors.lines}"/>
                  </g>
                  <g id="eye" transform="translate(24.256 0) rotate(18.6413)">
                    <path class="sum-eyelid" transform="translate(4.0924 0)" d="M12.575 7.08815C17.1996 7.69413 27.9729 3.74097 27.9729 3.74097C27.9729 3.74097 18.3119 -0.228532 12.575 0.0103664C6.83798 0.249265 0 3.74097 0 3.74097C0 3.74097 7.95033 6.48217 12.575 7.08815Z" fill="${colors.eyelid}">
                      <animate class="sum-anim" attributeName="d"
                        values="M12.575 7.08815C17.1996 7.69413 27.9729 3.74097 27.9729 3.74097C27.9729 3.74097 18.3119 -0.228532 12.575 0.0103664C6.83798 0.249265 0 3.74097 0 3.74097C0 3.74097 7.95033 6.48218 12.575 7.08815Z;
                                M12.575 7.08815C17.1996 7.69413 27.9729 3.74097 27.9729 3.74097C27.9729 3.74097 18.3119 -0.228532 12.575 0.0103664C6.83798 0.249265 0 3.74097 0 3.74097C0 3.74097 7.95033 6.48218 12.575 7.08815Z;
                                M12.575 16.7479C17.1996 18.1797 27.9729 8.83916 27.9729 8.83916C27.9729 8.83916 18.3119 -0.539976 12.575 0.0244937C6.83798 0.588963 0 8.83916 0 8.83916C0 8.83916 7.95033 15.3161 12.575 16.7479Z;
                                M12.575 16.7479C17.1996 18.1797 27.9729 8.83916 27.9729 8.83916C27.9729 8.83916 18.3119 -0.539976 12.575 0.0244937C6.83798 0.588963 0 8.83916 0 8.83916C0 8.83916 7.95033 15.3161 12.575 16.7479Z"
                        keyTimes="0; 0.0350785; 0.349872; 1"
                        keySplines="0 0 1 1; 0.45 1 0.8 1; 0 0 1 1"
                        dur="2s" calcMode="spline" repeatCount="1" fill="freeze" />
                    </path>
                    <g mask="url(#${maskId})">
                      <g transform="translate(0 3.4914)">
                        <g class="sum-pupil-wrap" transform="translate(-4.565 -1.566)">
                          <animateTransform class="sum-anim" attributeName="transform" type="translate"
                            values="-4.565, -1.566; -4.565, -1.566; 12.04, 5.743; 12.04, 5.743"
                            keyTimes="0; 0.1254; 0.3774; 1"
                            keySplines="0 0 1 1; 0 0 0 1; 0 0 1 1"
                            dur="2s" calcMode="spline" repeatCount="1" fill="freeze" restart="always" />
                          <circle class="sum-pupil" cx="6.4752" cy="6.4752" r="5.15242" fill="${colors.pupilFill}" stroke="${colors.pupil}" stroke-width="2.64557"/>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </g>
          </g>
        `;
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${sumContainerSVG}</svg>`, "image/svg+xml");
        const sumNode = doc.documentElement.firstElementChild;
        if (summaryGlobalCompleted) {
          const wrapper = sumNode.querySelector('.summary-icon-wrapper');
          if (wrapper) wrapper.classList.add('is-completed');
        }
        sqA.appendChild(sumNode);
      }

      // 3. Inject Figma Eye exclusively into View Project button (sqB)
      const eyeCols = CardButtons.getEyeColors(eyeProps);
      const pupilStrokeWidth = (eyeProps && eyeProps.pupilStrokeWidth) || 6;
      [sqB].forEach(sq => {
        if (!sq || sq.querySelector('.eye-wrapper')) return;

        const eyeSVG = `
          <svg class="eye-wrapper" viewBox="0 0 67 39" x="${eyeProps.x}" y="${eyeProps.y}" width="${eyeProps.width}" height="${eyeProps.height}" style="transform: rotate(${eyeProps.rotation}deg); overflow: visible; opacity: 0;">
            <path class="eye-lid" d="M29.8665 37.0981C42.4609 37.0981 64.7881 20.0518 64.7881 20.0518C64.7881 20.0518 42.8777 -0.163855 29.8665 1.05279C16.8553 2.26944 1.34717 20.0518 1.34717 20.0518C1.34717 20.0518 17.272 37.0981 29.8665 37.0981Z" fill="${eyeCols.default.lid}" stroke="${eyeCols.default.lid}" stroke-width="2"/>
            <circle class="eye-pupil" cx="31.1463" cy="18.9801" r="11.6854" fill="${eyeCols.default.pupilFill}" stroke="${eyeCols.default.pupil}" stroke-width="${pupilStrokeWidth}"/>
          </svg>
        `;

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${eyeSVG}</svg>`, "image/svg+xml");
        const eyeNode = doc.documentElement.firstElementChild;
        sq.appendChild(eyeNode);
      });

      // 4. Inject Button Text Overlays (strictly attached to buttons, zero effect on button center)
      const textProps = buttonTextProps || (typeof CardConfig !== 'undefined' ? CardConfig.buttonTextProps : null) || {};
      const globalFont = textProps.font || "'Departure Mono', monospace";
      let globalSize = textProps.size || textProps.fontSize || '2.8px';
      if (typeof globalSize === 'number') globalSize = globalSize + 'px';
      const globalWeight = textProps.weight || textProps.fontWeight || 700;
      let globalSpacing = textProps.spacing || textProps.letterSpacing || '0.04em';
      if (typeof globalSpacing === 'number') globalSpacing = globalSpacing + 'em';
      const globalTransform = textProps.transform || 'uppercase';
      const globalColor = textProps.color || '#111111';

      const boxCfg = textProps.box || {};
      const boxFill = boxCfg.fill || '#ffffff';
      const boxStroke = boxCfg.stroke || 'none';
      const boxStrokeWidth = typeof boxCfg.strokeWidth === 'number' ? boxCfg.strokeWidth : 0;
      const boxRadius = typeof boxCfg.radius === 'number' ? boxCfg.radius : (boxCfg.rx !== undefined ? boxCfg.rx : 1.0);
      const padX = typeof boxCfg.paddingX === 'number' ? boxCfg.paddingX : 2.2;
      const padY = typeof boxCfg.paddingY === 'number' ? boxCfg.paddingY : 1.2;

      [
        { sq: sqA, key: 'sqA', defaultText: 'Summary' },
        { sq: sqB, key: 'sqB', defaultText: 'Project' },
        { sq: sqC, key: 'sqC', defaultText: 'Media' }
      ].forEach(({ sq, key, defaultText }) => {
        if (!sq) return;
        let textGroup = sq.querySelector('.btn-text-group');
        if (!textGroup) {
          textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          textGroup.setAttribute('class', 'btn-text-group');
          textGroup.style.pointerEvents = 'none';
          textGroup.style.userSelect = 'none';
          textGroup.style.webkitUserSelect = 'none';
          textGroup.style.opacity = '0';
          sq.appendChild(textGroup);
        }

        let boxRect = textGroup.querySelector('.btn-text-box');
        if (!boxRect) {
          boxRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          boxRect.setAttribute('class', 'btn-text-box');
          boxRect.style.pointerEvents = 'none';
          boxRect.style.userSelect = 'none';
          boxRect.style.webkitUserSelect = 'none';
          textGroup.insertBefore(boxRect, textGroup.firstChild);
        }

        let textEl = textGroup.querySelector('.btn-text');
        if (!textEl) {
          textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.setAttribute('class', 'btn-text');
          textEl.setAttribute('x', '0');
          textEl.setAttribute('y', '0');
          textEl.setAttribute('text-anchor', 'middle');
          textEl.setAttribute('dominant-baseline', 'central');
          textEl.style.pointerEvents = 'none';
          textEl.style.userSelect = 'none';
          textEl.style.webkitUserSelect = 'none';
          textGroup.appendChild(textEl);
        }

        const btnCfg = (textProps.buttons && textProps.buttons[key]) || {};
        const posX = typeof btnCfg.x === 'number' ? btnCfg.x : 0;
        const posY = typeof btnCfg.y === 'number' ? btnCfg.y : 13;
        const rot = typeof btnCfg.rotation === 'number' ? btnCfg.rotation : (key === 'sqA' ? 190 : key === 'sqB' ? 155 : 145);
        let rawText = btnCfg.text || defaultText;
        if (globalTransform === 'uppercase') rawText = rawText.toUpperCase();
        else if (globalTransform === 'lowercase') rawText = rawText.toLowerCase();

        textGroup.setAttribute('transform', `translate(${posX}, ${posY}) rotate(${rot})`);

        if (textEl) {
          textEl.textContent = rawText;
          textEl.style.fontFamily = globalFont;
          textEl.style.fontSize = globalSize;
          textEl.style.fontWeight = String(globalWeight);
          textEl.style.letterSpacing = globalSpacing;
          textEl.style.fill = globalColor;
        }

        // Measure text or calculate box dimensions
        let bw = btnCfg.boxWidth || boxCfg.width;
        let bh = btnCfg.boxHeight || boxCfg.height;
        if (typeof bw !== 'number' || typeof bh !== 'number') {
          let textW = 0;
          let textH = 0;
          try {
            if (typeof textEl.getBBox === 'function') {
              const bbox = textEl.getBBox();
              if (bbox && bbox.width > 0) {
                textW = bbox.width;
                textH = bbox.height;
              }
            }
          } catch (e) {}

          const numSize = parseFloat(globalSize) || 2.8;
          if (!textW) textW = rawText.length * numSize * 0.85;
          if (!textH) textH = numSize * 1.4;

          bw = typeof bw === 'number' ? bw : Math.round((textW + padX * 2) * 10) / 10;
          bh = typeof bh === 'number' ? bh : Math.round((textH + padY * 2) * 10) / 10;
        }

        boxRect.setAttribute('x', String(-bw / 2));
        boxRect.setAttribute('y', String(-bh / 2));
        boxRect.setAttribute('width', String(bw));
        boxRect.setAttribute('height', String(bh));
        boxRect.setAttribute('rx', String(boxRadius));
        boxRect.setAttribute('ry', String(boxRadius));
        boxRect.setAttribute('fill', boxFill);
        boxRect.setAttribute('stroke', boxStroke);
        boxRect.setAttribute('stroke-width', String(boxStrokeWidth));
      });

      return { sqA, sqB, sqC };
    },

    // Physically lock the squares to the flap vertices plus their custom offsets!
    updatePositions(buttons, state, offsets) {
      const { sqA, sqB, sqC } = buttons;
      if (sqA && sqA.style.display !== 'none') {
        gsap.set(sqA, { x: state.p2x + offsets.sqA.x, y: state.p2y + offsets.sqA.y, rotation: offsets.sqA.rotation, opacity: state.opacity, transformOrigin: offsets.sqA.origin });
      }
      if (sqB && sqB.style.display !== 'none') {
        gsap.set(sqB, { x: state.p4x + offsets.sqB.x, y: state.p4y + offsets.sqB.y, rotation: offsets.sqB.rotation, opacity: state.opacity, transformOrigin: offsets.sqB.origin });
      }
      if (sqC && sqC.style.display !== 'none') {
        gsap.set(sqC, { x: state.p6x + offsets.sqC.x, y: state.p6y + offsets.sqC.y, rotation: offsets.sqC.rotation, opacity: state.opacity, transformOrigin: offsets.sqC.origin });
      }
    },

    // Evaluate proximity against the green peel triangle
    evaluateProximity({ buttons, state, mouse, offsets, buttonLabels, defaultBehindText, setTextFn, proximityProps, summaryProps, buttonTextProps, eyeProps, cardRect }) {
      const { sqA, sqB, sqC } = buttons;
      const svgTipX = state.innerP2x;
      const svgTipY = state.innerP2y;

      const prox = proximityProps || (typeof CardConfig !== 'undefined' && CardConfig.buttonProximityProps) || {
        startDistance: 85,
        fullSizeDistance: 45,
        instantIcon: true,
        growthMode: 'gradual',
        iconAppearPercent: 0.5,
        maxScale: 4
      };
      const {
        startDistance = 85,
        fullSizeDistance = 45,
        instantIcon = true,
        growthMode = 'gradual',
        iconAppearPercent = 0.5,
        maxScale = 4
      } = prox;

      let appearRatio = (typeof iconAppearPercent === 'number') ? iconAppearPercent : 0.5;
      if (appearRatio > 1) appearRatio = appearRatio / 100;
      appearRatio = Math.max(0, Math.min(1, appearRatio));

      const sumColors = CardButtons.getSummaryColors(summaryProps || (typeof CardConfig !== 'undefined' && CardConfig.summaryProps));

      const textProps = buttonTextProps || (typeof CardConfig !== 'undefined' ? CardConfig.buttonTextProps : null) || {};
      let textAppearRatio = (typeof textProps.textAppearPercent === 'number') ? textProps.textAppearPercent : 0.5;
      if (textAppearRatio > 1) textAppearRatio = textAppearRatio / 100;
      textAppearRatio = Math.max(0, Math.min(1, textAppearRatio));
      const instantText = textProps.instantText !== undefined ? textProps.instantText : true;
      const textDefaultColor = textProps.color || '#111111';
      const textActiveColor = textProps.activeColor || '#ffffff';

      // If the peel is at unpeeled resting position, no button can be locked!
      const restingTipX = (typeof CardConfig !== 'undefined' && CardConfig.greenPeelClosedState && typeof CardConfig.greenPeelClosedState.innerP2x === 'number')
        ? CardConfig.greenPeelClosedState.innerP2x : 60;
      const restingTipY = (typeof CardConfig !== 'undefined' && CardConfig.greenPeelClosedState && typeof CardConfig.greenPeelClosedState.innerP2y === 'number')
        ? CardConfig.greenPeelClosedState.innerP2y : 60;

      if (svgTipX <= restingTipX + 2 && svgTipY <= restingTipY + 2) {
        setTextFn(defaultBehindText);
        CardButtons.highlight(buttons, null, summaryProps, buttonTextProps);
        return null;
      }

      // PASS 1: STATE EVALUATION!
      const centroidX = (state.innerP1x + svgTipX + state.innerP3x) / 3;
      const centroidY = (state.innerP1y + svgTipY + state.innerP3y) / 3;

      const activeButtons = [sqA, sqB, sqC].filter(sq => sq && sq.style.display !== 'none');
      const sqData = activeButtons.map(sq => {
        let sqX = 0, sqY = 0;
        if (sq === sqA) { sqX = state.p2x + offsets.sqA.x; sqY = state.p2y + offsets.sqA.y; }
        if (sq === sqB) { sqX = state.p4x + offsets.sqB.x; sqY = state.p4y + offsets.sqB.y; }
        if (sq === sqC) { sqX = state.p6x + offsets.sqC.x; sqY = state.p6y + offsets.sqC.y; }

        let isInsideTriangle = checkPointInTriangle(sqX, sqY, state.innerP1x, state.innerP1y, svgTipX, svgTipY, state.innerP3x, state.innerP3y);

        // Compute button center: use cached cardRect to eliminate forced synchronous reflows, or fallback
        let sqCenterX, sqCenterY;
        if (cardRect) {
          sqCenterX = cardRect.left + sqX;
          sqCenterY = cardRect.top + sqY;
        } else {
          const sqOutline = sq.querySelector('.sq-path') || sq;
          const rect = sqOutline.getBoundingClientRect();
          sqCenterX = rect.left + rect.width / 2;
          sqCenterY = rect.top + rect.height / 2;
        }

        const mouseDist = Math.hypot(mouse.x - sqCenterX, mouse.y - sqCenterY);
        const tipDist = Math.hypot(svgTipX - sqX, svgTipY - sqY);
        const centroidDist = Math.hypot(centroidX - sqX, centroidY - sqY);

        return { sq, tipDist, mouseDist, centroidDist, isInsideTriangle };
      });


      let lockedButton = null;
      let candidates = sqData.filter(d => d.isInsideTriangle);

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const diff = a.centroidDist - b.centroidDist;
          // TIE-BREAKER: If roughly at same depth (within 15px), View button (sqB) always wins!
          if (Math.abs(diff) < 15) {
            if (a.sq === sqB) return -1;
            if (b.sq === sqB) return 1;
          }
          return diff;
        });
        lockedButton = candidates[0].sq;
      }

      // Update revealed text
      if (lockedButton === sqA) {
        setTextFn(buttonLabels.sqA || 'Summary');
      } else if (lockedButton === sqB) {
        setTextFn(defaultBehindText || buttonLabels.sqB || 'Project 1');
      } else if (lockedButton === sqC) {
        setTextFn(buttonLabels.sqC || 'Media');
      } else {
        setTextFn(defaultBehindText);
      }

      // Handle summary icon playback trigger/pause:
      // Plays ONLY when sqA's icon actually appears (based on iconAppearPercent), or when selected!
      const sqAData = sqData.find(d => d.sq === sqA);
      let isSqAVisible = false;

      if (lockedButton === sqA) {
        isSqAVisible = true;
      } else if (sqAData) {
        const sqADist = Math.min(sqAData.tipDist, sqAData.mouseDist);
        if (sqADist < startDistance) {
          let pA = 0;
          if (growthMode === 'tween') {
            pA = 1;
          } else {
            pA = (sqADist <= fullSizeDistance) ? 1 : (startDistance - sqADist) / (startDistance - fullSizeDistance);
            pA = Math.max(0, Math.min(1, pA));
          }
          isSqAVisible = (pA >= appearRatio);
        }
      }

      if (isSqAVisible) {
        triggerSummaryPlay(sqA);
      } else {
        stopSummaryPlay(sqA);
      }

      // PASS 2: 2-STAGE VISUAL ANIMATION
      // Stage 1: As peel/cursor approaches, button swells to maxScale and icon appears in DEFAULT colors once size threshold is crossed.
      // Stage 2: When locked/selected, button stays at maxScale and switches to HIGHLIGHT colors.
      sqData.forEach(data => {
        const { sq, tipDist, mouseDist } = data;
        const isLocked = (lockedButton === sq);

        let scaleTarget = 1;
        let iconOpacity = 0;
        let textOpacity = 0;
        let sqFill = "var(--btn-default)";
        let textColor = textDefaultColor;

        if (isLocked) {
          // STAGE 2: SELECTED / LOCKED!
          scaleTarget = maxScale;
          iconOpacity = 1;
          textOpacity = 1;
          sqFill = "var(--btn-active)";
          textColor = textActiveColor;
        } else {
          // STAGE 1: PROXIMITY APPROACH (BEFORE SELECTION)
          const effectiveDist = Math.min(tipDist, mouseDist);

          if (effectiveDist < startDistance) {
            let p = 0;
            if (growthMode === 'tween') {
              p = 1;
              scaleTarget = maxScale;
            } else {
              if (effectiveDist <= fullSizeDistance) {
                p = 1;
              } else {
                p = (startDistance - effectiveDist) / (startDistance - fullSizeDistance);
              }
              p = Math.max(0, Math.min(1, p));
              scaleTarget = 1 + (maxScale - 1) * p;
            }

            // Check if button has reached configured size percentage (iconAppearPercent) to reveal icon!
            if (p >= appearRatio) {
              if (instantIcon) {
                iconOpacity = 1;
              } else {
                iconOpacity = Math.max(0, Math.min(1, (p - appearRatio) / Math.max(0.001, 1 - appearRatio)));
              }
            } else {
              iconOpacity = 0;
            }

            // Check if button has reached configured size percentage (textAppearPercent) to reveal text!
            if (p >= textAppearRatio) {
              if (instantText) {
                textOpacity = 1;
              } else {
                textOpacity = Math.max(0, Math.min(1, (p - textAppearRatio) / Math.max(0.001, 1 - textAppearRatio)));
              }
            } else {
              textOpacity = 0;
            }

            // Stays default color in inactive state!
            sqFill = "var(--btn-default)";
            textColor = textDefaultColor;
          } else {
            scaleTarget = 1;
            iconOpacity = 0;
            textOpacity = 0;
            sqFill = "var(--btn-default)";
            textColor = textDefaultColor;
          }
        }

        gsap.to(sq, { scale: scaleTarget, duration: 0.15, overwrite: "auto" });

        const sqPath = sq.querySelector('.sq-path');
        if (sqPath) gsap.to(sqPath, { fill: sqFill, duration: 0.15, overwrite: "auto" });

        // Update Text Overlay
        const textGroup = sq.querySelector('.btn-text-group');
        if (textGroup) {
          gsap.to(textGroup, { opacity: textOpacity, duration: 0.15, overwrite: "auto" });
          const textEl = textGroup.querySelector('.btn-text');
          if (textEl) {
            gsap.to(textEl, { fill: textColor, duration: 0.15, overwrite: "auto" });
          }
        }

        // Update Eye in sqB
        const eye = sq.querySelector('.eye-wrapper');
        if (eye) {
          const eyeColors = CardButtons.getEyeColors(eyeProps);
          const col = isLocked ? eyeColors.active : eyeColors.default;
          gsap.to(eye, { opacity: iconOpacity, duration: 0.15, overwrite: "auto" });
          const lid = eye.querySelector('.eye-lid');
          if (lid) gsap.to(lid, { fill: col.lid, stroke: col.lid, duration: 0.15, overwrite: "auto" });
          const pupil = eye.querySelector('.eye-pupil');
          if (pupil) gsap.to(pupil, { stroke: col.pupil, fill: col.pupilFill, duration: 0.15, overwrite: "auto" });
        }

        // Update Summary Icon in sqA
        const sumIcon = sq.querySelector('.summary-icon-wrapper');
        if (sumIcon) {
          gsap.to(sumIcon, { opacity: iconOpacity, duration: 0.15, overwrite: "auto" });
          const flapEl = sumIcon.querySelector('.sum-polygon');
          const lineEls = sumIcon.querySelectorAll('#para path, #para rect');
          const eyelidEl = sumIcon.querySelector('.sum-eyelid');
          const pupilEl = sumIcon.querySelector('.sum-pupil');

          const col = isLocked ? sumColors.active : sumColors.default;
          if (flapEl) gsap.to(flapEl, { fill: col.flap, duration: 0.15, overwrite: "auto" });
          if (lineEls.length) gsap.to(lineEls, { fill: col.lines, duration: 0.15, overwrite: "auto" });
          if (eyelidEl) gsap.to(eyelidEl, { fill: col.eyelid, duration: 0.15, overwrite: "auto" });
          if (pupilEl) gsap.to(pupilEl, { stroke: col.pupil, fill: col.pupilFill, duration: 0.15, overwrite: "auto" });
        }
      });

      return lockedButton;
    },

    // Directly highlight a button to max lock state (scale 4, active color, icon open)
    highlight(buttons, buttonToLock, summaryProps, buttonTextProps, eyeProps) {
      const { sqA, sqB, sqC } = buttons;

      if (buttonToLock === sqA) {
        triggerSummaryPlay(sqA);
      } else {
        stopSummaryPlay(sqA);
      }

      const maxScale = (typeof CardConfig !== 'undefined' && CardConfig.buttonProximityProps && CardConfig.buttonProximityProps.maxScale) || 4;
      const sumColors = CardButtons.getSummaryColors(summaryProps || (typeof CardConfig !== 'undefined' && CardConfig.summaryProps));
      const eyeColors = CardButtons.getEyeColors(eyeProps);
      const textProps = buttonTextProps || (typeof CardConfig !== 'undefined' ? CardConfig.buttonTextProps : null) || {};
      const textDefaultColor = textProps.color || '#111111';
      const textActiveColor = textProps.activeColor || '#ffffff';

      [sqA, sqB, sqC].forEach(sq => {
        if (!sq || sq.style.display === 'none') return;
        const isTarget = (sq === buttonToLock);
        const scaleTarget = isTarget ? maxScale : 1;
        const iconOpacity = isTarget ? 1 : 0;
        const textOpacity = isTarget ? 1 : 0;
        const sqFill = isTarget ? "var(--btn-active)" : "var(--btn-default)";
        const textColor = isTarget ? textActiveColor : textDefaultColor;

        gsap.to(sq, { scale: scaleTarget, duration: 0.15, overwrite: "auto" });

        const sqPath = sq.querySelector('.sq-path');
        if (sqPath) gsap.to(sqPath, { fill: sqFill, duration: 0.15, overwrite: "auto" });

        // Update Text Overlay
        const textGroup = sq.querySelector('.btn-text-group');
        if (textGroup) {
          gsap.to(textGroup, { opacity: textOpacity, duration: 0.15, overwrite: "auto" });
          const textEl = textGroup.querySelector('.btn-text');
          if (textEl) {
            gsap.to(textEl, { fill: textColor, duration: 0.15, overwrite: "auto" });
          }
        }

        const eye = sq.querySelector('.eye-wrapper');
        if (eye) {
          const col = isTarget ? eyeColors.active : eyeColors.default;
          gsap.to(eye, { opacity: iconOpacity, duration: 0.15, overwrite: "auto" });
          const lid = eye.querySelector('.eye-lid');
          if (lid) gsap.to(lid, { fill: col.lid, stroke: col.lid, duration: 0.15, overwrite: "auto" });
          const pupil = eye.querySelector('.eye-pupil');
          if (pupil) gsap.to(pupil, { stroke: col.pupil, fill: col.pupilFill, duration: 0.15, overwrite: "auto" });
        }

        const sumIcon = sq.querySelector('.summary-icon-wrapper');
        if (sumIcon) {
          gsap.to(sumIcon, { opacity: iconOpacity, duration: 0.15, overwrite: "auto" });
          const flapEl = sumIcon.querySelector('.sum-polygon');
          const lineEls = sumIcon.querySelectorAll('#para path, #para rect');
          const eyelidEl = sumIcon.querySelector('.sum-eyelid');
          const pupilEl = sumIcon.querySelector('.sum-pupil');

          const col = isTarget ? sumColors.active : sumColors.default;
          if (flapEl) gsap.to(flapEl, { fill: col.flap, duration: 0.15, overwrite: "auto" });
          if (lineEls.length) gsap.to(lineEls, { fill: col.lines, duration: 0.15, overwrite: "auto" });
          if (eyelidEl) gsap.to(eyelidEl, { fill: col.eyelid, duration: 0.15, overwrite: "auto" });
          if (pupilEl) gsap.to(pupilEl, { stroke: col.pupil, fill: col.pupilFill, duration: 0.15, overwrite: "auto" });
        }
      });
    },

    // Reset all buttons back to resting scale and default fill
    reset(buttons, summaryProps, buttonTextProps, eyeProps) {
      const { sqA, sqB, sqC } = buttons;
      stopSummaryPlay(sqA);
      const sumColors = CardButtons.getSummaryColors(summaryProps || (typeof CardConfig !== 'undefined' ? CardConfig.summaryProps : null));
      const eyeColors = CardButtons.getEyeColors(eyeProps);
      const textProps = buttonTextProps || (typeof CardConfig !== 'undefined' ? CardConfig.buttonTextProps : null) || {};
      const textDefaultColor = textProps.color || '#111111';

      [sqA, sqB, sqC].forEach(sq => {
        if (!sq || sq.style.display === 'none') return;
        gsap.set(sq, { scale: 1 });
        const p = sq.querySelector('.sq-path');
        if (p) gsap.set(p, { fill: 'var(--btn-default)' });

        const textGroup = sq.querySelector('.btn-text-group');
        if (textGroup) {
          gsap.set(textGroup, { opacity: 0 });
          const textEl = textGroup.querySelector('.btn-text');
          if (textEl) {
            gsap.set(textEl, { fill: textDefaultColor });
          }
        }

        const eye = sq.querySelector('.eye-wrapper');
        if (eye) {
          gsap.set(eye, { opacity: 0 });
          const lid = eye.querySelector('.eye-lid');
          if (lid) gsap.set(lid, { fill: eyeColors.default.lid, stroke: eyeColors.default.lid });
          const pupil = eye.querySelector('.eye-pupil');
          if (pupil) gsap.set(pupil, { stroke: eyeColors.default.pupil, fill: eyeColors.default.pupilFill });
        }
        const sumIcon = sq.querySelector('.summary-icon-wrapper');
        if (sumIcon) {
          gsap.set(sumIcon, { opacity: 0 });
          const flapEl = sumIcon.querySelector('.sum-polygon');
          const lineEls = sumIcon.querySelectorAll('#para path, #para rect');
          const eyelidEl = sumIcon.querySelector('.sum-eyelid');
          const pupilEl = sumIcon.querySelector('.sum-pupil');
          if (flapEl) gsap.set(flapEl, { fill: sumColors.default.flap });
          if (lineEls.length) gsap.set(lineEls, { fill: sumColors.default.lines });
          if (eyelidEl) gsap.set(eyelidEl, { fill: sumColors.default.eyelid });
          if (pupilEl) gsap.set(pupilEl, { stroke: sumColors.default.pupil, fill: sumColors.default.pupilFill });
        }
      });
    }
  };

  window.CardButtons = CardButtons;
})();

