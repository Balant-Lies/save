// ====================================================
// PAGE TRANSITION HELPER
// Reads saved circle coordinates & duration from sessionStorage
// so the expanding reveal mask bursts smoothly from the exact card clicked!
// ====================================================

(function initPageTransition() {
  const cx = sessionStorage.getItem('vt-cx') || '50%';
  const cy = sessionStorage.getItem('vt-cy') || '50%';
  const duration = sessionStorage.getItem('vt-duration') || '0.5s';

  document.documentElement.style.setProperty('--vt-cx', cx);
  document.documentElement.style.setProperty('--vt-cy', cy);
  document.documentElement.style.setProperty('--vt-duration', duration);
})();
