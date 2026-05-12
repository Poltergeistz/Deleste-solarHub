'use strict';

class Tooltip {
  constructor(el, canvas, camera, grid) {
    this.el = el; this.canvas = canvas;
    this.camera = camera; this.grid = grid;
    this._active = null; this._st = null; this._ht = null;
    this.renderer = null;   // injecté après init
    this.onTapCell = null;  // callback mobile
    this._bind();
  }

  _bind() {
    const el = this.canvas;

    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      this._check(e.clientX - r.left, e.clientY - r.top, e.clientX, e.clientY);
    });
    el.addEventListener('mouseleave', () => this._hide());

    el.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const r = el.getBoundingClientRect();
      const lx = t.clientX - r.left;
      const ly = t.clientY - r.top;
      const { gx, gy } = this.camera.toGrid(lx, ly);
      const cell = this.grid.getAt(gx, gy);

      if (cell && cell.tier !== 'ancient' && this.onTapCell) {
        e.preventDefault();
        this.onTapCell(cell);
      }
    }, { passive: false });
  }

  _check(lx, ly, cx, cy) {
    const { gx, gy } = this.camera.toGrid(lx, ly);
    const cell = this.grid.getAt(gx, gy);
    cell ? this._show(cell, cx, cy, gx, gy) : this._hide();
  }

  _show(cell, cx, cy, gx, gy) {
    clearTimeout(this._ht);
    if (this._active?.id === cell.id) { this._move(cx, cy); return; }
    clearTimeout(this._st);

    if (this.renderer) {
      const fadedCells = new Set();
      this.grid.inBounds(gx - 2, gy - 2, gx + 2, gy + 2).forEach(c => {
        const depthDiff = (c.gx + c.gy) - (gx + gy);
        const closeX    = Math.abs(c.gx - gx) <= 2;
        const closeY    = Math.abs(c.gy - gy) <= 2;
        if (depthDiff > 0 && closeX && closeY && c.tier !== 'ancient') {
          fadedCells.add(c.id);
        }
      });
      this.renderer.fadedCells = fadedCells;
      this.renderer.markDirty();
    }

    this._st = setTimeout(() => {
      this._active = cell;

      if (cell.tier === 'ancient') {
        document.getElementById('tt-pseudo').textContent = 'L\'Arbre Ancien';
        document.getElementById('tt-tier').textContent   = 'Origine de la forêt · Préexiste à tout';
        document.getElementById('tt-since').textContent  = '';
        const ttLevel = document.getElementById('tt-level');
        if (ttLevel) ttLevel.style.display = 'none';
        this._move(cx, cy);
        this.el.classList.add('visible');
        this.canvas.style.cursor = 'default';
        return;
      }

      const TIER = {
        free:    '🌳 Free',
        paid:    '☀️ Paid',
        founder: '🏡 Founder',
      };
      const STATE    = { dormant:'· 😴 Dormant', compost:'· ♻️ Composté', new:'· ✨ Nouveau' };
      const level    = cell.level ?? 'L0';
      const lvlLabel = CFG.LEVEL_LABELS[level];
      const flag     = cell.country ? ` · ${cell.country}` : '';

      document.getElementById('tt-pseudo').textContent = cell.pseudo;
      document.getElementById('tt-tier').textContent   =
        (TIER[cell.tier] ?? '') + (STATE[cell.state] ? ' ' + STATE[cell.state] : '');
      document.getElementById('tt-since').textContent  =
        `Abonné depuis ${cell.since}${flag}`;

      let ttLevel = document.getElementById('tt-level');
      if (!ttLevel) {
        ttLevel = document.createElement('span');
        ttLevel.id = 'tt-level';
        ttLevel.className = 'tt-tier';
        this.el.appendChild(ttLevel);
      }
      ttLevel.textContent = lvlLabel ?? '';
      ttLevel.style.display = lvlLabel ? 'block' : 'none';

      this._move(cx, cy);
      this.el.classList.add('visible');
      this.canvas.style.cursor = 'pointer';
    }, 80);
  }

  _hide() {
    clearTimeout(this._st);
    this._ht = setTimeout(() => {
      this._active = null;
      this.el.classList.remove('visible');
      this.canvas.style.cursor = 'grab';
      if (this.renderer) {
        this.renderer.fadedCells = null;
        this.renderer.markDirty();
      }
    }, 120);
  }

  _move(cx, cy) {
    const tw = this.el.offsetWidth;
    const left = cx + 14 + tw > window.innerWidth ? cx - tw - 14 : cx + 14;
    this.el.style.cssText += `left:${left}px;top:${cy - 14}px`;
  }
}
