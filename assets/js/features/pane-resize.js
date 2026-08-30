// Resize the problem and editor panes without allowing either one to collapse.
const practiceGrid = document.querySelector('.content-grid');
const paneDivider = document.querySelector('#paneDivider');
const PANE_WIDTH_KEY = 'querynest-problem-pane-width';

function applyProblemPaneWidth(width) {
  const gridWidth = practiceGrid.getBoundingClientRect().width;
  const minimum = 300;
  const maximum = Math.max(minimum, gridWidth - 430);
  const clamped = Math.min(Math.max(width, minimum), maximum);
  practiceGrid.style.setProperty('--problem-pane-width', `${clamped}px`);
  return clamped;
}

function restoreProblemPaneWidth() {
  const saved = Number(localStorage.getItem(PANE_WIDTH_KEY));
  if (saved && window.innerWidth > 900) applyProblemPaneWidth(saved);
}

function beginPaneResize(event) {
  if (window.innerWidth <= 900) return;
  event.preventDefault();
  const gridRect = practiceGrid.getBoundingClientRect();
  document.body.classList.add('resizing-panes');
  paneDivider.setPointerCapture?.(event.pointerId);
  const resize = moveEvent => applyProblemPaneWidth(moveEvent.clientX - gridRect.left);
  const finish = finishEvent => {
    const width = applyProblemPaneWidth(finishEvent.clientX - gridRect.left);
    localStorage.setItem(PANE_WIDTH_KEY, String(width));
    document.body.classList.remove('resizing-panes');
    paneDivider.releasePointerCapture?.(event.pointerId);
    paneDivider.removeEventListener('pointermove', resize);
    paneDivider.removeEventListener('pointerup', finish);
    paneDivider.removeEventListener('pointercancel', finish);
  };
  paneDivider.addEventListener('pointermove', resize);
  paneDivider.addEventListener('pointerup', finish);
  paneDivider.addEventListener('pointercancel', finish);
}

paneDivider.addEventListener('pointerdown', beginPaneResize);
paneDivider.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const current = document.querySelector('.problem-panel').getBoundingClientRect().width;
  const next = applyProblemPaneWidth(current + (event.key === 'ArrowLeft' ? -24 : 24));
  localStorage.setItem(PANE_WIDTH_KEY, String(next));
});
window.addEventListener('resize', restoreProblemPaneWidth);
restoreProblemPaneWidth();
