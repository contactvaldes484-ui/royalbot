'use strict';
// Cache exchangeInfo par market — recharge toutes les 6h
const cache = { spot: { at: 0, map: {} }, futures: { at: 0, map: {} } };

function _stepRound(value, step) {
  if (!step || step <= 0) return value;
  const precision = Math.max(0, Math.round(-Math.log10(step)));
  return Number((Math.floor(value / step) * step).toFixed(precision));
}

async function loadFilters(binance, market) {
  const c = cache[market];
  if (Date.now() - c.at < 6 * 3600e3 && Object.keys(c.map).length) return c.map;
  const info = await binance.getExchangeInfo(market);
  const map = {};
  for (const s of info.symbols || []) {
    const lot    = s.filters.find(f => f.filterType === 'LOT_SIZE');
    const price  = s.filters.find(f => f.filterType === 'PRICE_FILTER');
    const notion = s.filters.find(f => ['MIN_NOTIONAL', 'NOTIONAL'].includes(f.filterType));
    map[s.symbol] = {
      stepSize:    Number(lot?.stepSize || 0),
      minQty:      Number(lot?.minQty || 0),
      tickSize:    Number(price?.tickSize || 0),
      minNotional: Number(notion?.minNotional || notion?.notional || 0),
    };
  }
  cache[market] = { at: Date.now(), map };
  return map;
}

async function normalizeOrder(binance, market, symbol, { qty, price }) {
  const f = (await loadFilters(binance, market))[symbol];
  if (!f) return { qty, price };
  const out = {};
  if (qty   != null) out.qty   = _stepRound(qty, f.stepSize);
  if (price != null) out.price = _stepRound(price, f.tickSize);
  out.filters = f;
  return out;
}

module.exports = { loadFilters, normalizeOrder, _stepRound };
