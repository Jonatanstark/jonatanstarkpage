// Flip cards
// On touch devices: tap to flip/unflip
// On pointer devices: CSS hover handles it, click also toggles

const isTouch = window.matchMedia('(hover: none)').matches;

document.querySelectorAll('.flip-card').forEach((card) => {
  if (isTouch) {
    // Touch: tap to flip, tap again to unflip
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });
  } else {
    // Pointer: click also toggles (hover handles visual, click keeps it open)
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });
  }
});
