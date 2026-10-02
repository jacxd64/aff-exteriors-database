// ===========================================================================
// On-site patio cover bid builder. A salesman enters the cover and the price
// assembles itself from the published price sheet, in front of the customer.
//
// Three views: Build (the rep's screen), Customer (clean line items, no cost
// notes), Price sheet (the whole model, admin only).
// ===========================================================================
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import {
  DEFAULT_PRICES, EMPTY_SPEC, calcBid, solveBeam, beamDesc, retail, money, money2, ftin,
} from '../utils/patioPricing';

const PRICE_KEY = 'aff-patio-prices';

function loadPrices() {
  try {
    const raw = localStorage.getItem(PRICE_KEY);
    if (raw) return mergeDeep(structuredClone(DEFAULT_PRICES), JSON.parse(raw));
  } catch { /* private mode, blocked storage — fall through to defaults */ }
  return structuredClone(DEFAULT_PRICES);
}
function mergeDeep(base, over) {
  Object.keys(over || {}).forEach((k) => {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) mergeDeep(base[k], over[k]);
    else base[k] = over[k];
  });
  return base;
}

function Stepper({ label, sub, value, onChange, toggle = false, max }) {
  const on = value > 0;
  return (
    <div className={`bid-step ${on ? 'is-on' : ''}`}>
      <span className="bid-step-name">
        <b>{label}</b>
        <i>{sub}</i>
      </span>
      {toggle ? (
        <button type="button" className="bid-step-toggle" onClick={() => onChange(on ? 0 : 1)} aria-pressed={on}>
          {on ? 'Yes' : 'No'}
        </button>
      ) : (
        <span className="bid-step-ct">
          <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`One fewer ${label}`}>−</button>
          <input
            type="number" min="0" max={max} inputMode="numeric" value={value}
            onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            aria-label={label}
          />
          <button type="button" onClick={() => onChange(value + 1)} aria-label={`One more ${label}`}>+</button>
        </span>
      )}
    </div>
  );
}

export default function BidBuilder() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [prices, setPrices] = useState(loadPrices);
  const [spec, setSpec] = useState({
    ...structuredClone(EMPTY_SPEC),
    add: { skylight: 0, fan: 1, fanBeam: 1, outlet: 0, wrap: 0 },
    extras: { diag: 0, bay: 0, eng: 1, permit: 1 },
  });
  const [tab, setTab] = useState('build');
  const [customer, setCustomer] = useState('');
  const [bidNo, setBidNo] = useState('');

  const bid = useMemo(() => calcBid(prices, spec), [prices, spec]);
  const cfg = prices.beams[spec.beam];

  // Changing the cover or the beam invalidates any manual post count.
  const patch = (next) => setSpec((s) => ({ ...s, ...next }));
  const reframe = (next) => setSpec((s) => {
    const merged = { ...s, ...next, altIndex: 0, postsOverride: null };
    const layouts = solveBeam(prices, merged.beam, Number(merged.width) || 0, merged.color);
    const posts = layouts.length ? layouts[0].posts : 0;
    return { ...merged, piers: clampPiers(merged.piers, posts) };
  });
  const setPiers = (key, v) => setSpec((s) => ({ ...s, piers: clampPiers({ ...s.piers, [key]: v }, effPosts(s)) }));
  const effPosts = (s) => {
    if (s.postsOverride !== null && s.postsOverride !== undefined) return s.postsOverride;
    const layouts = solveBeam(prices, s.beam, Number(s.width) || 0, s.color);
    return layouts.length ? layouts[Math.min(s.altIndex, layouts.length - 1)].posts : 0;
  };
  function clampPiers(p, posts) {
    const out = { ...p };
    ['pierConc', 'pierOvr', 'pierOvrC'].forEach((k) => { out[k] = Math.min(out[k], posts); });
    let over = out.pierConc + out.pierOvr + out.pierOvrC - posts;
    ['pierOvrC', 'pierOvr', 'pierConc'].forEach((k) => {
      if (over > 0) { const cut = Math.min(over, out[k]); out[k] -= cut; over -= cut; }
    });
    out.col6 = Math.min(out.col6, posts);
    return out;
  }

  const savePrices = (next) => {
    setPrices(next);
    try { localStorage.setItem(PRICE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const setPrice = (path, value) => {
    const next = structuredClone(prices);
    const parts = path.split('.');
    let t = next;
    for (let i = 0; i < parts.length - 1; i += 1) t = t[parts[i]];
    t[parts[parts.length - 1]] = value;
    savePrices(next);
  };

  const rows = (forCustomer) => bid.lines.map((l) => (
    <tr key={l.n}>
      <td>
        {l.n}
        <i>{forCustomer && l.custDesc !== undefined ? l.custDesc : l.d}</i>
      </td>
      <td>{l.tag ? <span className="bid-included">{l.tag}</span> : money(l.amt)}</td>
    </tr>
  ));
  const totalRows = (forCustomer) => (
    <>
      {rows(forCustomer)}
      {bid.discount > 0 && (
        <tr className="bid-disc">
          <td>
            Discount
            <i>{spec.discountReason || (forCustomer ? '' : <span className="bid-noreason">No reason given</span>)}</i>
          </td>
          <td>−{money(bid.discount)}</td>
        </tr>
      )}
      <tr className="bid-sum"><td>Total</td><td>{money(bid.total)}</td></tr>
    </>
  );

  return (
    <div className="page bid-page">
      <div className="page-header">
        <div>
          <h1>Patio cover bid</h1>
          <p className="page-subtitle">Enter the cover, the price builds itself</p>
        </div>
      </div>

      <div className="bid-tabs" role="tablist">
        {[['build', 'Build'], ['customer', 'Customer view'], ...(isAdmin ? [['prices', 'Price sheet']] : [])].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} type="button">{label}</button>
        ))}
      </div>

      {tab === 'build' && (
        <>
          <section className="card bid-card">
            <h2 className="bid-h2">Job</h2>
            <div className="bid-grid2">
              <Field label="Customer" htmlFor="bid-cust">
                <Input id="bid-cust" value={customer} placeholder="Name or address" onChange={(e) => setCustomer(e.target.value)} />
              </Field>
              <Field label="Bid #" htmlFor="bid-no">
                <Input id="bid-no" value={bidNo} placeholder="Optional" onChange={(e) => setBidNo(e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Cover <span>attached to house</span></h2>
            <div className="bid-grid2">
              <Field label="Width (ft)" htmlFor="bid-w">
                <Input id="bid-w" type="number" min="1" max="120" step="0.5" inputMode="decimal"
                  value={spec.width} onChange={(e) => reframe({ width: e.target.value })} />
              </Field>
              <Field label="Projection (ft)" htmlFor="bid-p">
                <Input id="bid-p" type="number" min="1" max="40" step="0.5" inputMode="decimal"
                  value={spec.projection} onChange={(e) => patch({ projection: e.target.value })} />
              </Field>
            </div>
            <span className="field-label">Panel</span>
            <div className="bid-seg">
              {['3', '4', '6'].map((k) => (
                <button key={k} type="button" aria-pressed={spec.panel === k} onClick={() => patch({ panel: k })}>
                  {k}&quot; panel
                  <span>{money2(retail(prices.sqft[`panel${k}`], prices.margin))}/sq ft</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Beam &amp; posts <span>spans checked against the limit</span></h2>
            <div className="bid-seg">
              {Object.keys(prices.beams).map((k) => {
                const b = prices.beams[k];
                return (
                  <button key={k} type="button" aria-pressed={spec.beam === k} onClick={() => reframe({ beam: k })}>
                    {b.n}
                    <span>{b.included ? 'standard' : 'upgrade'} · max {b.maxSpan}&#39;{b.maxDouble ? ` / ${b.maxDouble}' dbl` : ''}</span>
                  </button>
                );
              })}
            </div>

            <Stepper
              label="Color beam" toggle value={spec.color ? 1 : 0}
              onChange={(v) => reframe({ color: v > 0 })}
              sub={cfg.colorLens
                ? `Color comes only in ${cfg.colorLens.map((l) => `${l}'`).join(' / ')} stock — shorter beams are locked out`
                : 'No length restriction on this beam'}
            />

            {!bid.chosen ? (
              <div className="bid-readout bid-readout-bad">
                <div className="bid-row">
                  <span>No safe layout at this width</span>
                  <span>{spec.color && cfg.colorLens ? `Color restricts stock to ${cfg.colorLens.join('/')}'` : 'Check the width'}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="bid-readout">
                  <div className="bid-row">
                    <span>Posts</span>
                    <span>{bid.posts}{spec.postsOverride !== null ? ' (manual)' : ''}</span>
                  </div>
                  <div className="bid-row">
                    <span>Span between posts</span>
                    <span>{ftin(bid.chosen.span)} <small>max {bid.chosen.doubled ? cfg.maxDouble : cfg.maxSpan}&#39;</small></span>
                  </div>
                  {bid.chosen.doubled && (
                    <div className="bid-row">
                      <span>Double beam required</span>
                      <span className="bid-warn">span is over {cfg.maxSpan}&#39;</span>
                    </div>
                  )}
                  <div className="bid-row">
                    <span>Beam material cost</span>
                    <span>{money(bid.chosen.material)}</span>
                  </div>
                  <div className="bid-row">
                    <span>{bid.chosen.included ? 'On the bid' : `Billed at ${prices.margin}% margin`}</span>
                    <span className={bid.chosen.included ? 'bid-included' : ''}>
                      {bid.chosen.included ? 'included in the panel price' : money(bid.chosen.beamPrice)}
                    </span>
                  </div>
                  <div className="bid-sched">
                    {bid.chosen.continuous
                      ? `${cfg.n} continuous — ${ftin(bid.chosen.pieces[0].len)}, priced by the foot`
                      : bid.chosen.pieces.map((pc, i) => {
                        const mult = bid.chosen.doubled ? 2 : 1;
                        const waste = pc.len - pc.span;
                        return (
                          <div key={i}>
                            <b>{i + 1}.</b> {mult > 1 ? '2 × ' : ''}{pc.len}&#39; stock → spans {ftin(pc.span)}
                            {' '}({pc.covers} bay{pc.covers > 1 ? 's' : ''})
                            {waste > 0.05 ? ` · ${ftin(waste)} cut off` : ' · no waste'}
                            {' '}&nbsp;{money(pc.p * mult)}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {bid.layouts.length > 1 && (
                  <div className="bid-alts">
                    <div className="bid-altlbl">Layouts, cheapest first — what the customer pays for beam + piers</div>
                    {bid.layouts.map((x, i) => (
                      <button key={i} type="button" className="bid-alt"
                        aria-pressed={i === Math.min(spec.altIndex, bid.layouts.length - 1)}
                        onClick={() => setSpec((s) => ({ ...s, altIndex: i, postsOverride: null, piers: clampPiers(s.piers, x.posts) }))}>
                        <span className="bid-alt-l">
                          {x.posts} posts at {ftin(x.span)}
                          <i>{beamDesc(prices, spec.beam, x)}</i>
                        </span>
                        <span className="bid-alt-p">{money(x.beamPrice + x.pierPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Piers &amp; columns <span>auto: {bid.autoPosts} posts</span></h2>
            <Stepper label="Total posts / piers" value={bid.posts}
              sub={`${bid.posts} total · ${bid.std} standard @ ${money(retail(prices.units.pier, prices.margin))}`}
              onChange={(v) => setSpec((s) => ({ ...s, postsOverride: v === bid.autoPosts ? null : v, piers: clampPiers(s.piers, v) }))} />
            {['pierConc', 'pierOvr', 'pierOvrC', 'col6'].map((k) => (
              <Stepper key={k} label={prices.units[k].n} value={spec.piers[k]} max={bid.posts}
                sub={`${money(retail(prices.units[k], prices.margin))} each · ${k === 'col6' ? 'upgrade' : `of the ${bid.posts}`}`}
                onChange={(v) => setPiers(k, v)} />
            ))}
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Add-ons</h2>
            {['skylight', 'fan', 'fanBeam', 'outlet'].map((k) => {
              let sub = `${money(retail(prices.units[k], prices.margin))} each`;
              if (k === 'fan') sub += ` · with its fan beam panel ${money(retail(prices.units.fan, prices.margin) + retail(prices.units.fanBeam, prices.margin))} installed`;
              if (k === 'fanBeam') sub += ' · one per fan, follows the fan count';
              return (
                <Stepper key={k} label={prices.units[k].n} sub={sub} value={spec.add[k]}
                  onChange={(v) => setSpec((s) => ({
                    ...s,
                    add: { ...s.add, [k]: v, ...(k === 'fan' ? { fanBeam: v } : {}) },
                  }))} />
              );
            })}
            <Stepper label="Lattice wrap kit" toggle value={spec.add.wrap}
              sub={`${money(retail(prices.units.wrap, prices.margin))}/ft × ${ftin(bid.width)} = ${money(retail(prices.units.wrap, prices.margin) * bid.width)}`}
              onChange={(v) => setSpec((s) => ({ ...s, add: { ...s.add, wrap: v } }))} />
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Cuts &amp; fees</h2>
            <Stepper label="Diagonal cut" value={spec.extras.diag} sub={`${money(retail(prices.units.diag, prices.margin))} each`}
              onChange={(v) => setSpec((s) => ({ ...s, extras: { ...s.extras, diag: v } }))} />
            <Stepper label="Bay / bow cut-out" value={spec.extras.bay} sub={`${money(retail(prices.units.bay, prices.margin))} each`}
              onChange={(v) => setSpec((s) => ({ ...s, extras: { ...s.extras, bay: v } }))} />
            <Stepper label="Engineering" toggle value={spec.extras.eng} sub={`${money(retail(prices.units.eng, prices.margin))} · costs us $300`}
              onChange={(v) => setSpec((s) => ({ ...s, extras: { ...s.extras, eng: v } }))} />
            <Stepper label="Permit" toggle value={spec.extras.permit} sub={`${money(prices.units.permit.v)} · at cost, no markup`}
              onChange={(v) => setSpec((s) => ({ ...s, extras: { ...s.extras, permit: v } }))} />
            <div className="bid-grid2 bid-disc-row">
              <Field label="Discount ($)" htmlFor="bid-disc">
                <Input id="bid-disc" type="number" min="0" step="25" inputMode="decimal"
                  value={spec.discount} onChange={(e) => patch({ discount: e.target.value })} />
              </Field>
              <Field label="Reason" htmlFor="bid-why">
                <Input id="bid-why" value={spec.discountReason} placeholder="Required if discounting"
                  onChange={(e) => patch({ discountReason: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Internal breakdown</h2>
            <table className="bid-items"><tbody>{totalRows(false)}</tbody></table>
          </section>
        </>
      )}

      {tab === 'customer' && (
        <section className="card bid-card bid-cust">
          <h3>{customer || 'Customer'}</h3>
          <p className="page-subtitle">
            {bidNo ? `Bid ${bidNo} · ` : ''}{ftin(bid.width)} × {ftin(bid.projection)} attached patio cover · {spec.panel}&quot; panel
          </p>
          <table className="bid-items"><tbody>{totalRows(true)}</tbody></table>
          <p className="bid-fine">
            Quoted from the current published price sheet. Good for 30 days. Permit fees are passed through at cost.
          </p>
        </section>
      )}

      {tab === 'prices' && (
        <>
          <div className="bid-note">
            <Icon name="alert" size={16} />
            <span>
              Changes are saved on this device only for now. Mark a line <b>Cost</b> and the margin is applied to it;
              mark it <b>Retail</b> and it goes on the bid as typed.
            </span>
          </div>

          <section className="card bid-card">
            <h2 className="bid-h2">Margin</h2>
            <div className="bid-psrow">
              <span className="bid-psname">Target margin<i>Applied to every Cost line: price = cost ÷ (1 − margin)</i></span>
              <Input type="number" min="0" max="90" step="1" inputMode="decimal" value={prices.margin}
                onChange={(e) => setPrice('margin', Number(e.target.value) || 0)} aria-label="Target margin percent" />
              <span className="bid-psder">percent</span>
            </div>
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Panels <span>per square foot</span></h2>
            {Object.keys(prices.sqft).map((k) => (
              <PriceRow key={k} item={prices.sqft[k]} path={`sqft.${k}`} onChange={setPrice} />
            ))}
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Beams</h2>
            {Object.keys(prices.beams).map((bk) => {
              const b = prices.beams[bk];
              return (
                <div key={bk}>
                  <div className="bid-psgrp">
                    {b.n} <span>{b.included ? 'standard — ' : 'upgrade — '}max {b.maxSpan}&#39; between posts{b.maxDouble ? `, ${b.maxDouble}' doubled` : ''}</span>
                  </div>
                  {b.mode === 'ft' ? (
                    <div className="bid-psrow">
                      <span className="bid-psname">Per foot of width<i>Our cost. Carried in the panel price, so it never hits the bid as its own line.</i></span>
                      <Input type="number" min="0" step="1" inputMode="decimal" value={b.perFt.v}
                        onChange={(e) => setPrice(`beams.${bk}.perFt.v`, Number(e.target.value) || 0)} aria-label={`${b.n} per foot`} />
                      <span className="bid-psder">not billed</span>
                    </div>
                  ) : b.stock.map((s, i) => (
                    <div className="bid-psrow" key={s.len}>
                      <span className="bid-psname">{s.len}&#39; stock<i>Wholesale</i></span>
                      <Input type="number" min="0" step="1" inputMode="decimal" value={s.p}
                        onChange={(e) => setPrice(`beams.${bk}.stock.${i}.p`, Number(e.target.value) || 0)} aria-label={`${b.n} ${s.len} foot stock`} />
                      <span className="bid-psder">{money(s.p / (1 - prices.margin / 100))} billed</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>

          <section className="card bid-card">
            <h2 className="bid-h2">Per-unit items</h2>
            {Object.keys(prices.units).map((k) => (
              <PriceRow key={k} item={prices.units[k]} path={`units.${k}`} onChange={setPrice} />
            ))}
          </section>

          <div className="bid-btnrow">
            <Button onClick={() => { try { localStorage.removeItem(PRICE_KEY); } catch { /* ignore */ } setPrices(structuredClone(DEFAULT_PRICES)); }}>
              Reset to defaults
            </Button>
          </div>
        </>
      )}

      <div className="bid-totalbar">
        <div className="bid-totalbar-in">
          <div>
            <div className="bid-totalbar-lbl">Customer total</div>
            <div className="bid-totalbar-amt">{money(bid.total)}</div>
          </div>
          <div className="bid-totalbar-side">
            {Math.round(bid.sf)} sq ft · {money(bid.total / (bid.sf || 1))}/sq ft
            <br />
            {bid.posts} posts · {bid.chosen ? `${ftin(bid.chosen.span)} spans` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ item, path, onChange }) {
  return (
    <div className="bid-psrow">
      <span className="bid-psname">{item.n}{item.d ? <i>{item.d}</i> : null}</span>
      <Input type="number" min="0" step="1" inputMode="decimal" value={item.v}
        onChange={(e) => onChange(`${path}.v`, Number(e.target.value) || 0)} aria-label={item.n} />
      {item.b === 'pass' ? (
        <span className="bid-psder">at cost</span>
      ) : (
        <select className="select bid-psbasis" value={item.b} onChange={(e) => onChange(`${path}.b`, e.target.value)} aria-label={`${item.n} basis`}>
          <option value="price">Retail</option>
          <option value="cost">Cost</option>
        </select>
      )}
    </div>
  );
}
