// ====================================================
// CARD TRANSITIONS MODULE
// Responsible for:
// 1. Text micro-pop updates behind the peeled card
// 2. Preloading target destination pages
// 3. 1,200px Peel Flyaway physics animation
// 4. Loading progress bar holding & smooth page redirect
// ====================================================

(function() {
  const CardTransitions = {
    // Smoothly update the text revealed behind the card with a micro-pop animation
    setBehindText(behindTextEl, textState, targetText) {
      if (!behindTextEl || textState.current === targetText) return;
      textState.current = targetText;

      gsap.killTweensOf(behindTextEl);
      gsap.to(behindTextEl, {
        opacity: 0,
        scale: 0.9,
        duration: 0.08,
        ease: "power2.in",
        onComplete: () => {
          behindTextEl.textContent = targetText;
          gsap.to(behindTextEl, {
            opacity: 1,
            scale: 1,
            duration: 0.15,
            ease: "back.out(1.5)"
          });
        }
      });
    },

    // Execute peel flyaway and handle loading bar delay & page redirect
    executeFlyaway(params) {
      const {
        wrap, card, state, buttons,
        releaseBases, flapBases, normX, normY,
        routes, lockedButton, buttonLabels, defaultBehindText,
        transitionProps, behindTextEl, textState,
        renderFn, onFlyawayComplete
      } = params;

      // Kill any lingering animations on 'state' so it doesn't fight the flyaway math!
      gsap.killTweensOf(state);

      // Determine target page and final behind text from routes/labels configuration
      const { sqA, sqB, sqC } = buttons;
      const finalSelectedButton = lockedButton || sqB;
      let targetPage = routes.sqB || 'project1.html';
      let finalTargetText = defaultBehindText || buttonLabels.sqB || 'Project 1';

      if (finalSelectedButton === sqA) {
        targetPage = routes.sqA || 'summary.html';
        finalTargetText = buttonLabels.sqA || 'Summary';
      } else if (finalSelectedButton === sqB) {
        targetPage = routes.sqB || 'project1.html';
        finalTargetText = defaultBehindText || buttonLabels.sqB || 'Project 1';
      } else if (finalSelectedButton === sqC) {
        targetPage = routes.sqC || 'media.html';
        finalTargetText = buttonLabels.sqC || 'Media';
      }

      // Freeze behind text permanently for the flyaway duration
      if (behindTextEl) {
        gsap.killTweensOf(behindTextEl);
        behindTextEl.textContent = finalTargetText;
        textState.current = finalTargetText;
        gsap.set(behindTextEl, { opacity: 1, scale: 1 });
      }

      // Ensure buttons are visible and the target button stays highlighted throughout flyaway
      state.opacity = 1;
      if (typeof CardButtons !== 'undefined') {
        CardButtons.highlight(buttons, finalSelectedButton);
      }

      const activeWrap = card.closest('.wrap');
      if (activeWrap) activeWrap.style.pointerEvents = 'none';

      // 1. Preload the exact selected page and its assets immediately in the background!
      const prefetch = document.createElement('link');
      prefetch.rel = 'prefetch';
      prefetch.href = targetPage;
      document.head.appendChild(prefetch);

      try {
        fetch(targetPage, { mode: 'no-cors' }).catch(() => {});
      } catch (err) {}

      // We animate a proxy value representing the "continuous pull distance"
      const proxy = { dist: 0, blend: 0 };
      gsap.to(proxy, {
        dist: 1200, // Pull it 1200 pixels away!
        blend: 1,   // Curve fully to the target trajectory by the end
        duration: transitionProps.flyawayDuration,
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

          renderFn();
        },
        onComplete: () => {
          // Double check behind text remains rigidly locked to target option
          if (behindTextEl) {
            behindTextEl.textContent = finalTargetText;
            textState.current = finalTargetText;
          }

          if (typeof onFlyawayComplete === 'function') onFlyawayComplete();

          // Entire peel is done! Show loading bar and hold text for configurable duration!
          const holdTime = typeof transitionProps.loadingHoldDuration === 'number' ? transitionProps.loadingHoldDuration : 1.2;
          const fadeTime = typeof transitionProps.fadeDuration === 'number' ? transitionProps.fadeDuration : 0.25;

          const cardLoadingBar = wrap.querySelector('.card-loading-bar');
          const cardLoadingProgress = wrap.querySelector('.card-loading-progress');
          const behindContent = wrap.querySelector('.card-behind-content') || behindTextEl;

          if (cardLoadingBar) cardLoadingBar.classList.add('active');

          if (cardLoadingProgress && holdTime > 0) {
            gsap.fromTo(cardLoadingProgress, { scaleX: 0 }, {
              scaleX: 1,
              duration: holdTime,
              ease: "power1.inOut",
              onComplete: () => {
                // Smoothly fade out the text and loading bar before navigating!
                if (behindContent) {
                  gsap.to(behindContent, {
                    opacity: 0,
                    duration: fadeTime,
                    ease: "power2.out",
                    onComplete: () => {
                      window.location.href = targetPage;
                    }
                  });
                } else {
                  window.location.href = targetPage;
                }
              }
            });
          } else {
            window.location.href = targetPage;
          }
        }
      });
    }
  };

  window.CardTransitions = CardTransitions;
})();
