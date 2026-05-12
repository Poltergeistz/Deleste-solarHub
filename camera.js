'use strict';

class Camera {
  constructor(canvas, onDirty) {
    this.canvas  = canvas;
    this.onDirty = onDirty;
    this.x = 0; this.y = 0;
    this.zoom = CFG.ZOOM.DEFAULT;
    this._vx = 0; this._vy = 0;
    this._drag = null; this._pinch = null; this._raf = null;
    this._bind();
  }

  toScreen(gx, gy) {
    const tw = CFG.TILE.W * this.zoom, th = CFG.TILE.H * this.zoom;
    const cx = this.canvas.width  / CFG.DPR / 2 + this.x;
    const cy = this.canvas.height / CFG.DPR / 3 + this.y;
    return { x: cx + (gx - gy) * tw / 2, y: cy + (gx + gy) * th / 2 };
  }

  toGrid(sx, sy) {
    const tw = CFG.TILE.W * this.zoom, th = CFG.TILE.H * this.zoom;
    const cx = this.canvas.width  / CFG.DPR / 2 + this.x;
    const cy = this.canvas.height / CFG.DPR / 3 + this.y;
    const dx = sx - cx, dy = sy - cy;
    return {
      gx: Math.round((dx / (tw/2) + dy / (th/2)) / 2),
      gy: Math.round((dy / (th/2) - dx / (tw/2)) / 2),
    };
  }

  bounds() {
    const m = CFG.CULL;
    const W = this.canvas.width / CFG.DPR, H = this.canvas.height / CFG.DPR;
    const corners = [
      this.toGrid(0,0), this.toGrid(W,0),
      this.toGrid(0,H), this.toGrid(W,H),
    ];
    const xs = corners.map(c => c.gx), ys = corners.map(c => c.gy);
    return {
      x0: Math.min(...xs)-m, y0: Math.min(...ys)-m,
      x1: Math.max(...xs)+m, y1: Math.max(...ys)+m,
    };
  }

  get lod() {
    if (this.zoom <= CFG.ZOOM.LOD_FAR) return 'far';
    if (this.zoom <= CFG.ZOOM.LOD_MID) return 'mid';
    return 'near';
  }

  zoomBy(delta, px, py) {
    const W = this.canvas.width / CFG.DPR, H = this.canvas.height / CFG.DPR;
    px = px ?? W/2; py = py ?? H/2;
    const nz = Math.min(CFG.ZOOM.MAX, Math.max(CFG.ZOOM.MIN, this.zoom + delta));
    const r  = nz / this.zoom;
    const cx = W/2, cy = H/3;
    this.x = px - cx - (px - cx - this.x) * r;
    this.y = py - cy - (py - cy - this.y) * r;
    this.zoom = nz;
    this.onDirty();
  }

  animateTo(gx, gy, targetZoom = 1.5) {
    this._stopI();
    const startX = this.x, startY = this.y, startZoom = this.zoom;
    const { x: endX, y: endY } = this._screenCenterFor(gx, gy, targetZoom);
    const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min((now - startTime) / 600, 1);
      const e = ease(t);
      this.zoom = startZoom + (targetZoom - startZoom) * e;
      this.x    = startX   + (endX - startX) * e;
      this.y    = startY   + (endY - startY) * e;
      this.onDirty();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _screenCenterFor(gx, gy, zoom) {
    const tw = CFG.TILE.W * zoom, th = CFG.TILE.H * zoom;
    const sx = (gx - gy) * tw / 2;
    const sy = (gx + gy) * th / 2;
    return { x: -sx, y: -sy };
  }

  _bind() {
    const el = this.canvas;
    el.addEventListener('mousedown',  e => this._ds(e.clientX, e.clientY));
    el.addEventListener('mousemove',  e => this._dm(e.clientX, e.clientY));
    el.addEventListener('mouseup',    () => this._de());
    el.addEventListener('mouseleave', () => this._de());
    el.addEventListener('wheel', e => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      this.zoomBy(e.deltaY > 0 ? -CFG.ZOOM.STEP : CFG.ZOOM.STEP,
                  e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) this._ds(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) { this._de(); this._pinch = this._ps(e.touches); }
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && this._drag) this._dm(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2 && this._pinch) this._pm(e.touches);
    }, { passive: false });
    el.addEventListener('touchend', () => { this._de(); this._pinch = null; }, { passive: true });
  }

  _ds(x, y) { this._stopI(); this._drag = { sx:x, sy:y, ox:this.x, oy:this.y, lx:x, ly:y }; }
  _dm(x, y) {
    if (!this._drag) return;
    this._vx = x - this._drag.lx; this._vy = y - this._drag.ly;
    this._drag.lx = x; this._drag.ly = y;
    this.x = this._drag.ox + (x - this._drag.sx);
    this.y = this._drag.oy + (y - this._drag.sy);
    this.onDirty();
  }
  _de() { if (!this._drag) return; this._drag = null; this._startI(); }

  _ps(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return { dist: Math.hypot(dx, dy),
             cx: (touches[0].clientX + touches[1].clientX) / 2,
             cy: (touches[0].clientY + touches[1].clientY) / 2 };
  }
  _pm(touches) {
    const r  = this.canvas.getBoundingClientRect();
    const p  = this._ps(touches);
    const dz = (p.dist / this._pinch.dist - 1) * this.zoom * 0.6;
    this.zoomBy(dz, p.cx - r.left, p.cy - r.top);
    this._pinch = p;
  }

  _startI() {
    const tick = () => {
      this._vx *= CFG.INERTIA; this._vy *= CFG.INERTIA;
      if (Math.abs(this._vx) < 0.4 && Math.abs(this._vy) < 0.4) return;
      this.x += this._vx; this.y += this._vy;
      this.onDirty();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }
  _stopI() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } }
}
