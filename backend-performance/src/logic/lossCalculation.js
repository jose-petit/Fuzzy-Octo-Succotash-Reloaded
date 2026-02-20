// Helper: detect card prefix and amplifier type
function getCardPrefix(card = '') {
  if (!card) return null;
  const c = String(card).toUpperCase();
  // Relaxed: accept EOA2/HOA2 with or without dash
  if (c.includes('EOA2')) return 'EOA2';
  if (c.includes('HOA2')) return 'HOA2';
  if (c.includes('FT-')) return 'FT-';
  if (c.includes('FAN')) return 'FAN';
  if (c.includes('FAN-TMD')) return 'FAN-TMD';
  return null;
}

function isAmplifier(card = '') {
  const p = getCardPrefix(card);
  return p === 'EOA2' || p === 'HOA2';
}

function makePivot(filtered) {
  const groups = {};
  filtered.forEach((rec) => {
    const key = `${rec.bus}|${rec.ne}|${rec.serial}`;
    if (!groups[key]) {
      groups[key] = { bus: rec.bus, ne: rec.ne, serial: rec.serial, entries: [] };
    }
    groups[key].entries.push(rec);
  });
  return Object.values(groups).map((grp) => {
    const obj = {
      bus: grp.entries[0].bus,
      card: grp.entries[0].card,
      ne: grp.ne,
      serial: grp.serial,
    };
    grp.entries.forEach((e, i) => {
      obj[`type${i + 1}`] = e.type;
      obj[`value${i + 1}`] = e.value;
    });
    return obj;
  });
}

// Helper for type-safe value lookup within a pivot
const getVal = (p, label) => {
  if (!p) return null;
  for (let i = 1; i <= 20; i++) {
    if (p[`type${i}`] === label) {
      const val = p[`value${i}`];
      return (val !== null && val !== undefined && val !== '') ? Number(val) : null;
    }
  }
  return null;
};

// Helper to pick a peer by preference: same bus, then same NE, else first
function pickPeer(candidates, origin) {
  if (!candidates || !candidates.length) return null;
  return (
    candidates.find((c) => c.bus === origin.bus) ||
    candidates.find((c) => c.ne === origin.ne) ||
    candidates[0]
  );
}

module.exports = { getCardPrefix, isAmplifier, makePivot, getVal, pickPeer };
