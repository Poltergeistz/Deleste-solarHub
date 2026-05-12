'use strict';

const CFG = {
  TILE:    { W: 128, H: 64 },
  ZOOM:    { MIN: 0.35, MAX: 2.2, DEFAULT: 1.0, STEP: 0.18, LOD_FAR: 0.55, LOD_MID: 0.95 },
  CULL:    2,
  INERTIA: 0.87,
  DPR:     Math.min(window.devicePixelRatio || 1, 2),

  FLAGS: {
    WIREFRAME:  false,
    CSV_IMPORT: false,
  },

  TIERS:  { FREE: 'free', PAID: 'paid', FOUNDER: 'founder' },
  STATES: { NEW: 'new', GROWING: 'growing', THRIVING: 'thriving', DORMANT: 'dormant', COMPOST: 'compost' },

  COLORS: {
    free:    { new:'#a8e6bf', growing:'#7ecfa0', thriving:'#4db87a', dormant:'#3a5a44', compost:'#4a4428' },
    paid:    { new:'#c4bff8', growing:'#8b85e8', thriving:'#6b63d4', dormant:'#3a3860', compost:'#4a4428' },
    founder: { new:'#e0d4f8', growing:'#c4b0f0', thriving:'#a088d8', dormant:'#4a3860', compost:'#4a4428' },
    ancient: { thriving:'#f5f5f0' },
    ground:  { even:'#1a2018', odd:'#161c14' },
  },

  EMOJIS: {
    free:    { new:'\u{1F331}', growing:'\u{1F333}', thriving:'\u{1F333}', dormant:'\u{1F343}', compost:'\u{267B}' },
    paid:    { new:'\u{1F506}', growing:'\u{1F31E}', thriving:'\u{1F31E}', dormant:'\u{1F325}', compost:'\u{267B}' },
    founder: { new:'\u{1F3D7}', growing:'\u{1F3E1}', thriving:'\u{1F3E1}', dormant:'\u{1F3DA}', compost:'\u{267B}' },
    ancient: { thriving:'\u{1F333}' },
  },

  RESERVED: new Set([
    '-1,-1','0,-1','1,-1',
    '-1,0',        '1,0',
    '-1,1', '0,1', '1,1',
  ]),

  LEVEL_EMOJI:  { L0:'🌱', L1:'🌿', L2:'🌸', L3:'🌳', L4:'🏛️' },
  LEVEL_LABELS: {
    L0: '🌱 Seed',
    L1: '🌿 Rooted — 1 à 2 parrains',
    L2: '🌸 Flourishing — 3 à 5 parrains',
    L3: '🌳 Steward — 6 à 14 parrains',
    L4: '🏛️ Keystone — 15+ parrains',
  },

  CUBE_LEVELS:  { free:1, paid:1, founder:2, ancient:3, author:1 },

  WIRE_COLORS: {
    free:    { stroke:'#6db888', shadow:'#3a7a50' },
    paid:    { stroke:'#7b74d8', shadow:'#4a4490' },
    founder: { stroke:'#c4a8e8', shadow:'#7a5aaa' },
    ancient: { stroke:'#f0ede6', shadow:'#b0a8a0' },
    author:  { stroke:'#f0ede6', shadow:'#b0a8a0' },
  },

  SPRITES: {
    ancient: {
      L0: { sx:0,   sy:0,   sw:128, sh:128 },
      L1: { sx:0,   sy:128, sw:128, sh:128 },
    },
    free: {
      L0: { sx:128, sy:0,   sw:128, sh:128 },
      L1: { sx:128, sy:128, sw:128, sh:128 },
      L2: { sx:128, sy:256, sw:128, sh:128 },
      L3: { sx:128, sy:384, sw:128, sh:128 },
      L4: { sx:128, sy:512, sw:128, sh:128 },
    },
    paid: {
      L0: { sx:256, sy:0,   sw:128, sh:128 },
      L1: { sx:256, sy:128, sw:128, sh:128 },
      L2: { sx:256, sy:256, sw:128, sh:128 },
      L3: { sx:256, sy:384, sw:128, sh:128 },
    },
    founder: {
      L0: { sx:384, sy:0,   sw:128, sh:128 },
      L1: { sx:384, sy:128, sw:128, sh:128 },
      L2: { sx:384, sy:256, sw:128, sh:128 },
      L3: { sx:384, sy:384, sw:128, sh:128 },
      L4: { sx:384, sy:512, sw:128, sh:128 },
    },
  },

  SHEET_URL: 'SpriteSheet.png',
};
