'use strict';

class Renderer {
  constructor(canvas, camera, grid) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d', { alpha: false });
    this.camera = camera;
    this.grid   = grid;
    this.sheet  = null;
    this.fadedCells  = null;
    this.focusedCell = null;

    this._dirty        = true;
    this._lastZoom     = null;
    this._animT        = 0;
    this._hasAnimCells = false;
    this._pattern      = null;

    this.ctx.scale(CFG.DPR, CFG.DPR);
  }

  markDirty()       { this._dirty = true; }
  markGroundDirty() { this._dirty = true; }

  resize(w, h) {
    const dpr = CFG.DPR;
    const pw  = Math.floor(w);
    const ph  = Math.floor(h);
    this.canvas.width        = pw * dpr;
    this.canvas.height       = ph * dpr;
    this.canvas.style.width  = `${pw}px`;
    this.canvas.style.height = `${ph}px`;
    this.ctx.scale(dpr, dpr);
    this.markDirty();
  }

  tick(t) {
    this._animT = t;
    if (this.camera && this.camera.zoom !== this._lastZoom) {
      this._lastZoom = this.camera.zoom;
      this.markDirty();
    }
    if (this._hasAnimCells) this.markDirty();
  }

  render() {
    if (!this._dirty) return;
    this._dirty = false;

    const { camera } = this;
    const W  = this.canvas.width / CFG.DPR;
    const H  = this.canvas.height / CFG.DPR;
    const b  = camera.bounds();
    const lod = camera.lod;
    const tw = CFG.TILE.W * camera.zoom;
    const th = CFG.TILE.H * camera.zoom;

    this._renderGround(W, H, b, tw, th);
    this._renderElements(W, H, b, lod, tw, th);
  }

  _renderGround(W, H, b, tw, th) {
    const ctx = this.ctx;

    ctx.fillStyle = '#eef2ec';
    ctx.fillRect(0, 0, W, H);

    const pattern = this._getGroundPattern();

    for (let gy = b.y0; gy <= b.y1; gy++) {
      for (let gx = b.x0; gx <= b.x1; gx++) {
        const { x, y } = this.camera.toScreen(gx, gy);
        const even = (Math.abs(gx + gy) % 2 === 0);
        const baseColor = even ? '#d8edcc' : '#c8e4b8';

        this._diamondCtx(ctx, x, y, tw, th, baseColor, 'rgba(0,0,0,0.04)');

        if (pattern && tw > 24) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x,        y - th/2);
          ctx.lineTo(x + tw/2, y);
          ctx.lineTo(x,        y + th/2);
          ctx.lineTo(x - tw/2, y);
          ctx.closePath();
          ctx.clip();
          ctx.globalAlpha = 0.10;
          ctx.fillStyle = pattern;
          ctx.fillRect(x - tw/2, y - th/2, tw, th);
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
    }
  }

  _getGroundPattern() {
    if (this._pattern) return this._pattern;

    const size = 64;
    const off  = document.createElement('canvas');
    off.width  = size; off.height = size;
    const c    = off.getContext('2d');

    c.fillStyle = '#c8e4b8';
    c.fillRect(0, 0, size, size);

    c.fillStyle = 'rgba(0,40,0,0.22)';
    [[8,12],[24,6],[40,18],[56,8],[4,32],[18,44],[36,28],[52,40],[12,56],[44,52],[60,36],[28,60]]
      .forEach(([px, py]) => {
        c.beginPath(); c.arc(px, py, 0.9, 0, Math.PI * 2); c.fill();
      });

    c.strokeStyle = 'rgba(0,60,0,0.07)';
    c.lineWidth = 0.5;
    [[0,20,64,35],[10,45,54,50],[30,5,40,60]].forEach(([x1,y1,x2,y2]) => {
      c.beginPath();
      c.moveTo(x1, y1);
      c.bezierCurveTo(x1+10, y1-5, x2-10, y2+5, x2, y2);
      c.stroke();
    });

    this._pattern = this.ctx.createPattern(off, 'repeat');
    return this._pattern;
  }

  _renderElements(W, H, b, lod, tw, th) {
    const ctx = this.ctx;

    const cells = this.grid.inBounds(b.x0, b.y0, b.x1, b.y1)
      .sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    this._hasAnimCells = cells.some(c => c.state === CFG.STATES.NEW);
    if (this.focusedCell) this._hasAnimCells = true;

    cells.forEach(cell => {
      const { x, y } = this.camera.toScreen(cell.gx, cell.gy);
      lod === 'far' ? this._drawFar(x, y, tw, th, cell) : this._drawNear(x, y, tw, th, cell);
    });

    if (this.focusedCell) {
      const fc = this.focusedCell;
      const { x, y } = this.camera.toScreen(fc.gx, fc.gy);
      const wire  = CFG.WIRE_COLORS[fc.tier] ?? CFG.WIRE_COLORS.free;
      const pulse = 0.5 + 0.5 * Math.sin((this._animT || 0) / 300);
      const r1    = tw * 0.55 + pulse * 8;
      const r2    = tw * 0.7  + pulse * 12;

      const grd = ctx.createRadialGradient(x, y - th*0.2, r1*0.5, x, y - th*0.2, r2);
      grd.addColorStop(0, wire.stroke + '44');
      grd.addColorStop(1, wire.stroke + '00');
      ctx.beginPath();
      ctx.arc(x, y - th * 0.2, r2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y - th * 0.2, r1, 0, Math.PI * 2);
      ctx.strokeStyle = wire.stroke + 'cc';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawFar(x, y, tw, th, cell) {
    const wire = CFG.WIRE_COLORS[cell.tier] ?? CFG.WIRE_COLORS.free;
    const r    = cell.tier === 'ancient' ? Math.max(7, tw * 0.14) : Math.max(4, tw * 0.08);
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fillStyle   = wire.stroke + '55';
    this.ctx.strokeStyle = wire.stroke;
    this.ctx.lineWidth   = 1;
    this.ctx.fill();
    this.ctx.stroke();
  }

  _drawNear(x, y, tw, th, cell) {
    const dormant = cell.state === CFG.STATES.DORMANT;
    const isFaded = this.fadedCells?.has(cell.id);

    if (isFaded)      this.ctx.globalAlpha = 0.2;
    else if (dormant) this.ctx.globalAlpha = 0.5;

    if (this.sheet) {
      this._drawSprite(x, y, tw, th, cell);
    } else {
      this._drawEmojiPlaceholder(x, y, tw, th, cell);
    }

    this.ctx.globalAlpha = 1;

    if (cell.state === CFG.STATES.NEW) {
      const wire  = CFG.WIRE_COLORS[cell.tier] ?? CFG.WIRE_COLORS.free;
      const pulse = 0.5 + 0.5 * Math.sin((this._animT || 0) / 400);
      this.ctx.beginPath();
      this.ctx.arc(x, y, tw * 0.25 + pulse * 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = wire.stroke + '44';
      this.ctx.lineWidth   = 1.5;
      this.ctx.stroke();
    }
  }

  _drawSprite(x, y, tw, th, cell) {
    const tierSprites = CFG.SPRITES[cell.tier];
    if (!tierSprites) return;
    const level = cell.level ?? 'L0';
    const s = tierSprites[level] ?? tierSprites.L0;
    if (!s) return;
    const scale = tw / s.sw;
    const dw = s.sw * scale, dh = s.sh * scale;
    this.ctx.drawImage(this.sheet, s.sx, s.sy, s.sw, s.sh, x - dw/2, y - dh + th*0.3, dw, dh);
  }

  _drawEmojiPlaceholder(x, y, tw, th, cell) {
    const ctx   = this.ctx;
    const isAncient = cell.tier === 'ancient';
    const color = this._color(cell);

    if (isAncient) {
      const fs = Math.max(20, Math.min(52, tw * 0.38));
      ctx.font = `${fs}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = 0.92;
      ctx.fillText('🌳', x, y - th * 0.6);
      ctx.globalAlpha  = 1;
      return;
    }

    this._diamond(x, y, tw, th, color + 'cc', color + '88');

    const tierEmojis = CFG.EMOJIS[cell.tier] ?? CFG.EMOJIS.free;
    const emoji = tierEmojis[cell.state] ?? tierEmojis.thriving;
    const fs    = Math.max(10, Math.min(28, tw * 0.2));
    ctx.font          = `${fs}px serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.globalAlpha   = cell.state === CFG.STATES.COMPOST ? 0.35 : 1;
    ctx.fillText(emoji, x, y - th * 0.18);
    ctx.globalAlpha   = 1;

    const levelEmoji = CFG.LEVEL_EMOJI[cell.level ?? 'L0'];
    if (levelEmoji && cell.state !== CFG.STATES.COMPOST) {
      ctx.font = `${Math.max(8, fs * 0.55)}px serif`;
      ctx.fillText(levelEmoji, x + tw * 0.22, y + th * 0.08);
    }
  }

  _edge(ctx, a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  _color(cell) {
    const tier = CFG.COLORS[cell.tier] ?? CFG.COLORS.free;
    return tier[cell.state] ?? tier.thriving;
  }

  _diamond(cx, cy, tw, th, fill, stroke) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx,        cy - th/2);
    ctx.lineTo(cx + tw/2, cy);
    ctx.lineTo(cx,        cy + th/2);
    ctx.lineTo(cx - tw/2, cy);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke(); }
  }

  _diamondCtx(ctx, cx, cy, tw, th, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(cx,        cy - th/2);
    ctx.lineTo(cx + tw/2, cy);
    ctx.lineTo(cx,        cy + th/2);
    ctx.lineTo(cx - tw/2, cy);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke(); }
  }
}
