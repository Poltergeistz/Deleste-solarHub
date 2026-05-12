'use strict';

function* spiral() {
  yield [0, 0];
  for (let ring = 1; ; ring++) {
    for (let x = -ring; x <  ring; x++) yield [ x,    -ring];
    for (let y = -ring; y <  ring; y++) yield [ ring,  y   ];
    for (let x =  ring; x > -ring; x--) yield [ x,     ring];
    for (let y =  ring; y > -ring; y--) yield [-ring,  y   ];
  }
}

class Grid {
  constructor() {
    this._cells = new Map();
    this._byId  = new Map();
    this._freed = [];
    this._gen   = spiral();
    this._initAncientTree();
  }

  _initAncientTree() {
    const ancient = {
      id:'ancient-tree', pseudo:null, tier:'ancient', state:'thriving',
      level:'L0', gifted:0, since:null, country:null, gx:0, gy:0,
    };
    this._cells.set('0,0', ancient);
    this._gen.next();
  }

  _key(gx, gy) { return `${gx},${gy}`; }

  _next() {
    let pos;
    do {
      pos = this._freed.length ? this._freed.pop() : this._gen.next().value;
    } while (CFG.RESERVED.has(`${pos[0]},${pos[1]}`) || this._cells.has(`${pos[0]},${pos[1]}`));
    return pos;
  }

  add(sub) {
    if (!sub.id) sub.id = `sub-${this._byId.size}-${(sub.pseudo ?? '').replace(/\W+/g, '')}`;
    if (this._byId.has(sub.id)) return this._byId.get(sub.id);
    const [gx, gy] = this._next();
    const cell = { ...sub, gx, gy };
    this._cells.set(this._key(gx, gy), cell);
    this._byId.set(sub.id, [gx, gy]);
    return [gx, gy];
  }

  wither(id) {
    const pos  = this._byId.get(id);
    if (!pos) return;
    const cell = this._cells.get(this._key(...pos));
    if (cell) cell.state = CFG.STATES.COMPOST;
  }

  getAt(gx, gy) { return this._cells.get(this._key(gx, gy)); }

  inBounds(x0, y0, x1, y1) {
    const out = [];
    for (let gy = y0; gy <= y1; gy++)
      for (let gx = x0; gx <= x1; gx++) {
        const c = this._cells.get(this._key(gx, gy));
        if (c) out.push(c);
      }
    return out;
  }

  loadAll(subs) {
    [...subs]
      .sort((a, b) => new Date(a.since) - new Date(b.since))
      .forEach(s => this.add(s));
    this._updateAncientLevel(subs);
  }

  _updateAncientLevel(subs) {
    const members = subs.filter(s => s.tier !== 'ancient');
    if (!members.length) return;
    const active = members.filter(s => s.state !== CFG.STATES.DORMANT && s.state !== CFG.STATES.COMPOST);
    const ratio  = active.length / members.length;
    const level  = ratio >= 0.90 ? 'L4'
                 : ratio >= 0.75 ? 'L3'
                 : ratio >= 0.60 ? 'L2'
                 : ratio >= 0.40 ? 'L1'
                 : 'L0';
    const ancient = this._cells.get('0,0');
    if (ancient) ancient.level = level;
  }

  findByPseudo(query) {
    const q = query.toLowerCase().replace(/^@/, '');
    if (!q) return [];
    const results = [];
    for (const cell of this._cells.values()) {
      if (!cell.pseudo) continue;
      const p = cell.pseudo.toLowerCase().replace(/^@/, '');
      if (p.includes(q)) results.push(cell);
    }
    return results.sort((a, b) => {
      const pa = a.pseudo.toLowerCase().replace(/^@/, '');
      const pb = b.pseudo.toLowerCase().replace(/^@/, '');
      if (pa === q && pb !== q) return -1;
      if (pb === q && pa !== q) return  1;
      const aS = pa.startsWith(q), bS = pb.startsWith(q);
      if (aS && !bS) return -1;
      if (bS && !aS) return  1;
      if (pa.length !== pb.length) return pa.length - pb.length;
      return pa.localeCompare(pb);
    });
  }

  reset() {
    this._cells.clear();
    this._byId.clear();
    this._freed = [];
    this._gen   = spiral();
    this._initAncientTree();
  }

  get size() { return this._cells.size - 1; }
}
