(() => {
  const publications = document.getElementById('publications');
  const viewer = document.getElementById('publication-figure-viewer');
  const image = viewer.querySelector('.figure-viewer__image');
  const caption = viewer.querySelector('.figure-viewer__caption');
  const closeButton = viewer.querySelector('.figure-viewer__close');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let trigger = null;
  let source = null;
  let animation = null;
  let phase = 'closed';
  let request = 0;

  // The thumbnail uses object-fit: contain, so animate from its actual picture,
  // excluding the frame and letterboxing (especially for portrait figures).
  function thumbnailBounds() {
    const rect = source.getBoundingClientRect();
    const style = getComputedStyle(source);
    const width = rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    const height = rect.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
    const scale = Math.min(width / source.naturalWidth, height / source.naturalHeight);
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: source.naturalWidth * scale,
      height: source.naturalHeight * scale
    };
  }

  function thumbnailTransform() {
    const small = thumbnailBounds();
    const large = image.getBoundingClientRect();
    return `translate(${small.x - large.left - large.width / 2}px, ${small.y - large.top - large.height / 2}px) scale(${small.width / large.width}, ${small.height / large.height})`;
  }

  function finishClose() {
    animation?.cancel();
    animation = null;
    viewer.classList.remove('is-visible');
    if (viewer.open) viewer.close();
    document.documentElement.classList.remove('figure-viewer-open');
    if (source) source.style.visibility = '';
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    image.removeAttribute('src');
    phase = 'closed';
  }

  function close() {
    if (!viewer.open || phase === 'closing') return;
    phase = 'closing';
    // Capture the current position before cancelling an unfinished opening.
    const currentTransform = getComputedStyle(image).transform;
    animation?.cancel();
    const destination = thumbnailTransform();
    viewer.classList.remove('is-visible');
    animation = image.animate([
      { transform: currentTransform },
      { transform: destination }
    ], {
      duration: reducedMotion.matches ? 0 : 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
    animation.finished.then(finishClose).catch(() => {});
  }

  async function open(button) {
    if (viewer.open) return;
    const ticket = ++request;
    const thumbnail = button.querySelector('img');
    try {
      await thumbnail.decode();
    } catch {
      return;
    }
    if (ticket !== request || viewer.open) return;
    trigger = button;
    source = thumbnail;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    image.width = source.naturalWidth;
    image.height = source.naturalHeight;
    caption.textContent = source.alt;
    document.documentElement.classList.add('figure-viewer-open');
    viewer.showModal();
    phase = 'opening';
    const origin = thumbnailTransform();
    source.style.visibility = 'hidden';
    animation = image.animate([
      { transform: origin },
      { transform: 'none' }
    ], {
      duration: reducedMotion.matches ? 0 : 380,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });
    animation.finished.then(() => {
      if (phase === 'opening') phase = 'open';
    }).catch(() => {});
    // Start the backdrop transition after the modal has entered the top layer.
    requestAnimationFrame(() => {
      if (viewer.open && phase !== 'closing') viewer.classList.add('is-visible');
    });
  }

  // Delegation also covers the cloned cards in the date and topic views.
  publications.addEventListener('click', event => {
    const button = event.target.closest('.pub-figure-button');
    if (button) open(button);
  });
  closeButton.addEventListener('click', close);
  viewer.addEventListener('click', event => {
    if (event.target === viewer || event.target === caption || event.target.classList.contains('figure-viewer__stage')) close();
  });
  viewer.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  window.addEventListener('resize', () => {
    if (!viewer.open) return;
    if (phase === 'closing') finishClose();
    else {
      animation?.cancel();
      phase = 'open';
    }
  });
})();
