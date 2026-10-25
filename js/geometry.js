// ====================================================
// GEOMETRY & MATHEMATICAL UTILITIES
// Generates organic wobbly SVG polygon paths and calculates
// point-in-triangle collision detection for interactive buttons.
// ====================================================

// A generic function that takes ANY array of corner coordinates
// and generates a mathematical wobbly path between them!
function generateWobblyPolygon(corners, freq, amp, segmentLen, seedOffset = 0, forceStraight = false) {
  let d = "";

  // Check if wobble is disabled in CardConfig.strokeProps or via legacy LINE_MODE
  const config = (typeof CardConfig !== 'undefined') ? CardConfig : {};
  const isStraight = (config.strokeProps && config.strokeProps.wobble === false) ||
                     (config.LINE_MODE === 1) ||
                     forceStraight;

  // Straight lines mode (no wobble)
  if (isStraight) {
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

// Helper function for strict Point-in-Triangle mathematical bounding!
function isPointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const area = 0.5 * (-by * cx + ay * (-bx + cx) + ax * (by - cy) + bx * cy);
  if (Math.abs(area) < 0.1) return false;
  const s = 1 / (2 * area) * (ay * cx - ax * cy + (cy - ay) * px + (ax - cx) * py);
  const t = 1 / (2 * area) * (ax * by - ay * bx + (ay - by) * px + (bx - ax) * py);
  return s >= -0.05 && t >= -0.05 && 1 - s - t >= -0.05; // 5% tolerance margin
}

// Group into CardGeometry namespace
const CardGeometry = {
  generateWobblyPolygon,
  isPointInTriangle
};

// Expose globally
window.CardGeometry = CardGeometry;
window.generateWobblyPolygon = generateWobblyPolygon;
window.isPointInTriangle = isPointInTriangle;
