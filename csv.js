'use strict';

function parseSubstackCSV(raw) {
  const lines   = raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  if (lines.length < 2) return { author: null, subscribers: [] };

  const headers = splitLine(lines[0]);
  const rows    = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitLine(line);
    const row  = {};
    headers.forEach((h, idx) => row[h.trim()] = (vals[idx] ?? '').trim());
    rows.push(row);
  }

  let author      = null;
  const subscribers = [];

  rows.forEach(row => {
    const email      = row['Email'] || '';
    if (!email) return;

    const type         = (row['Type'] || '').toLowerCase();
    const name         = row['Name']  || email.split('@')[0];
    const startDate    = row['Start date'] || '';
    const cancelDate   = row['Cancel date'] || '';
    const emailsOpened = parseInt(row['Emails opened (6mo)'], 10) || 0;
    const postViews30d = parseInt(row['Post views (30d)'], 10) || 0;
    const gifted       = parseInt(row['Subscriptions gifted'], 10) || 0;
    const country      = row['Country'] || null;

    let tier;
    if      (type === 'author')   tier = 'author';
    else if (type === 'founding') tier = 'founder';
    else if (type === 'paid')     tier = 'paid';
    else                          tier = 'free';

    const level = gifted >= 15 ? 'L4'
                : gifted >= 6  ? 'L3'
                : gifted >= 3  ? 'L2'
                : gifted >= 1  ? 'L1'
                :                'L0';

    const isActive = emailsOpened > 0 || postViews30d > 0;
    let state;
    if (tier === 'author') {
      state = 'thriving';
    } else if (cancelDate) {
      state = 'compost';
    } else if (isRecent(startDate, 30)) {
      state = 'new';
    } else if (isRecent(startDate, 90)) {
      state = 'growing';
    } else if (isActive) {
      state = 'thriving';
    } else {
      state = 'dormant';
    }

    const cell = {
      id:      email,
      pseudo:  name.startsWith('@') ? name : `@${name}`,
      email,
      tier,
      state,
      level,
      gifted,
      since:   fmtDate(startDate),
      country,
    };

    if (tier === 'author') author = cell;
    else subscribers.push(cell);
  });

  subscribers.sort((a, b) => new Date(a.since) - new Date(b.since));
  return { author, subscribers };
}

function isRecent(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d) && (Date.now() - d) / 86400000 <= days;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { month:'short', year:'numeric' });
}

function splitLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ && line[i+1]==='"' ? (cur+='"', i++) : (inQ=!inQ); }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function generateDemo(count = 1000) {
  const tiers    = ['free','free','free','free','paid','paid','founder'];
  const states   = ['new','growing','growing','thriving','thriving','thriving','thriving','thriving','dormant','compost'];
  const levels   = ['L0','L0','L0','L0','L1','L2','L3','L4'];
  const countries = ['FR','FR','FR','BE','CH','DE','CA','ES','GB','IT'];
  const months   = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.'];

  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = arr => arr[Math.floor(rand() * arr.length)];

  const subs = [];
  for (let i = 0; i < count; i++) {
    const tier    = pick(tiers);
    const state   = pick(states);
    const level   = pick(levels);
    const country = pick(countries);
    const month   = pick(months);
    const year    = rand() > 0.5 ? '2025' : '2026';
    const gifted  = level === 'L0' ? 0 : level === 'L1' ? Math.floor(rand()*2)+1
                  : level === 'L2' ? Math.floor(rand()*3)+3
                  : level === 'L3' ? Math.floor(rand()*9)+6 : Math.floor(rand()*10)+15;

    subs.push({
      id:      `demo-${i}`,
      pseudo:  `@abonné_${i + 1}`,
      tier,
      state,
      level,
      gifted,
      since:   `${month} ${year}`,
      country,
    });
  }
  return subs;
}
