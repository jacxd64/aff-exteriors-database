// ===========================================================================
// Patio cover pricing model. Pure functions — no React, no Firestore — so the
// numbers can be tested and reused (work orders, saved bids) on their own.
//
// Two conventions run through here:
//   basis 'price' — the figure is what the customer pays, as typed.
//   basis 'cost'  — the figure is our cost; margin is applied on top.
//   basis 'pass'  — passed through at cost, no markup (permits).
//
// Labor is already baked into the per-sq-ft panel price and into each retail
// add-on, so there is no separate labor line.
// ===========================================================================

// Shipped defaults. The office edits these; a saved bid records which version
// of the sheet produced it, so old bids never silently re-price.
export const DEFAULT_PRICES = {
  margin: 40, // target margin, percent
  sqft: {
    panel3: { v: 46, b: 'price', n: '3" panel', d: 'All in — labor, fluted beam, c-channel, seam tape, lag bolts' },
    panel4: { v: 50, b: 'price', n: '4" panel', d: 'All in — labor, fluted beam, c-channel, seam tape, lag bolts' },
    panel6: { v: 55, b: 'price', n: '6" panel', d: 'All in — labor, fluted beam, c-channel, seam tape, lag bolts' },
  },
  beams: {
    fluted: {
      n: '3×3 Fluted', maxSpan: 8, mode: 'ft', included: true,
      perFt: { v: 15, b: 'cost' },
    },
    lattice: {
      n: 'Lattice', maxSpan: 16, maxDouble: 23, mode: 'stock', b: 'cost',
      stock: [{ len: 15, p: 515 }, { len: 19, p: 595 }, { len: 23, p: 670 }],
    },
    sampson: {
      n: 'Sampson', maxSpan: 10, mode: 'stock', b: 'cost',
      stock: [{ len: 16, p: 386 }, { len: 20, p: 483 }, { len: 24, p: 580 }],
      colorLens: [24], // color comes only in 24' stock
    },
  },
  units: {
    pier: { v: 300, b: 'price', n: 'Pier', d: 'Standard' },
    pierConc: { v: 450, b: 'price', n: 'Pier through concrete', d: '' },
    pierOvr: { v: 400, b: 'price', n: 'Oversized pier', d: '' },
    pierOvrC: { v: 550, b: 'price', n: 'Oversized through concrete', d: '' },
    col6: { v: 650, b: 'price', n: '6×6 column', d: 'Upgrade — replaces a standard post' },
    skylight: { v: 750, b: 'price', n: 'Skylight', d: 'Labor included' },
    fan: { v: 600, b: 'price', n: 'Ceiling fan + electric', d: 'Labor included' },
    fanBeam: { v: 300, b: 'price', n: 'Fan beam panel', d: 'Cored panel, house to edge — one fan per panel' },
    outlet: { v: 150, b: 'price', n: 'Outlet', d: 'Labor included' },
    wrap: { v: 80, b: 'price', n: 'Lattice wrap kit', d: 'Per foot of width' },
    diag: { v: 155, b: 'price', n: 'Diagonal cut', d: '' },
    bay: { v: 315, b: 'price', n: 'Bay / bow cut-out', d: '' },
    eng: { v: 600, b: 'price', n: 'Engineering', d: 'Costs us $300' },
    permit: { v: 275, b: 'pass', n: 'Permit', d: 'Passed through at cost, no markup' },
  },
};

export const EMPTY_SPEC = {
  width: 20,
  projection: 12,
  panel: '4',
  beam: 'fluted',
  color: false,
  altIndex: 0,
  postsOverride: null,
  piers: { pierConc: 0, pierOvr: 0, pierOvrC: 0, col6: 0 },
  add: { skylight: 0, fan: 0, fanBeam: 0, outlet: 0, wrap: 0 },
  extras: { diag: 0, bay: 0, eng: 0, permit: 0 },
  discount: 0,
  discountReason: '',
};

export const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
export const money2 = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Feet as a tape measure reads them: 6.67 -> 6'-8"
export function ftin(f) {
  if (!Number.isFinite(f) || f <= 0) return `0'`;
  let ft = Math.floor(f + 1e-9);
  let inch = Math.round((f - ft) * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return inch ? `${ft}'-${inch}"` : `${ft}'`;
}

export function retail(item, margin) {
  if (!item) return 0;
  if (item.b === 'cost') return item.v / (1 - margin / 100);
  return item.v;
}

// ---------------------------------------------------------------------------
// Beam solver. Picks post spacing and the cheapest set of stock beams that
// covers the width, with every splice landing on a post and no bay over the
// span limit. Returns the four best layouts, cheapest first.
// ---------------------------------------------------------------------------
export function solveBeam(prices, type, width, colorRequired) {
  const cfg = prices.beams[type];
  const out = [];
  if (!cfg || !(width > 0)) return out;

  if (cfg.mode === 'ft') {
    // Priced by the foot and cut on site, so there is nothing to combine —
    // only the post count varies, and it is fixed by the span limit.
    const bays = Math.max(1, Math.ceil(width / cfg.maxSpan - 1e-9));
    out.push({
      bays, posts: bays + 1, span: width / bays, doubled: false, continuous: true,
      material: cfg.perFt.v * width, basis: cfg.perFt.b,
      pieces: [{ len: width, covers: bays, span: width, p: cfg.perFt.v * width }],
    });
  } else {
    let stock = [...cfg.stock].sort((a, b) => a.len - b.len);
    if (colorRequired && cfg.colorLens) {
      stock = stock.filter((s) => cfg.colorLens.includes(s.len));
    }
    if (!stock.length) return out;
    const maxLen = stock[stock.length - 1].len;
    const maxBays = Math.max(1, Math.ceil(width / 2));

    for (let n = 1; n <= maxBays; n += 1) {
      const bay = width / n;
      let doubled = false;
      if (bay > cfg.maxSpan + 1e-9) {
        if (cfg.maxDouble && bay <= cfg.maxDouble + 1e-9) doubled = true;
        else continue; // span is unbuildable at this post count
      }
      // Cheapest way to tile n equal bays with stock lengths, where one stick
      // may carry several bays but must end on a post.
      const dp = new Array(n + 1).fill(Infinity);
      const choice = new Array(n + 1).fill(null);
      dp[0] = 0;
      for (let i = 1; i <= n; i += 1) {
        for (let k = 1; k <= i; k += 1) {
          const need = k * bay;
          if (need > maxLen + 1e-9) break;
          let best = null;
          for (const s of stock) {
            if (s.len >= need - 1e-9 && (!best || s.p < best.p)) best = s;
          }
          if (!best) break;
          if (dp[i - k] + best.p < dp[i] - 1e-9) {
            dp[i] = dp[i - k] + best.p;
            choice[i] = { k, s: best };
          }
        }
      }
      if (!Number.isFinite(dp[n])) continue;

      const pieces = [];
      let i = n;
      while (i > 0) {
        const c = choice[i];
        pieces.push({ len: c.s.len, covers: c.k, span: c.k * bay, p: c.s.p });
        i -= c.k;
      }
      pieces.reverse();
      out.push({
        bays: n, posts: n + 1, span: bay, doubled, continuous: false,
        material: dp[n] * (doubled ? 2 : 1), basis: cfg.b, pieces,
      });
    }
  }

  const pierUnit = retail(prices.units.pier, prices.margin);
  out.forEach((r) => {
    r.included = !!cfg.included;
    r.beamPrice = r.included ? 0 : (r.basis === 'cost' ? r.material / (1 - prices.margin / 100) : r.material);
    r.pierPrice = r.posts * pierUnit;
    // Rank on real material cost so an included beam is still weighed against
    // the piers it forces, instead of looking free.
    r.score = (r.included ? r.material : r.beamPrice) + r.pierPrice;
  });
  out.sort((a, b) => (a.score - b.score) || (a.posts - b.posts));
  return out.slice(0, 4);
}

export function beamDesc(prices, beamKey, r) {
  if (!r) return '';
  if (r.continuous) {
    return `${ftin(r.span)} spans · ${r.posts} posts · ${money2(prices.beams[beamKey].perFt.v)}/ft of width`;
  }
  const mult = r.doubled ? 2 : 1;
  const counts = {};
  r.pieces.forEach((pc) => { counts[pc.len] = (counts[pc.len] || 0) + 1; });
  const list = Object.keys(counts)
    .sort((a, b) => b - a)
    .map((len) => `${counts[len] * mult} × ${len}'`)
    .join(', ');
  return `${list}${r.doubled ? ' (doubled)' : ''} · ${r.posts} posts at ${ftin(r.span)}`;
}

// ---------------------------------------------------------------------------
// Full bid. Returns the line items plus the numbers the UI needs.
// ---------------------------------------------------------------------------
export function calcBid(prices, spec) {
  const m = prices.margin;
  const width = Number(spec.width) || 0;
  const projection = Number(spec.projection) || 0;
  const sf = width * projection;

  const layouts = solveBeam(prices, spec.beam, width, spec.color);
  const chosen = layouts.length ? layouts[Math.min(spec.altIndex, layouts.length - 1)] : null;
  const autoPosts = chosen ? chosen.posts : 0;
  const posts = spec.postsOverride !== null && spec.postsOverride !== undefined ? spec.postsOverride : autoPosts;

  const special = spec.piers.pierConc + spec.piers.pierOvr + spec.piers.pierOvrC;
  const std = Math.max(0, posts - special);

  const lines = [];
  // tag renders words instead of a figure; custDesc replaces the description
  // on the customer copy so internal cost notes stay internal.
  const add = (n, d, amt, tag, custDesc) => {
    if (amt || tag) lines.push({ n, d, amt: amt || 0, tag, custDesc });
  };
  const u = (k) => retail(prices.units[k], m);

  add('Cover',
    `${spec.panel}" panel · ${ftin(width)} × ${ftin(projection)} = ${Math.round(sf)} sq ft @ ${money2(retail(prices.sqft[`panel${spec.panel}`], m))}/sq ft · panels, labor and hardware`,
    retail(prices.sqft[`panel${spec.panel}`], m) * sf);

  if (chosen) {
    const label = `${prices.beams[spec.beam].n} beam`;
    if (chosen.included) {
      add(label,
        `${beamDesc(prices, spec.beam, chosen)} · costs us ${money(chosen.material)}, carried in the panel price`,
        0, 'included', beamDesc(prices, spec.beam, chosen));
    } else {
      add(label, `${beamDesc(prices, spec.beam, chosen)} · upgrade over the standard fluted beam`, chosen.beamPrice);
    }
  }

  add('Piers', `${std} standard @ ${money(u('pier'))}`, std * u('pier'));
  add('Piers through concrete', `${spec.piers.pierConc} @ ${money(u('pierConc'))}`, spec.piers.pierConc * u('pierConc'));
  add('Oversized piers', `${spec.piers.pierOvr} @ ${money(u('pierOvr'))}`, spec.piers.pierOvr * u('pierOvr'));
  add('Oversized through concrete', `${spec.piers.pierOvrC} @ ${money(u('pierOvrC'))}`, spec.piers.pierOvrC * u('pierOvrC'));
  add('6×6 columns', `${spec.piers.col6} @ ${money(u('col6'))}`, spec.piers.col6 * u('col6'));
  add('Skylights', `${spec.add.skylight} @ ${money(u('skylight'))}`, spec.add.skylight * u('skylight'));
  add('Ceiling fans + electric', `${spec.add.fan} @ ${money(u('fan'))}`, spec.add.fan * u('fan'));
  add('Fan beam panels', `${spec.add.fanBeam} @ ${money(u('fanBeam'))}`, spec.add.fanBeam * u('fanBeam'));
  add('Outlets', `${spec.add.outlet} @ ${money(u('outlet'))}`, spec.add.outlet * u('outlet'));
  if (spec.add.wrap) add('Lattice wrap kit', `${ftin(width)} @ ${money(u('wrap'))}/ft`, width * u('wrap'));
  add('Diagonal cuts', `${spec.extras.diag} @ ${money(u('diag'))}`, spec.extras.diag * u('diag'));
  add('Bay / bow cut-outs', `${spec.extras.bay} @ ${money(u('bay'))}`, spec.extras.bay * u('bay'));
  if (spec.extras.eng) add('Engineering', 'Stamped plans', u('eng'));
  if (spec.extras.permit) add('Permit', 'Passed through at cost', prices.units.permit.v);

  const subtotal = lines.reduce((a, x) => a + x.amt, 0);
  const discount = Math.max(0, Number(spec.discount) || 0);
  const total = Math.max(0, subtotal - discount);

  return { width, projection, sf, layouts, chosen, autoPosts, posts, std, lines, subtotal, discount, total };
}
