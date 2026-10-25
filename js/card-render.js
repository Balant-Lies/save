// ====================================================
// CARD RENDER MODULE
// Responsible for:
// 1. Initial wobbly card outline generation
// 2. Dynamic polygon clipping math (calculating corner intersections as the card is peeled)
// 3. Updating SVG paths for card background, white flap, and inner peel triangle
// ====================================================

(function() {
  const getWobblyPolygon = (corners, freq, amp, segmentLen, seedOffset, forceStraight) => {
    if (typeof CardGeometry !== 'undefined' && CardGeometry.generateWobblyPolygon) {
      return CardGeometry.generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset, forceStraight);
    }
    return generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset, forceStraight);
  };

  const CardRender = {
    // Initialize the wavy outline for this card!
    renderCardOutline(bgPath, clipPath, cardProps) {
      const cardCorners = [
        { x: 0, y: 0 },
        { x: cardProps.width, y: 0 },
        { x: cardProps.width, y: cardProps.height - cardProps.clipY },
        { x: cardProps.width - cardProps.clipX, y: cardProps.height },
        { x: 0, y: cardProps.height }
      ];
      const d = getWobblyPolygon(cardCorners, cardProps.freq, cardProps.amp, cardProps.smoothness, 0);
      bgPath.setAttribute('d', d);
      clipPath.setAttribute('d', d);
    },

    // Apply stroke settings for the chosen strokeProps or legacy LINE_MODE
    applyLineMode(elements, strokeProps) {
      const { bgPath, path, innerPath, innerOuterPath } = elements;
      let cardStroke = 2, flapStroke = 0, innerStroke = 0, innerOuterStroke = 0;

      if (strokeProps && typeof strokeProps === 'object') {
        cardStroke = typeof strokeProps.card === 'number' ? strokeProps.card : 2;
        flapStroke = typeof strokeProps.flap === 'number' ? strokeProps.flap : 0;
        innerStroke = typeof strokeProps.innerPeel === 'number' ? strokeProps.innerPeel : 0;
        innerOuterStroke = typeof strokeProps.innerPeelOuter === 'number' ? strokeProps.innerPeelOuter : 0;
      } else {
        const mode = Number(strokeProps);
        if (mode === 3) { cardStroke = 0; flapStroke = 0; innerStroke = 0; innerOuterStroke = 0; }
        else if (mode === 4) { cardStroke = 2; flapStroke = 0; innerStroke = 0; innerOuterStroke = 0; }
        else { cardStroke = 2; flapStroke = 2; innerStroke = 2; innerOuterStroke = 3; }
      }

      if (bgPath) bgPath.setAttribute('stroke-width', cardStroke);
      if (path) path.setAttribute('stroke-width', flapStroke);
      if (innerPath) innerPath.setAttribute('stroke-width', innerStroke);
      if (innerOuterPath) innerOuterPath.setAttribute('stroke-width', innerOuterStroke);
    },

    // UPDATE THE CARD BACKGROUND CLIP & PEEL FLAPS (Dynamic Peeling!)
    // We mathematically calculate the exact intersections to slice off corners when peeled outside!
    renderCardPaths(elements, state, cardProps, innerTriProps, strokeProps) {
      const { bgPath, clipPath, path, innerPath } = elements;
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

      const dCard = getWobblyPolygon(cardCorners, cardProps.freq, cardProps.amp, cardProps.smoothness, 0);
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
      const isFlapStraight = false;
      const dTri = getWobblyPolygon(triCorners, cardProps.freq, cardProps.amp * 1.5, cardProps.smoothness, 100, isFlapStraight);
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
        const dInner = getWobblyPolygon(innerCorners, innerTriProps.freq, innerTriProps.amp, innerTriProps.smoothness, 101, isFlapStraight);
        innerPath.setAttribute('d', dInner);
        if (elements.innerOuterPath) {
          elements.innerOuterPath.setAttribute('d', dInner);
        }
      }
    }
  };

  window.CardRender = CardRender;
})();
