'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const mainCanvas = document.getElementById('canvas-main');
  const ttEl       = document.getElementById('tooltip');

  const grid     = new Grid();
  const renderer = new Renderer(mainCanvas, null, grid);
  const camera   = new Camera(mainCanvas, () => renderer.markDirty());
  renderer.camera = camera;

  const tooltip = new Tooltip(ttEl, mainCanvas, camera, grid);
  tooltip.renderer = renderer;

  tooltip.onTapCell = (cell) => {
    camera.animateTo(cell.gx, cell.gy, 1.6);
    history.replaceState(null, '', `#${encodeURIComponent(cell.pseudo)}`);
    setTimeout(() => showFocusCard(cell), 620);
  };

  // ── Audio ──────────────────────────────────────────────────────────────────
  const audio    = document.getElementById('ambient-audio');
  const audioBtn = document.getElementById('audio-toggle');
  audio.volume   = 0.3;
  let audioPlaying = false;
  const AUDIO_KEY  = 'deleste-audio';

  audioBtn.addEventListener('click', () => {
    if (audioPlaying) {
      audio.pause();
      audioBtn.textContent = '🔇';
      localStorage.setItem(AUDIO_KEY, 'off');
    } else {
      audio.play().catch(() => {});
      audioBtn.textContent = '🔊';
      localStorage.setItem(AUDIO_KEY, 'on');
    }
    audioPlaying = !audioPlaying;
  });

  // ── Legend modal ───────────────────────────────────────────────────────────
  const legendModal    = document.getElementById('legend-modal');
  const legendBtn      = document.getElementById('legend-toggle');
  const legendBackdrop = document.getElementById('legend-backdrop');

  function toggleLegend(force) {
    const open = force ?? !legendModal.classList.contains('open');
    legendModal.classList.toggle('open', open);
    legendBtn.classList.toggle('active', open);
    legendBtn.setAttribute('aria-expanded', String(open));
  }

  legendBtn.addEventListener('click', e => { e.stopPropagation(); toggleLegend(); });
  legendBackdrop.addEventListener('click', () => toggleLegend(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleLegend(false); });


  // ── Zoom buttons ───────────────────────────────────────────────────────────
  document.getElementById('btn-in').addEventListener('click',  () => camera.zoomBy( CFG.ZOOM.STEP));
  document.getElementById('btn-out').addEventListener('click', () => camera.zoomBy(-CFG.ZOOM.STEP));

  // ── Resize ─────────────────────────────────────────────────────────────────
  const resize = () => renderer.resize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  resize();

  // ── Data loading ───────────────────────────────────────────────────────────
  function loadData(parsed) {
    grid.reset();

    const allSubs = [
      ...(parsed.author ? [{ ...parsed.author, tier: parsed.author.tier === 'author' ? 'free' : parsed.author.tier }] : []),
      ...parsed.subscribers,
    ];

    grid.loadAll(allSubs);

    document.getElementById('sub-count').textContent =
      allSubs.length.toLocaleString('fr-FR');

    renderer.markDirty();
  }

  // ── Sprite sheet ───────────────────────────────────────────────────────────
  const img = new Image();
  img.onload  = () => { renderer.sheet = img; renderer.markDirty(); };
  img.onerror = () => console.warn('[Deleste] Sprite sheet introuvable — fallback emojis');
  img.src = CFG.SHEET_URL;

  // ── Charger les données ────────────────────────────────────────────────────
  fetch('data.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(json => {
      loadData({ author: null, subscribers: json.subscribers });
      handleAnchor();
    })
    .catch(() => {
      // Fallback démo si data.json absent
      loadData({ author: null, subscribers: generateDemo(1000) });
      handleAnchor();
    });

  // ── rAF loop ───────────────────────────────────────────────────────────────
  const loop = (t) => {
    renderer.tick(t);
    renderer.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ── Focus card ─────────────────────────────────────────────────────────────
  const focusCard = document.getElementById('focus-card');
  const TIER_LABEL = {
    free:    '🌳 Free',
    paid:    '☀️ Paid',
    founder: '🏡 Founder',
  };

  // artwork-[state]-[tier].png — fallback par état moins précis si absent
  function getArtworkSrc(tier, state) {
    const candidates = [
      `artwork-${state}-${tier}.png`,
      `artwork-thriving-${tier}.png`,
    ];
    return candidates;
  }

  const ARTWORK_EMOJI = { free:'🌳', paid:'🌞', founder:'🏡', ancient:'🌿' };

  function showFocusCard(cell) {
    document.getElementById('fc-pseudo').textContent = cell.pseudo ?? '';
    document.getElementById('fc-tier').textContent   = TIER_LABEL[cell.tier] ?? '';
    document.getElementById('fc-level').textContent  = CFG.LEVEL_LABELS[cell.level ?? 'L0'] ?? '';
    document.getElementById('fc-meta').textContent   =
      [cell.since ? `Depuis ${cell.since}` : '', cell.country].filter(Boolean).join(' · ');

    const artworkEl       = document.getElementById('fc-artwork');
    const placeholder     = `<span class="fc-artwork-placeholder">${ARTWORK_EMOJI[cell.tier] ?? '🌿'}</span>`;
    const artworkCandidates = getArtworkSrc(cell.tier, cell.state);
    artworkEl.innerHTML   = placeholder;

    // Essaie chaque candidat dans l'ordre — s'arrête au premier qui charge
    function tryNext(candidates) {
      if (!candidates.length) return;
      const img = new Image();
      img.onload = () => { artworkEl.innerHTML = ''; artworkEl.appendChild(img); };
      img.onerror = () => tryNext(candidates.slice(1));
      img.src = candidates[0];
      img.alt = `Artwork ${cell.tier}`;
    }
    tryNext(artworkCandidates);

    const shareUrl = `${location.origin}${location.pathname}#${encodeURIComponent(cell.pseudo)}`;

    document.getElementById('fc-share').onclick = async () => {
      const btn = document.getElementById('fc-share');
      const shareText = `Tu veux qu'on soit voisins ?\n→ ${shareUrl}`;
      try {
        if (navigator.share) {
          await navigator.share({ text: shareText, url: shareUrl });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          btn.textContent = '✓ Lien copié !';
          setTimeout(() => { btn.textContent = '↗ Partager mon spot'; }, 2000);
        }
      } catch (e) {
        if (e.name !== 'AbortError') btn.textContent = shareUrl;
      }
    };

    renderer.focusedCell = cell;
    renderer.markDirty();
    focusCard.classList.add('visible');
  }

  function hideFocusCard() {
    focusCard.classList.remove('visible');
    renderer.focusedCell = null;
    renderer.markDirty();
    history.replaceState(null, '', location.pathname);
  }

  document.getElementById('fc-close').addEventListener('click', hideFocusCard);

  // ── Desktop click → focus card ─────────────────────────────────────────────
  let _panStarted = false;
  mainCanvas.addEventListener('mousedown', () => { _panStarted = false; });
  mainCanvas.addEventListener('mousemove', () => { _panStarted = true;  });
  mainCanvas.addEventListener('mouseup', e => {
    if (_panStarted) { hideFocusCard(); return; }
    const r = mainCanvas.getBoundingClientRect();
    const { gx, gy } = camera.toGrid(e.clientX - r.left, e.clientY - r.top);
    const cell = grid.getAt(gx, gy);
    if (cell && cell.tier !== 'ancient') {
      camera.animateTo(cell.gx, cell.gy, 1.6);
      history.replaceState(null, '', `#${encodeURIComponent(cell.pseudo)}`);
      setTimeout(() => showFocusCard(cell), 620);
    } else {
      hideFocusCard();
    }
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  const searchInput   = document.getElementById('search-input');
  const searchBtn     = document.getElementById('search-btn');
  const searchResults = document.getElementById('search-results');

  function snapTo(cell) {
    camera.animateTo(cell.gx, cell.gy, 1.6);
    searchResults.classList.remove('visible');
    searchInput.value = '';
    history.replaceState(null, '', `#${encodeURIComponent(cell.pseudo)}`);
    setTimeout(() => showFocusCard(cell), 620);
  }

  function showResults(query) {
    const hits = query.trim()
      ? grid.findByPseudo(query).slice(0, 6)
      : [...grid._cells.values()].filter(c => c.tier !== 'ancient').slice(0, 6);
    if (!hits.length) {
      searchResults.innerHTML = `<div class="sr-item" style="color:var(--muted)">Aucun résultat</div>`;
    } else {
      const TIER_ICON = { free:'🌱', paid:'🌞', founder:'🏡', ancient:'🌳' };
      searchResults.innerHTML = hits.map(c => `
        <div class="sr-item" data-id="${c.id}">
          <span>${TIER_ICON[c.tier] ?? '●'}</span>
          <span>${c.pseudo}</span>
          <span class="sr-meta">${c.country ?? ''} · ${c.since ?? ''}</span>
        </div>
      `).join('');

      const hitMap = new Map(hits.map(c => [c.id, c]));
      searchResults.querySelectorAll('.sr-item[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          const cell = hitMap.get(el.dataset.id);
          if (cell) snapTo(cell);
        });
      });
    }
    searchResults.classList.add('visible');
  }

  let searchTimer;
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => showResults(e.target.value), 180);
  });
  searchInput.addEventListener('focus', () => showResults(searchInput.value));
  searchBtn.addEventListener('click', () => showResults(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const hits = grid.findByPseudo(searchInput.value);
      if (hits.length) snapTo(hits[0]);
    }
    if (e.key === 'Escape') {
      searchResults.classList.remove('visible');
      searchInput.blur();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap') && !e.target.closest('#search-results')) {
      searchResults.classList.remove('visible');
    }
  });

  // ── URL anchor #@pseudo ────────────────────────────────────────────────────
  function handleAnchor() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    setTimeout(() => {
      const hits = grid.findByPseudo(hash);
      if (hits.length) {
        camera.animateTo(hits[0].gx, hits[0].gy, 1.8);
        setTimeout(() => showFocusCard(hits[0]), 650);
      }
    }, 200);
  }
  window.addEventListener('hashchange', handleAnchor);

  // ── CSV drag & drop ────────────────────────────────────────────────────────
  const dropzone = document.getElementById('dropzone');

  document.body.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  document.body.addEventListener('dragleave', e => { if (!e.relatedTarget) dropzone.classList.remove('drag-over'); });
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      alert('Dépose un fichier .csv exporté depuis Substack.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseSubstackCSV(ev.target.result);
      loadData(parsed);
      dropzone.textContent = `✓ ${file.name} — ${parsed.subscribers.length} abonnés chargés`;
      setTimeout(() => { dropzone.textContent = '↓ Dépose ton CSV Substack ici'; }, 3000);
    };
    reader.readAsText(file);
  });

  dropzone.addEventListener('click', () => document.getElementById('csv-input').click());

  document.getElementById('csv-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseSubstackCSV(ev.target.result);
      loadData(parsed);
      dropzone.textContent = `✓ ${file.name} — ${parsed.subscribers.length} abonnés chargés`;
      setTimeout(() => { dropzone.textContent = '↓ Dépose ton CSV Substack ici'; }, 3000);
    };
    reader.readAsText(file);
  });
});
