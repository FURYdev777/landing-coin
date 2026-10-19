(() => {
  const body = document.body;
  const motionButton = document.querySelector('[data-motion-toggle]');
  const motionLabel = motionButton?.querySelector('[data-motion-label]');

  function setMotionPaused(paused) {
    body.classList.toggle('motion-paused', paused);
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      if (motionLabel) motionLabel.textContent = paused ? 'Resume motion' : 'Pause motion';
    }
    try { localStorage.setItem('landing:motion-paused', paused ? '1' : '0'); } catch {}
  }

  try {
    setMotionPaused(localStorage.getItem('landing:motion-paused') === '1');
  } catch {}

  motionButton?.addEventListener('click', () => {
    setMotionPaused(!body.classList.contains('motion-paused'));
  });

  const hypeButton = document.querySelector('[data-attitude-mode="hype"]');
  const landingButton = document.querySelector('[data-attitude-mode="landing"]');
  const screen = document.querySelector('[data-attitude-screen]');
  const quote = screen?.querySelector('blockquote');
  const translation = screen?.querySelector('.translation');

  const attitudeCopy = {
    hype: {
      quote: 'The next big thing. Huge announcement soon. Trust the process. Just believe.',
      translation: 'The usual script: certainty first, evidence later.'
    },
    landing: {
      quote: 'No moon. No promises. <strong>Just landing.</strong>',
      translation: 'Build something. Show it. Then talk about it.'
    }
  };

  function setAttitude(mode) {
    if (!screen || !quote || !translation || !attitudeCopy[mode]) return;
    screen.dataset.mode = mode;
    quote.innerHTML = attitudeCopy[mode].quote;
    translation.textContent = attitudeCopy[mode].translation;
    hypeButton?.setAttribute('aria-pressed', String(mode === 'hype'));
    landingButton?.setAttribute('aria-pressed', String(mode === 'landing'));
  }

  hypeButton?.addEventListener('click', () => setAttitude('hype'));
  landingButton?.addEventListener('click', () => setAttitude('landing'));

  const railItems = [...document.querySelectorAll('[data-rail-target]')];
  const sections = railItems
    .map(item => ({ item, section: document.getElementById(item.dataset.railTarget) }))
    .filter(entry => entry.section);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id;
      sections.forEach(({item}) => item.classList.toggle('is-active', item.dataset.railTarget === id));
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, .1, .25, .5] });
    sections.forEach(({section}) => observer.observe(section));
  }
})();
