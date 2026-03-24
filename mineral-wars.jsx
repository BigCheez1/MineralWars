import { useState, useCallback } from "react";

// ============================================================
// DIFFICULTY CONFIGS
// ============================================================
const DIFFICULTIES = {
  daddy: {
    id: "daddy",
    name: "Daddy's Money",
    emoji: "💳",
    tagline: "Easy",
    color: "#51cf66",
    desc: "Your dad runs a midstream company. You've got connections, a company card, and a suspiciously nice apartment in Midland.",
    stats: "More cash, less debt, gentle markets, friendly roads.",
    cash: 12000,
    debt: 4000,
    interest: 0.05,
    travelCost: 200,
    capacity: 120,
    days: 30,
    eventChance: 0.45,
    priceMultiplier: 1.0,    // normal prices
    spreadStrength: 1.0,     // full location spreads
    volatility: 0.28,        // higher = more opportunities
    // Event weight overrides: less bad, more good
    confiscateWeight: 1,
    costWeight: 1,
    cashWeight: 4,
    nothingWeight: 8,
    crashMult: 0.75,         // crashes are milder
    spikeMult: 1.3,          // spikes are juicier
    confiscateMult: 0.5,     // lose less cargo
    costMult: 0.6,           // fines/repairs cheaper
    cashMult: 2.5,
    brokerFee: 0.10,        // 10% cut on loans
    maxDebt: 50000,          // debt cap           // windfalls bigger
  },
  bootstrap: {
    id: "bootstrap",
    name: "Bootstrapped",
    emoji: "🥾",
    tagline: "Medium",
    color: "#F5A623",
    desc: "No connections. No safety net. Just a beat-up F-150 and a dream. Bryce from PE loaned you the start-up cash.",
    stats: "Balanced. You'll need to learn the routes to survive.",
    cash: 5000,
    debt: 8000,
    interest: 0.08,
    travelCost: 400,
    capacity: 80,
    days: 30,
    eventChance: 0.55,
    priceMultiplier: 1.0,
    spreadStrength: 1.0,
    volatility: 0.22,
    confiscateWeight: 3,
    costWeight: 3,
    cashWeight: 1,
    nothingWeight: 4,
    crashMult: 1.0,
    spikeMult: 1.0,
    confiscateMult: 1.0,
    costMult: 1.0,
    cashMult: 1.0,
    brokerFee: 0.15,        // 15% cut on loans
    maxDebt: 40000,          // debt cap
  },
  crash: {
    id: "crash",
    name: "2015 Oil Crash",
    emoji: "📉",
    tagline: "Hard",
    color: "#ff6b6b",
    desc: "Crude hit $26. Rigs are stacking. Half the guys you know got laid off. Banks won't return your calls.",
    stats: "Less cash, more debt, depressed prices, ruthless roads. Good luck.",
    cash: 3000,
    debt: 12000,
    interest: 0.10,
    travelCost: 500,
    capacity: 60,
    days: 25,
    eventChance: 0.65,
    priceMultiplier: 0.7,    // depressed market
    spreadStrength: 0.75,    // tighter spreads (less arbitrage)
    volatility: 0.16,        // less price movement
    confiscateWeight: 5,
    costWeight: 4,
    cashWeight: 0,           // no windfalls
    nothingWeight: 2,
    crashMult: 1.3,          // crashes hit harder
    spikeMult: 0.7,          // spikes are weak
    confiscateMult: 1.4,     // lose more cargo
    costMult: 1.5,           // fines/repairs more expensive
    cashMult: 0,             // no free money
    brokerFee: 0.20,        // 20% cut — Bryce's desperate too
    maxDebt: 30000,          // debt cap
  },
};

// ============================================================
// GAME DATA
// ============================================================
const LOCATION_MODS_BASE = {
  midland:  { sand: 0.95, pipe: 1.00, mud: 0.90, crude: 1.00, mineral: 1.10, helium: 1.05 },
  odessa:   { sand: 0.75, pipe: 0.80, mud: 0.85, crude: 1.15, mineral: 1.25, helium: 1.20 },
  houston:  { sand: 1.25, pipe: 1.20, mud: 1.15, crude: 1.30, mineral: 0.85, helium: 0.90 },
  lubbock:  { sand: 1.05, pipe: 1.10, mud: 1.00, crude: 0.90, mineral: 0.95, helium: 1.35 },
  okc:      { sand: 1.20, pipe: 1.25, mud: 1.10, crude: 0.75, mineral: 1.05, helium: 0.80 },
  permian:  { sand: 0.85, pipe: 0.90, mud: 0.75, crude: 0.80, mineral: 1.35, helium: 1.30 },
};

// Build location mods scaled by difficulty spreadStrength
function getLocationMods(diff) {
  const mods = {};
  Object.entries(LOCATION_MODS_BASE).forEach(([loc, comms]) => {
    mods[loc] = {};
    Object.entries(comms).forEach(([c, v]) => {
      // Lerp toward 1.0 based on spreadStrength (1.0 = full spread, 0 = no spread)
      mods[loc][c] = 1 + (v - 1) * diff.spreadStrength;
    });
  });
  return mods;
}

const LOCATIONS = [
  { id: "midland", name: "Midland", desc: "Supply hub. Average prices.", vibe: "🏗️" },
  { id: "odessa", name: "Odessa", desc: "Blue collar. Cheap materials, pricey commodities.", vibe: "🔧" },
  { id: "houston", name: "Houston", desc: "Corporate money. They pay top dollar for crude.", vibe: "🏙️" },
  { id: "lubbock", name: "Lubbock", desc: "College town. Weird helium market.", vibe: "🌾" },
  { id: "okc", name: "Oklahoma City", desc: "Cheap crude. Expensive imports.", vibe: "🤠" },
  { id: "permian", name: "The Permian", desc: "Source. Cheap crude & mud, pricey rights.", vibe: "🛢️" },
];

const COMMODITIES = [
  { id: "sand", name: "Frac Sand", basePrice: 120, minPrice: 55, maxPrice: 250, unit: "tons" },
  { id: "pipe", name: "Pipe Fittings", basePrice: 350, minPrice: 140, maxPrice: 700, unit: "crates" },
  { id: "mud", name: "Drilling Mud", basePrice: 800, minPrice: 350, maxPrice: 1500, unit: "barrels" },
  { id: "crude", name: "Crude Oil", basePrice: 2200, minPrice: 900, maxPrice: 4500, unit: "barrels" },
  { id: "mineral", name: "Mineral Rights", basePrice: 9000, minPrice: 4000, maxPrice: 18000, unit: "acres" },
  { id: "helium", name: "Helium Reserves", basePrice: 28000, minPrice: 12000, maxPrice: 55000, unit: "claims" },
];

// Base events — weights get overridden per difficulty
const EVENTS_BASE = [
  // Price events
  { text: "🛢️ Wildcat well hit near {location}! Crude oversupply.", effect: "crash", commodity: "crude", cat: "price" },
  { text: "💥 Pipeline burst! Pipe fitting shortage.", effect: "spike", commodity: "pipe", cat: "price" },
  { text: "🇸🇦 OPEC flooded the market. Oil tanking.", effect: "crash", commodity: "crude", cat: "price" },
  { text: "📉 Fracking moratorium rumors. Sand prices dropped.", effect: "crash", commodity: "sand", cat: "price" },
  { text: "🌪️ Tornado shut down ops. Drilling mud in short supply.", effect: "spike", commodity: "mud", cat: "price" },
  { text: "📰 WSJ: 'Permian Basin tapped out?' Mineral rights tanking.", effect: "crash", commodity: "mineral", cat: "price" },
  { text: "🔥 Refinery fire in Houston! Crude demand spiking.", effect: "spike", commodity: "crude", cat: "price" },
  { text: "💰 Hedge fund buying mineral rights. Prices climbing.", effect: "spike", commodity: "mineral", cat: "price" },
  // Confiscate
  { text: "🚨 EPA inspection! They confiscated some of your cargo!", effect: "confiscate", pct: 0.30, cat: "confiscate" },
  { text: "🕵️ Railroad Commission audit. Unlicensed goods seized.", effect: "confiscate", pct: 0.25, cat: "confiscate" },
  { text: "🔓 Truck got broken into overnight. Some cargo stolen.", effect: "confiscate", pct: 0.20, cat: "confiscate" },
  { text: "🌊 Flash flood on I-20! Part of your load washed out.", effect: "confiscate", pct: 0.35, cat: "confiscate" },
  // Cash costs
  { text: "🛻 Truck threw a rod. Repairs: ${amount}.", effect: "cost", baseAmount: 2500, cat: "cost" },
  { text: "👮 Overweight citation on US-385. Fine: ${amount}.", effect: "cost", baseAmount: 1800, cat: "cost" },
  { text: "⛽ Fuel prices spiked. Extra travel cost: ${amount}.", effect: "cost", baseAmount: 1200, cat: "cost" },
  { text: "🏥 Got heat stroke on-site. Medical bill: ${amount}.", effect: "cost", baseAmount: 3000, cat: "cost" },
  { text: "🍻 Lost ${amount} at the Odessa poker game.", effect: "cost", baseAmount: 2000, cat: "cost" },
  // Cash wins
  { text: "🎰 Won ${amount} on scratch-offs at Buc-ee's.", effect: "cash", baseAmount: 800, cat: "cash" },
  { text: "🍖 Brisket deal. Guy owed you a favor. +${amount}.", effect: "cash", baseAmount: 500, cat: "cash" },
  { text: "🤝 Old buddy hooked you up. Here's ${amount}.", effect: "cash", baseAmount: 1500, cat: "cash" },
  // Nothing
  { text: "📻 Long quiet drive. Nothing happened.", effect: "none", cat: "nothing" },
  { text: "☀️ Clear skies. Smooth ride.", effect: "none", cat: "nothing" },
  { text: "🦎 Saw a roadrunner. That's it. That's the event.", effect: "none", cat: "nothing" },
];

// ============================================================
// HELPERS
// ============================================================
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmt(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.floor(n).toLocaleString()}`;
}

function buildEvents(diff) {
  const catWeights = {
    price: 2,
    confiscate: diff.confiscateWeight,
    cost: diff.costWeight,
    cash: diff.cashWeight,
    nothing: diff.nothingWeight,
  };
  return EVENTS_BASE.filter(e => catWeights[e.cat] > 0).map(e => ({
    ...e,
    weight: catWeights[e.cat],
  }));
}

function weightedPick(items) {
  const total = items.reduce((s, e) => s + (e.weight || 1), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= (item.weight || 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generatePrices(locationId, prevPrices, diff) {
  const mods = getLocationMods(diff);
  const locMods = mods[locationId];
  const prices = {};
  COMMODITIES.forEach(c => {
    const locMod = locMods[c.id] || 1;
    const vol = diff.volatility;
    const noise = 1 + (Math.random() - 0.5) * 2 * vol;
    const base = c.basePrice * diff.priceMultiplier;
    let anchor = base;
    if (prevPrices && prevPrices[c.id]) {
      anchor = base * 0.5 + prevPrices[c.id] * 0.5;
    }
    const minP = Math.floor(c.minPrice * diff.priceMultiplier);
    const maxP = Math.floor(c.maxPrice * diff.priceMultiplier);
    prices[c.id] = clamp(Math.floor(anchor * locMod * noise), Math.max(minP, 10), maxP);
  });
  return prices;
}

function applyEvent(ev, prices, diff) {
  const p = { ...prices };
  if (ev.effect === "crash") {
    const c = COMMODITIES.find(x => x.id === ev.commodity);
    const severity = (0.6 + Math.random() * 0.15) * (2 - diff.crashMult); // harder = lower multiplier
    const minP = Math.floor(c.minPrice * diff.priceMultiplier);
    const maxP = Math.floor(c.maxPrice * diff.priceMultiplier);
    p[ev.commodity] = clamp(Math.floor(p[ev.commodity] * severity), Math.max(minP, 10), maxP);
  } else if (ev.effect === "spike") {
    const c = COMMODITIES.find(x => x.id === ev.commodity);
    const boost = (1.25 + Math.random() * 0.20) * diff.spikeMult;
    const minP = Math.floor(c.minPrice * diff.priceMultiplier);
    const maxP = Math.floor(c.maxPrice * diff.priceMultiplier);
    p[ev.commodity] = clamp(Math.floor(p[ev.commodity] * boost), Math.max(minP, 10), maxP);
  }
  return p;
}

function confiscateCargo(inventory, pct) {
  const newInv = { ...inventory };
  const losses = [];
  Object.keys(newInv).forEach(id => {
    if (newInv[id] > 0) {
      const lost = Math.floor(newInv[id] * pct);
      if (lost > 0) {
        const name = COMMODITIES.find(c => c.id === id)?.name || id;
        losses.push({ name, qty: lost });
        newInv[id] -= lost;
        if (newInv[id] <= 0) delete newInv[id];
      }
    }
  });
  return { newInv, losses };
}

function getNetWorth(cash, inventory, prices, debt) {
  let inv = 0;
  Object.entries(inventory).forEach(([id, qty]) => { inv += (prices[id] || 0) * qty; });
  return cash + inv - debt;
}

function getTitle(netWorth) {
  if (netWorth >= 500000) return { title: "THE MINERAL BRO 💎", color: "#FFD700" };
  if (netWorth >= 200000) return { title: "Basin King 👑", color: "#F5A623" };
  if (netWorth >= 100000) return { title: "Wildcatter 🤠", color: "#E89B2D" };
  if (netWorth >= 50000) return { title: "Land Baron 🏜️", color: "#D4891A" };
  if (netWorth >= 20000) return { title: "Lease Hound 🐕", color: "#C07818" };
  if (netWorth >= 5000) return { title: "Permit Pusher 📝", color: "#A06515" };
  if (netWorth >= 0) return { title: "Intern ☕", color: "#8B5E10" };
  return { title: "Bankrupt 💀", color: "#ff4444" };
}

// ============================================================
// PRESTIGE SYSTEM
// ============================================================
const PRESTIGE_THRESHOLD = 50000; // net worth required to prestige
const PRESTIGE_CARRYOVER = 0.05;  // 5% of NW carries as bonus starting cash
const PRESTIGE_NUMERALS = ["", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function getPrestigeName(level) {
  if (level <= 0) return "";
  return PRESTIGE_NUMERALS[Math.min(level, PRESTIGE_NUMERALS.length - 1)];
}

// Each prestige level ratchets the difficulty — bigger money, wilder swings, meaner roads
function applyPrestige(baseDiff, level) {
  if (level <= 0) return baseDiff;
  const s = level; // shorthand
  return {
    ...baseDiff,
    // Economy scales up — more money flowing but tighter margins
    priceMultiplier: baseDiff.priceMultiplier * (1 + s * 0.4),     // +40% prices per level
    volatility: Math.min(0.45, baseDiff.volatility + s * 0.04),     // wilder swings, capped
    spreadStrength: Math.max(0.5, baseDiff.spreadStrength - s * 0.08), // tighter spreads
    // Debt gets nastier
    debt: Math.floor(baseDiff.debt * (1 + s * 0.35)),               // +35% starting debt per level
    interest: Math.min(0.15, baseDiff.interest + s * 0.01),          // +1% daily interest per level
    // Events get meaner
    eventChance: Math.min(0.80, baseDiff.eventChance + s * 0.05),
    confiscateWeight: baseDiff.confiscateWeight + s * 1.5,
    costWeight: baseDiff.costWeight + s * 1,
    confiscateMult: Math.min(2.0, baseDiff.confiscateMult + s * 0.15),
    costMult: baseDiff.costMult + s * 0.2,
    // Travel more expensive
    travelCost: baseDiff.travelCost + s * 150,
    // Slightly less time
    days: Math.max(20, baseDiff.days - s * 2),
    // Capacity doesn't change — you have to earn upgrades
  };
}

// ============================================================
// COMPONENTS
// ============================================================

function TradeModal({ commodity, price, cash, inventoryQty, capacity, usedCapacity, mode, onConfirm, onClose }) {
  const [qty, setQty] = useState("");
  const maxBuy = Math.min(Math.floor(cash / price), capacity - usedCapacity);
  const maxSell = inventoryQty;
  const max = mode === "buy" ? maxBuy : maxSell;
  const total = (parseInt(qty) || 0) * price;
  const valid = (parseInt(qty) || 0) > 0 && (parseInt(qty) || 0) <= max;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#111", border: "1px solid #F5A623", borderRadius: 12,
        padding: 24, maxWidth: 360, width: "100%",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div style={{ color: "#F5A623", fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: "'Dela Gothic One', sans-serif" }}>
          {mode === "buy" ? "BUY" : "SELL"} {commodity.name}
        </div>
        <div style={{ color: "#666", fontSize: 12, marginBottom: 16 }}>
          Price: {fmt(price)} per {commodity.unit.slice(0, -1)} &nbsp;|&nbsp; Max: {max}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="number" min="0" max={max} value={qty}
            onChange={e => setQty(e.target.value)} placeholder="Qty" autoFocus
            style={{
              flex: 1, padding: "10px 12px", fontSize: 18, fontWeight: 700,
              background: "#0a0a0a", border: "1px solid #333", borderRadius: 6,
              color: "#F5A623", fontFamily: "'IBM Plex Mono', monospace", outline: "none",
            }} />
          <button onClick={() => setQty(String(max))} style={{
            padding: "10px 14px", background: "#1a1207", border: "1px solid #F5A623",
            color: "#F5A623", borderRadius: 6, cursor: "pointer", fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
          }}>MAX</button>
        </div>
        {(parseInt(qty) || 0) > 0 && (
          <div style={{ color: "#888", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
            Total: <span style={{ color: mode === "buy" ? "#ff6b6b" : "#51cf66", fontWeight: 700 }}>
              {mode === "buy" ? "-" : "+"}{fmt(total)}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 12, background: "none", border: "1px solid #333",
            color: "#888", borderRadius: 6, cursor: "pointer", fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>CANCEL</button>
          <button onClick={() => valid && onConfirm(parseInt(qty))} disabled={!valid} style={{
            flex: 1, padding: 12,
            background: valid ? (mode === "buy" ? "#1a3a1a" : "#3a1a1a") : "#1a1a1a",
            border: `1px solid ${valid ? (mode === "buy" ? "#51cf66" : "#ff6b6b") : "#333"}`,
            color: valid ? (mode === "buy" ? "#51cf66" : "#ff6b6b") : "#555",
            borderRadius: 6, cursor: valid ? "pointer" : "default", fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>CONFIRM</button>
        </div>
      </div>
    </div>
  );
}

function GameOverScreen({ cash, inventory, prices, debt, day, diff, prestige, baseDiff, onRestart, onPrestige }) {
  const nw = getNetWorth(cash, inventory, prices, debt);
  const { title, color } = getTitle(nw);
  const invValue = Object.entries(inventory).reduce((s, [id, q]) => s + (prices[id] || 0) * q, 0);
  const hsKey = `mineral-wars-hs-${diff.id}`;
  const modeHS = (() => { try { return parseInt(localStorage.getItem(hsKey)) || 0; } catch { return 0; } })();
  const isNewHigh = nw > modeHS;
  const threshold = PRESTIGE_THRESHOLD * (prestige + 1);
  const canPrestigeEnd = nw >= threshold && debt === 0;
  const bonus = Math.floor(nw * PRESTIGE_CARRYOVER);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0a0a", fontFamily: "'IBM Plex Mono', monospace", color: "#e8e0d4",
      padding: 24, textAlign: "center",
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: diff.color, letterSpacing: 2 }}>
          {diff.emoji} {baseDiff.name.toUpperCase()}
        </span>
        {prestige > 0 && (
          <span style={{ fontSize: 12, color: "#FFD700", letterSpacing: 2 }}>
            {getPrestigeName(prestige)}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 14, color: "#555", letterSpacing: 4, textTransform: "uppercase",
        marginBottom: 8,
      }}>GAME OVER — DAY {day}</div>
      {isNewHigh && nw > 0 && (
        <div style={{
          fontSize: 12, color: "#51cf66", letterSpacing: 3, marginBottom: 8,
          animation: "pulse 1s infinite",
        }}>★ NEW HIGH SCORE ★</div>
      )}
      <div style={{
        fontSize: 44, fontWeight: 900, color, marginBottom: 4,
        fontFamily: "'Dela Gothic One', sans-serif",
        textShadow: `0 4px 30px ${color}44`,
      }}>{title}</div>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>
        Your final rank in the oil patch
      </div>
      <div style={{
        background: "#111", border: "1px solid #222", borderRadius: 12,
        padding: 24, width: "100%", maxWidth: 340, textAlign: "left",
        display: "flex", flexDirection: "column", gap: 10, fontSize: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#888" }}>Cash</span>
          <span style={{ color: "#51cf66" }}>{fmt(cash)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#888" }}>Inventory Value</span>
          <span style={{ color: "#F5A623" }}>{fmt(invValue)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#888" }}>Debt</span>
          <span style={{ color: "#ff6b6b" }}>-{fmt(debt)}</span>
        </div>
        <div style={{ borderTop: "1px solid #333", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#e8e0d4", fontWeight: 700 }}>Net Worth</span>
          <span style={{ color: nw >= 0 ? "#F5A623" : "#ff4444", fontWeight: 900, fontSize: 18 }}>{fmt(nw)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 32, width: "100%", maxWidth: 340 }}>
        {canPrestigeEnd && (
          <button onClick={onPrestige} style={{
            padding: "16px 40px", fontSize: 16, fontWeight: 900,
            fontFamily: "'Dela Gothic One', sans-serif",
            background: "linear-gradient(135deg, #332800, #1a1207)",
            border: "2px solid #FFD700", color: "#FFD700",
            borderRadius: 8, cursor: "pointer",
            letterSpacing: 1, textTransform: "uppercase",
            animation: "pulse 2s infinite",
          }}>🏆 PRESTIGE → {getPrestigeName(prestige + 1)} (+{fmt(bonus)})</button>
        )}
        <button onClick={onRestart} style={{
          padding: "16px 40px", fontSize: 16, fontWeight: 900,
          fontFamily: "'Dela Gothic One', sans-serif", background: "#F5A623",
          color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer",
          letterSpacing: 1, textTransform: "uppercase",
        }}>PLAY AGAIN</button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN GAME
// ============================================================
export default function MineralWars() {
  const [screen, setScreen] = useState("title"); // title | difficulty | game | gameover
  const [diff, setDiff] = useState(DIFFICULTIES.bootstrap);
  const [baseDiff, setBaseDiff] = useState(DIFFICULTIES.bootstrap); // original before prestige
  const [prestige, setPrestige] = useState(0);
  const [day, setDay] = useState(1);
  const [cash, setCash] = useState(5000);
  const [debt, setDebt] = useState(8000);
  const [location, setLocation] = useState("midland");
  const [inventory, setInventory] = useState({});
  const [capacity, setCapacity] = useState(80);
  const [prices, setPrices] = useState(() => generatePrices("midland", null, DIFFICULTIES.bootstrap));
  const [prevPrices, setPrevPrices] = useState(null);
  const [eventMsg, setEventMsg] = useState(null);
  const [trade, setTrade] = useState(null);
  const [tab, setTab] = useState("market");
  const [message, setMessage] = useState(null);
  const [priceHistory, setPriceHistory] = useState({});
  const [costBasis, setCostBasis] = useState({}); // { commodityId: { qty, totalCost } }

  const usedCapacity = Object.values(inventory).reduce((s, q) => s + q, 0);
  const netWorth = getNetWorth(cash, inventory, prices, debt);
  const loc = LOCATIONS.find(l => l.id === location);

  const flash = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }, []);

  const advanceDay = useCallback((newLoc, isLayLow = false) => {
    const nextDay = day + 1;

    setPriceHistory(h => ({ ...h, [location]: { ...prices } }));

    if (nextDay > diff.days) {
      const nw = getNetWorth(cash, inventory, prices, debt);
      const hsKey = `mineral-wars-hs-${diff.id}`;
      try {
        const prev = parseInt(localStorage.getItem(hsKey)) || 0;
        if (nw > prev) localStorage.setItem(hsKey, String(Math.floor(nw)));
      } catch {}
      setScreen("gameover");
      try { localStorage.removeItem("mineral-wars-save"); } catch {}
      return;
    }

    // Track cash locally so event logic uses accurate values
    let nextCash = cash;
    let nextDebt = Math.floor(debt * (1 + diff.interest));
    let nextInventory = inventory;

    // Fuel cost
    if (!isLayLow) nextCash = Math.max(0, nextCash - diff.travelCost);

    setDay(nextDay);

    let newPrices = generatePrices(newLoc || location, prices, diff);

    // Event chance: traveling is riskier than laying low
    const eventRoll = Math.random();
    const eventThreshold = isLayLow ? diff.eventChance * 0.5 : diff.eventChance;

    if (eventRoll < eventThreshold) {
      let events = buildEvents(diff);

      // When laying low, remove road-specific events (confiscate/travel costs)
      // but keep price events, small costs, and cash events
      if (isLayLow) {
        events = events.filter(e => e.effect !== "confiscate");
        // Reduce cost event weights when staying put
        events = events.map(e => e.effect === "cost" ? { ...e, weight: Math.max(0.5, e.weight * 0.4) } : e);
      }

      const ev = weightedPick(events);
      const locName = LOCATIONS.find(l => l.id === (newLoc || location))?.name || "town";

      if (ev.effect === "cash") {
        const amt = Math.floor((ev.baseAmount || 500) * diff.cashMult);
        if (amt > 0) {
          nextCash += amt;
          setEventMsg({
            text: ev.text.replace("{location}", locName).replace("${amount}", fmt(amt)),
            type: "good",
            detail: `+${fmt(amt)} cash`,
          });
        }
      } else if (ev.effect === "cost") {
        const amt = Math.floor((ev.baseAmount || 1500) * diff.costMult * (isLayLow ? 0.6 : 1));
        const shortfall = Math.max(0, amt - nextCash);
        nextCash = Math.max(0, nextCash - amt);
        if (shortfall > 0) nextDebt += shortfall;
        setEventMsg({
          text: ev.text.replace("{location}", locName).replace("${amount}", fmt(amt)),
          type: "bad",
          detail: shortfall > 0
            ? `-${fmt(amt)} (${fmt(shortfall)} added to debt)`
            : `-${fmt(amt)} cash`,
        });
      } else if (ev.effect === "confiscate") {
        const pct = ev.pct * diff.confiscateMult;
        const { newInv, losses } = confiscateCargo(nextInventory, pct);
        if (losses.length > 0) {
          nextInventory = newInv;
          setCostBasis(cb => {
            const newCb = { ...cb };
            losses.forEach(l => {
              const c = COMMODITIES.find(x => x.name === l.name);
              if (c && newCb[c.id]) {
                const prev = newCb[c.id];
                const remaining = prev.qty - l.qty;
                if (remaining <= 0) { delete newCb[c.id]; }
                else {
                  const ratio = l.qty / prev.qty;
                  newCb[c.id] = { qty: remaining, totalCost: Math.floor(prev.totalCost * (1 - ratio)) };
                }
              }
            });
            return newCb;
          });
          const lossText = losses.map(l => `${l.qty} ${l.name}`).join(", ");
          setEventMsg({
            text: ev.text.replace("{location}", locName),
            type: "bad",
            detail: `Lost: ${lossText}`,
          });
        } else {
          flash("Quiet day. Nothing happened.");
        }
      } else if (ev.effect === "crash") {
        newPrices = applyEvent(ev, newPrices, diff);
        const cName = COMMODITIES.find(x => x.id === ev.commodity)?.name || "";
        setEventMsg({
          text: ev.text.replace("{location}", locName),
          type: "bad",
          detail: `${cName} prices crashed`,
        });
      } else if (ev.effect === "spike") {
        newPrices = applyEvent(ev, newPrices, diff);
        const cName = COMMODITIES.find(x => x.id === ev.commodity)?.name || "";
        setEventMsg({
          text: ev.text.replace("{location}", locName),
          type: "good",
          detail: `${cName} prices spiking`,
        });
      } else if (ev.effect === "none") {
        // Neutral: small flash, not a full-screen modal
        flash(ev.text.replace("{location}", locName));
      }
    }

    // Apply all state at once
    const nextLocation = newLoc || location;
    setCash(nextCash);
    setDebt(nextDebt);
    setInventory(nextInventory);
    setPrevPrices(prices);
    setPrices(newPrices);

    // Auto-save
    try {
      localStorage.setItem("mineral-wars-save", JSON.stringify({
        day: nextDay, cash: nextCash, debt: nextDebt, location: nextLocation,
        inventory: nextInventory, capacity, prices: newPrices, prevPrices: prices,
        priceHistory: { ...priceHistory, [location]: { ...prices } },
        diffId: baseDiff.id, prestige, costBasis,
      }));
    } catch {}
  }, [day, cash, inventory, prices, debt, location, diff, baseDiff, prestige, capacity, priceHistory, costBasis]);

  const travel = useCallback((destId) => {
    if (cash < diff.travelCost) {
      flash(`Need ${fmt(diff.travelCost)} for fuel. You're broke.`);
      return;
    }
    setLocation(destId);
    setTab("market");
    advanceDay(destId);
  }, [advanceDay, cash, diff, flash]);

  const layLow = useCallback(() => {
    advanceDay(null, true);
  }, [advanceDay]);

  const confirmTrade = useCallback((qty) => {
    if (!trade) return;
    const cid = trade.commodity.id;
    const price = prices[cid];
    if (trade.mode === "buy") {
      const total = price * qty;
      if (total > cash) return;
      setCash(c => c - total);
      setInventory(inv => ({ ...inv, [cid]: (inv[cid] || 0) + qty }));
      setCostBasis(cb => {
        const prev = cb[cid] || { qty: 0, totalCost: 0 };
        return { ...cb, [cid]: { qty: prev.qty + qty, totalCost: prev.totalCost + total } };
      });
      flash(`Bought ${qty} ${trade.commodity.unit} of ${trade.commodity.name}`);
    } else {
      const currentQty = inventory[cid] || 0;
      setInventory(inv => {
        const newInv = { ...inv };
        newInv[cid] = (newInv[cid] || 0) - qty;
        if (newInv[cid] <= 0) delete newInv[cid];
        return newInv;
      });
      setCostBasis(cb => {
        const prev = cb[cid] || { qty: currentQty, totalCost: 0 };
        if (qty >= prev.qty) {
          const newCb = { ...cb };
          delete newCb[cid];
          return newCb;
        }
        // Remove proportionally
        const ratio = qty / prev.qty;
        return { ...cb, [cid]: { qty: prev.qty - qty, totalCost: Math.floor(prev.totalCost * (1 - ratio)) } };
      });
      setCash(c => c + price * qty);
      flash(`Sold ${qty} ${trade.commodity.unit} of ${trade.commodity.name}`);
    }
    setTrade(null);
  }, [trade, prices, cash, inventory, flash]);

  const [confirmNewGame, setConfirmNewGame] = useState(false);

  // Reset confirm state whenever we leave the game screen
  const goToMenu = useCallback(() => {
    setConfirmNewGame(false);
    setScreen("difficulty");
  }, []);
  const canPrestige = netWorth >= PRESTIGE_THRESHOLD * (prestige + 1) && debt === 0;
  const prestigeThreshold = PRESTIGE_THRESHOLD * (prestige + 1);

  const startGame = (d, prestigeLevel = 0, bonusCash = 0) => {
    const applied = applyPrestige(d, prestigeLevel);
    setBaseDiff(d);
    setDiff(applied);
    setPrestige(prestigeLevel);
    const initPrices = generatePrices("midland", null, applied);
    setScreen("game");
    setDay(1);
    setCash(applied.cash + bonusCash);
    setDebt(applied.debt);
    setLocation("midland");
    setInventory({});
    setCapacity(applied.capacity);
    setPrices(initPrices);
    setPrevPrices(null);
    setPriceHistory({});
    setCostBasis({});
    setEventMsg(null);
    setTab("market");
    try { localStorage.removeItem("mineral-wars-save"); } catch {}
  };

  const resumeGame = () => {
    try {
      const raw = localStorage.getItem("mineral-wars-save");
      if (!raw) return false;
      const s = JSON.parse(raw);
      const base = DIFFICULTIES[s.diffId] || DIFFICULTIES.bootstrap;
      const applied = applyPrestige(base, s.prestige || 0);
      setBaseDiff(base);
      setDiff(applied);
      setPrestige(s.prestige || 0);
      setDay(s.day);
      setCash(s.cash);
      setDebt(s.debt);
      setLocation(s.location);
      setInventory(s.inventory || {});
      setCapacity(s.capacity || applied.capacity);
      setPrices(s.prices);
      setPrevPrices(s.prevPrices || null);
      setPriceHistory(s.priceHistory || {});
      setCostBasis(s.costBasis || {});
      setEventMsg(null);
      setTab("market");
      setScreen("game");
      return true;
    } catch {
      return false;
    }
  };

  const prestigeUp = useCallback(() => {
    const nw = netWorth;
    const bonus = Math.floor(nw * PRESTIGE_CARRYOVER);
    const nextPrestige = prestige + 1;
    // Save best prestige
    try {
      const bestKey = `mineral-wars-prestige-${baseDiff.id}`;
      const prev = parseInt(localStorage.getItem(bestKey)) || 0;
      if (nextPrestige > prev) localStorage.setItem(bestKey, String(nextPrestige));
    } catch {}
    startGame(baseDiff, nextPrestige, bonus);
  }, [netWorth, prestige, baseDiff]);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    @keyframes scanline { 0% { background-position: 0 0; } 100% { background-position: 0 4px; } }
    @keyframes shakeEvent { 0% { transform: translate(0); } 10% { transform: translate(-8px,4px); } 20% { transform: translate(8px,-4px); } 30% { transform: translate(-6px,2px); } 40% { transform: translate(6px,-2px); } 50% { transform: translate(-3px,1px); } 60% { transform: translate(3px,-1px); } 70%,100% { transform: translate(0); } }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #F5A623; border-radius: 2px; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type=number] { -moz-appearance: textfield; }
  `;

  const screenBg = (
    <>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,166,35,0.1) 2px, rgba(245,166,35,0.1) 4px)",
        animation: "scanline 0.3s linear infinite",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.06,
        background: "radial-gradient(ellipse at center, rgba(245,166,35,0.15) 0%, transparent 70%)",
      }} />
    </>
  );

  // ==================== TITLE SCREEN ====================
  if (screen === "title") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0a0a0a", fontFamily: "'IBM Plex Mono', monospace",
        color: "#F5A623", textAlign: "center", padding: 24,
        position: "relative", overflow: "hidden",
      }}>
        <style>{styles}</style>
        {screenBg}
        <div style={{ animation: "fadeIn 0.5s ease-out", maxWidth: 420, position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🛢️</div>
          <h1 style={{
            fontSize: "clamp(32px, 7vw, 52px)", fontWeight: 900, lineHeight: 1.1,
            fontFamily: "'Dela Gothic One', sans-serif", marginBottom: 6,
            letterSpacing: "-1px",
          }}>MINERAL WARS</h1>
          <p style={{
            fontSize: 13, letterSpacing: 5, textTransform: "uppercase",
            color: "#8B5E10", marginBottom: 36,
          }}>Permian Basin Hustle</p>
          <button onClick={() => setScreen("difficulty")} style={{
            padding: "16px 44px", fontSize: 16, fontWeight: 900,
            fontFamily: "'Dela Gothic One', sans-serif", background: "#F5A623",
            color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer",
            letterSpacing: 1, textTransform: "uppercase",
            transition: "transform 0.1s",
          }}
            onMouseDown={e => e.target.style.transform = "scale(0.95)"}
            onMouseUp={e => e.target.style.transform = "scale(1)"}
          >START THE HUSTLE</button>
        </div>
      </div>
    );
  }

  // ==================== DIFFICULTY SELECT ====================
  if (screen === "difficulty") {
    const diffs = [DIFFICULTIES.daddy, DIFFICULTIES.bootstrap, DIFFICULTIES.crash];
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0a0a0a", fontFamily: "'IBM Plex Mono', monospace",
        color: "#e8e0d4", padding: 24,
        position: "relative", overflow: "hidden",
      }}>
        <style>{styles}</style>
        {screenBg}
        <div style={{ maxWidth: 440, width: "100%", position: "relative", zIndex: 1 }}>
          <button onClick={() => setScreen("title")} style={{
            background: "none", border: "none", color: "#555", cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, marginBottom: 16,
            padding: 0,
          }}>← BACK</button>

          <div style={{
            fontSize: 11, color: "#8B5E10", letterSpacing: 4, textTransform: "uppercase",
            marginBottom: 6,
          }}>CHOOSE YOUR ERA</div>
          <div style={{
            fontSize: 24, fontWeight: 900, fontFamily: "'Dela Gothic One', sans-serif",
            color: "#F5A623", marginBottom: 24,
          }}>Select Difficulty</div>

          {/* Resume saved game */}
          {(() => {
            try {
              const raw = localStorage.getItem("mineral-wars-save");
              if (!raw) return null;
              const s = JSON.parse(raw);
              const base = DIFFICULTIES[s.diffId];
              if (!base) return null;
              return (
                <button onClick={resumeGame} style={{
                  background: "linear-gradient(135deg, #1a1207, #111)",
                  border: "1px solid #F5A623",
                  borderRadius: 12, padding: "16px 20px", cursor: "pointer",
                  textAlign: "left", width: "100%", marginBottom: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: "all 0.2s",
                  animation: "fadeIn 0.3s ease-out",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#FFD700"; e.currentTarget.style.background = "linear-gradient(135deg, #2a1f0a, #111)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#F5A623"; e.currentTarget.style.background = "linear-gradient(135deg, #1a1207, #111)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#F5A623", fontFamily: "'Dela Gothic One', sans-serif" }}>
                        ▶ CONTINUE
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                        {base.emoji} {base.name}
                        {s.prestige > 0 && <span style={{ color: "#FFD700" }}> {getPrestigeName(s.prestige)}</span>}
                        {" "}— Day {s.day}, {fmt(s.cash)} cash
                      </div>
                    </div>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      try { localStorage.removeItem("mineral-wars-save"); } catch {}
                      setMessage("Save deleted");
                      setTimeout(() => setMessage(null), 2000);
                      // Force re-render of this screen
                      setScreen("title");
                      setTimeout(() => setScreen("difficulty"), 10);
                    }} style={{
                      background: "none", border: "1px solid #331a1a", color: "#884444",
                      borderRadius: 4, padding: "4px 8px", cursor: "pointer",
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 1,
                    }}>DELETE</button>
                  </div>
                </button>
              );
            } catch { return null; }
          })()}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {diffs.map((d, i) => {
              const hsKey = `mineral-wars-hs-${d.id}`;
              const hs = (() => { try { return parseInt(localStorage.getItem(hsKey)) || 0; } catch { return 0; } })();
              const bestPrestige = (() => { try { return parseInt(localStorage.getItem(`mineral-wars-prestige-${d.id}`)) || 0; } catch { return 0; } })();
              return (
                <button key={d.id} onClick={() => startGame(d)} style={{
                  background: "#111", border: `1px solid ${d.color}22`,
                  borderRadius: 12, padding: 20, cursor: "pointer",
                  textAlign: "left", width: "100%",
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: "all 0.2s",
                  animation: `fadeIn 0.3s ease-out ${i * 0.1}s both`,
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = d.color;
                    e.currentTarget.style.background = `${d.color}08`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = `${d.color}22`;
                    e.currentTarget.style.background = "#111";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{d.emoji}</span>
                    <div>
                      <div style={{
                        fontSize: 18, fontWeight: 900, color: d.color,
                        fontFamily: "'Dela Gothic One', sans-serif",
                      }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "#666", letterSpacing: 2 }}>{d.tagline.toUpperCase()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#999", lineHeight: 1.6, marginBottom: 10 }}>
                    {d.desc}
                  </div>
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "6px 16px",
                    fontSize: 11, color: "#666",
                  }}>
                    <span>Cash: <span style={{ color: "#51cf66" }}>{fmt(d.cash)}</span></span>
                    <span>Debt: <span style={{ color: "#ff6b6b" }}>{fmt(d.debt)}</span></span>
                    <span>Interest: <span style={{ color: "#ff6b6b" }}>{(d.interest * 100).toFixed(0)}%/day</span></span>
                    <span>Days: <span style={{ color: "#F5A623" }}>{d.days}</span></span>
                    <span>Cargo: <span style={{ color: "#F5A623" }}>{d.capacity}</span></span>
                    <span>Fuel: <span style={{ color: "#F5A623" }}>{fmt(d.travelCost)}</span></span>
                    <span>Broker fee: <span style={{ color: "#ff6b6b" }}>{(d.brokerFee * 100).toFixed(0)}%</span></span>
                  </div>
                  {(hs > 0 || bestPrestige > 0) && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#555", display: "flex", gap: 12 }}>
                      {hs > 0 && <span>Best: <span style={{ color: d.color }}>{fmt(hs)}</span></span>}
                      {bestPrestige > 0 && <span>Prestige: <span style={{ color: "#FFD700" }}>{getPrestigeName(bestPrestige)}</span></span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== GAME OVER ====================
  if (screen === "gameover") {
    return (
      <>
        <style>{styles}</style>
        <GameOverScreen cash={cash} inventory={inventory} prices={prices} debt={debt}
          day={day} diff={diff} baseDiff={baseDiff} prestige={prestige}
          onRestart={() => setScreen("difficulty")}
          onPrestige={prestigeUp} />
      </>
    );
  }

  // ==================== MAIN GAME ====================
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      fontFamily: "'IBM Plex Mono', monospace", color: "#e8e0d4",
      position: "relative",
    }}>
      <style>{styles}</style>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03, zIndex: 9000,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,166,35,0.08) 2px, rgba(245,166,35,0.08) 4px)",
      }} />

      {trade && (
        <TradeModal
          commodity={trade.commodity}
          price={prices[trade.commodity.id]}
          cash={cash}
          inventoryQty={inventory[trade.commodity.id] || 0}
          capacity={capacity}
          usedCapacity={usedCapacity}
          mode={trade.mode}
          onConfirm={confirmTrade}
          onClose={() => setTrade(null)}
        />
      )}

      {eventMsg && (
        <div onClick={() => setEventMsg(null)} style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: eventMsg.type === "bad" ? "rgba(40,0,0,0.92)" :
                      eventMsg.type === "good" ? "rgba(0,30,10,0.92)" :
                      "rgba(0,0,0,0.90)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 32, cursor: "pointer",
          animation: eventMsg.type === "bad" ? "shakeEvent 0.4s ease-out" : "fadeIn 0.3s ease-out",
        }}>
          <div style={{
            fontSize: 64, marginBottom: 16,
            animation: "pulse 1.5s infinite",
          }}>{
            eventMsg.type === "bad" ? "⚠️" :
            eventMsg.type === "good" ? "🎉" : "📻"
          }</div>
          <div style={{
            fontSize: 11, letterSpacing: 4, textTransform: "uppercase",
            color: eventMsg.type === "bad" ? "#ff6b6b" :
                   eventMsg.type === "good" ? "#51cf66" : "#888",
            marginBottom: 12,
          }}>{
            eventMsg.type === "bad" ? "BAD NEWS" :
            eventMsg.type === "good" ? "GOOD NEWS" : "ON THE ROAD"
          }</div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: "#e8e0d4",
            textAlign: "center", lineHeight: 1.5,
            maxWidth: 380, marginBottom: 16,
            fontFamily: "'Dela Gothic One', sans-serif",
          }}>{eventMsg.text}</div>
          {eventMsg.detail && (
            <div style={{
              fontSize: 16, fontWeight: 700, textAlign: "center",
              padding: "10px 24px", borderRadius: 8,
              background: eventMsg.type === "bad" ? "rgba(255,107,107,0.15)" : "rgba(81,207,102,0.15)",
              border: `1px solid ${eventMsg.type === "bad" ? "#ff6b6b44" : "#51cf6644"}`,
              color: eventMsg.type === "bad" ? "#ff6b6b" : "#51cf66",
              fontFamily: "'IBM Plex Mono', monospace",
            }}>{eventMsg.detail}</div>
          )}
          <div style={{
            marginTop: 32, fontSize: 12, color: "#555",
            letterSpacing: 2, animation: "pulse 2s infinite",
          }}>TAP ANYWHERE TO CONTINUE</div>
        </div>
      )}

      {message && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
          padding: "10px 20px", fontSize: 13, color: "#e8e0d4", zIndex: 1500,
          animation: "fadeIn 0.2s ease-out", whiteSpace: "nowrap",
        }}>{message}</div>
      )}

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 12px 90px" }}>
        {/* Top Bar */}
        <div style={{
          position: "sticky", top: 0, background: "#0a0a0a", zIndex: 100,
          borderBottom: "1px solid #1a1a1a",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 0 0",
          }}>
            {confirmNewGame ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#884444" }}>Are you sure?</span>
                <button onClick={goToMenu} style={{
                  background: "none", border: "1px solid #ff6b6b", color: "#ff6b6b", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1,
                  padding: "2px 8px", borderRadius: 3,
                }}>YES</button>
                <button onClick={() => setConfirmNewGame(false)} style={{
                  background: "none", border: "1px solid #333", color: "#555", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1,
                  padding: "2px 8px", borderRadius: 3,
                }}>NO</button>
              </div>
            ) : (
              <button onClick={() => setConfirmNewGame(true)} style={{
                background: "none", border: "none", color: "#444", cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1,
                padding: "2px 0",
              }}>NEW GAME</button>
            )}
            {prestige > 0 && (
              <span style={{ fontSize: 10, color: "#FFD700", letterSpacing: 1, fontWeight: 700 }}>
                {baseDiff.name.toUpperCase()} {getPrestigeName(prestige)}
              </span>
            )}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            padding: "8px 0 12px",
            fontSize: 11, textAlign: "center",
          }}>
          <div>
            <div style={{ color: "#555", letterSpacing: 2 }}>DAY</div>
            <div style={{ color: day > diff.days - 5 ? "#ff6b6b" : "#F5A623", fontSize: 20, fontWeight: 700, fontFamily: "'Dela Gothic One', sans-serif" }}>
              {day}<span style={{ color: "#555", fontSize: 12 }}>/{diff.days}</span>
            </div>
          </div>
          <div>
            <div style={{ color: "#555", letterSpacing: 2 }}>CASH</div>
            <div style={{ color: "#51cf66", fontSize: 16, fontWeight: 700 }}>{fmt(cash)}</div>
          </div>
          <div>
            <div style={{ color: "#555", letterSpacing: 2 }}>DEBT</div>
            <div style={{ color: "#ff6b6b", fontSize: 16, fontWeight: 700 }}>{fmt(debt)}</div>
          </div>
          </div>
        </div>

        {/* Difficulty badge + location */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 0 10px",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Dela Gothic One', sans-serif", color: "#F5A623" }}>
                {loc.vibe} {loc.name}
              </div>
              <span style={{
                fontSize: 9, color: diff.color, border: `1px solid ${diff.color}44`,
                borderRadius: 4, padding: "2px 6px", letterSpacing: 1, fontWeight: 700,
              }}>{diff.tagline.toUpperCase()}</span>
              {prestige > 0 && (
                <span style={{
                  fontSize: 9, color: "#FFD700", border: "1px solid #FFD70044",
                  borderRadius: 4, padding: "2px 6px", letterSpacing: 1, fontWeight: 700,
                }}>{getPrestigeName(prestige)}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>{loc.desc}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#555" }}>NET WORTH</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: netWorth >= 0 ? "#F5A623" : "#ff4444" }}>{fmt(netWorth)}</div>
          </div>
        </div>

        {/* Cargo bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 3 }}>
            <span>CARGO</span>
            <span>{usedCapacity}/{capacity}</span>
          </div>
          <div style={{ width: "100%", height: 4, background: "#1a1a1a", borderRadius: 2 }}>
            <div style={{
              width: `${(usedCapacity / capacity) * 100}%`, height: "100%",
              background: usedCapacity >= capacity ? "#ff6b6b" : "#F5A623",
              borderRadius: 2, transition: "width 0.3s",
            }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 14,
          borderBottom: "1px solid #222",
        }}>
          {[
            { id: "market", label: "MARKET" },
            { id: "inventory", label: `CARGO (${usedCapacity})` },
            { id: "travel", label: "TRAVEL" },
            { id: "bank", label: "BANK" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 0", background: "none", border: "none",
              borderBottom: tab === t.id ? "2px solid #F5A623" : "2px solid transparent",
              color: tab === t.id ? "#F5A623" : "#555",
              cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, fontWeight: 600, letterSpacing: 1,
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* MARKET TAB */}
        {tab === "market" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeIn 0.2s ease-out" }}>
            {COMMODITIES.map(c => {
              const price = prices[c.id];
              const lastHere = priceHistory[location] ? priceHistory[location][c.id] : null;
              const owned = inventory[c.id] || 0;
              const canBuy = cash >= price && usedCapacity < capacity;
              const pctChange = lastHere ? ((price - lastHere) / lastHere * 100) : null;
              const basis = costBasis[c.id];
              const avgCost = (basis && basis.qty > 0) ? basis.totalCost / basis.qty : null;

              return (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#111", border: "1px solid #1a1a1a",
                  borderRadius: 8, padding: "10px 12px",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#e8e0d4" }}>{c.name}</span>
                      {owned > 0 && <span style={{ fontSize: 11, color: "#F5A623" }}>×{owned}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#F5A623" }}>{fmt(price)}</span>
                      {pctChange !== null && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: pctChange > 0 ? "#51cf66" : pctChange < 0 ? "#ff6b6b" : "#555",
                        }}>
                          {pctChange > 0 ? "▲" : pctChange < 0 ? "▼" : "–"}{Math.abs(pctChange).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#444", display: "flex", flexWrap: "wrap", gap: "0 10px" }}>
                      <span>per {c.unit.slice(0, -1)}</span>
                      {lastHere && <span>last here: {fmt(lastHere)}</span>}
                      {owned > 0 && avgCost && (
                        <span style={{ color: price >= avgCost ? "#51cf66" : "#ff6b6b" }}>
                          avg paid: {fmt(avgCost)} ({price >= avgCost ? "+" : ""}{((price - avgCost) / avgCost * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => canBuy && setTrade({ commodity: c, mode: "buy" })} disabled={!canBuy}
                      style={{
                        padding: "8px 14px", fontSize: 12, fontWeight: 700,
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: canBuy ? "#0a1a0a" : "#111",
                        border: `1px solid ${canBuy ? "#51cf66" : "#222"}`,
                        color: canBuy ? "#51cf66" : "#333",
                        borderRadius: 6, cursor: canBuy ? "pointer" : "default",
                      }}>BUY</button>
                    <button onClick={() => owned > 0 && setTrade({ commodity: c, mode: "sell" })} disabled={owned === 0}
                      style={{
                        padding: "8px 14px", fontSize: 12, fontWeight: 700,
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: owned > 0 ? "#1a0a0a" : "#111",
                        border: `1px solid ${owned > 0 ? "#ff6b6b" : "#222"}`,
                        color: owned > 0 ? "#ff6b6b" : "#333",
                        borderRadius: 6, cursor: owned > 0 ? "pointer" : "default",
                      }}>SELL</button>
                  </div>
                </div>
              );
            })}
            <button onClick={layLow} style={{
              width: "100%", padding: "12px 0", marginTop: 8,
              background: "none", border: "1px dashed #333",
              borderRadius: 8, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, fontWeight: 600, color: "#666",
              letterSpacing: 1, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#F5A623"; e.currentTarget.style.color = "#F5A623"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#666"; }}
            >🌙 LAY LOW — skip a day, no fuel cost</button>
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === "inventory" && (
          <div style={{ animation: "fadeIn 0.2s ease-out" }}>
            {usedCapacity === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#555", fontSize: 13 }}>
                Your truck is empty. Hit the market.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {COMMODITIES.filter(c => (inventory[c.id] || 0) > 0).map(c => {
                  const qty = inventory[c.id];
                  const value = prices[c.id] * qty;
                  const basis = costBasis[c.id];
                  const avgCost = (basis && basis.qty > 0) ? basis.totalCost / basis.qty : null;
                  const totalCost = basis ? basis.totalCost : 0;
                  const pnl = value - totalCost;
                  return (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#111", border: "1px solid #1a1a1a",
                      borderRadius: 8, padding: "12px 14px",
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                          {qty} {c.unit} @ {fmt(prices[c.id])} ea
                        </div>
                        {avgCost && (
                          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                            avg paid: {fmt(avgCost)} &nbsp;|&nbsp;
                            <span style={{ color: pnl >= 0 ? "#51cf66" : "#ff6b6b", fontWeight: 600 }}>
                              P&L: {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#F5A623" }}>{fmt(value)}</div>
                        <button onClick={() => setTrade({ commodity: c, mode: "sell" })} style={{
                          marginTop: 4, padding: "4px 12px", fontSize: 11, fontWeight: 700,
                          fontFamily: "'IBM Plex Mono', monospace",
                          background: "#1a0a0a", border: "1px solid #ff6b6b",
                          color: "#ff6b6b", borderRadius: 4, cursor: "pointer",
                        }}>SELL</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TRAVEL TAB */}
        {tab === "travel" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeIn 0.2s ease-out" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              Each trip costs <span style={{ color: "#F5A623" }}>{fmt(diff.travelCost)}</span> fuel + 1 day. Debt grows {(diff.interest * 100).toFixed(0)}%/day.
              {cash < diff.travelCost && <span style={{ color: "#ff6b6b" }}> You can't afford fuel.</span>}
            </div>
            {LOCATIONS.filter(l => l.id !== location).map(l => (
              <button key={l.id} onClick={() => travel(l.id)}
                disabled={cash < diff.travelCost}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#111", border: "1px solid #1a1a1a",
                  borderRadius: 8, padding: "14px 16px",
                  cursor: cash >= diff.travelCost ? "pointer" : "default",
                  opacity: cash >= diff.travelCost ? 1 : 0.4,
                  textAlign: "left", width: "100%",
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => { if (cash >= diff.travelCost) e.currentTarget.style.borderColor = "#F5A623"; }}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a1a"}
              >
                <div style={{ fontSize: 28 }}>{l.vibe}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#e8e0d4" }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{l.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* BANK TAB */}
        {tab === "bank" && (
          <div style={{ animation: "fadeIn 0.2s ease-out" }}>
            <div style={{
              background: "#111", border: "1px solid #1a1a1a", borderRadius: 8,
              padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 8 }}>OUTSTANDING DEBT</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#ff6b6b", fontFamily: "'Dela Gothic One', sans-serif" }}>{fmt(debt)}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Interest: {(diff.interest * 100).toFixed(0)}% per day (compounding)</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                Day {diff.days} projection: <span style={{ color: "#ff6b6b" }}>{fmt(debt * Math.pow(1 + diff.interest, diff.days - day))}</span>
              </div>
              {debt > 0 && cash > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  {[1000, 5000].map(amt => (
                    <button key={amt} onClick={() => {
                      const pay = Math.min(cash, debt, amt);
                      setCash(c => c - pay); setDebt(d => d - pay);
                      flash(`Paid ${fmt(pay)} toward debt`);
                    }} style={{
                      flex: 1, padding: 12, background: "#1a0a0a", border: "1px solid #ff6b6b",
                      color: "#ff6b6b", borderRadius: 6, cursor: "pointer", fontWeight: 700,
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                    }}>PAY {fmt(amt)}</button>
                  ))}
                  <button onClick={() => {
                    const pay = Math.min(cash, debt);
                    setCash(c => c - pay); setDebt(d => d - pay);
                    flash(`Paid ${fmt(pay)} toward debt`);
                  }} style={{
                    flex: 1, padding: 12, background: "#1a0a0a", border: "1px solid #ff6b6b",
                    color: "#ff6b6b", borderRadius: 6, cursor: "pointer", fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                  }}>PAY ALL</button>
                </div>
              )}
              {debt === 0 && (
                <div style={{ marginTop: 12, color: "#51cf66", fontWeight: 700 }}>
                  {diff.id === "daddy" ? "DEBT FREE. Dad's proud. Kind of." :
                   diff.id === "crash" ? "DEBT FREE. Against all odds." :
                   "DEBT FREE. Bryce's not happy, but you're free."} 🤝
                </div>
              )}
            </div>

            <div style={{
              background: "#111", border: "1px solid #1a1a1a", borderRadius: 8,
              padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 8 }}>BORROW FROM BRYCE</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                Broker fee: <span style={{ color: "#ff6b6b", fontWeight: 700 }}>{(diff.brokerFee * 100).toFixed(0)}%</span>
                &nbsp;— you get the rest, owe the full amount.
              </div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 12 }}>
                Debt cap: <span style={{ color: "#ff6b6b" }}>{fmt(diff.maxDebt)}</span>
                {debt >= diff.maxDebt && <span style={{ color: "#ff6b6b", fontWeight: 700 }}> — MAXED OUT</span>}
              </div>
              {debt < diff.maxDebt ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[2000, 5000, 10000].map(amt => {
                    const canBorrow = debt + amt <= diff.maxDebt;
                    const actualAmt = canBorrow ? amt : Math.max(0, diff.maxDebt - debt);
                    const payout = Math.floor(actualAmt * (1 - diff.brokerFee));
                    const show = actualAmt >= 500;
                    if (!show) return null;
                    return (
                      <button key={amt} onClick={() => {
                        const borrowAmt = canBorrow ? amt : actualAmt;
                        const cash_received = Math.floor(borrowAmt * (1 - diff.brokerFee));
                        setCash(c => c + cash_received);
                        setDebt(d => d + borrowAmt);
                        flash(`Borrowed ${fmt(borrowAmt)} — received ${fmt(cash_received)} after Bryce's cut`);
                      }} style={{
                        flex: 1, minWidth: 80, padding: 12,
                        background: "#0a0a1a",
                        border: "1px solid #6b8aff",
                        color: "#6b8aff", borderRadius: 6, cursor: "pointer", fontWeight: 700,
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                        textAlign: "center",
                      }}>
                        <div>{fmt(canBorrow ? amt : actualAmt)}</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                          get {fmt(canBorrow ? Math.floor(amt * (1 - diff.brokerFee)) : payout)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#ff6b6b", fontSize: 13, fontWeight: 700 }}>
                  Bryce says you're cut off. 🚫
                </div>
              )}
            </div>

            {/* PRESTIGE */}
            <div style={{
              background: canPrestige ? "linear-gradient(135deg, #1a1207, #111)" : "#111",
              border: `1px solid ${canPrestige ? "#FFD700" : "#1a1a1a"}`,
              borderRadius: 8, padding: 20, marginBottom: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: canPrestige ? "#FFD700" : "#555", letterSpacing: 2 }}>
                  CASH OUT & PRESTIGE
                </div>
                {prestige > 0 && (
                  <span style={{
                    fontSize: 10, color: "#FFD700", border: "1px solid #FFD70044",
                    borderRadius: 4, padding: "1px 6px", fontWeight: 700,
                  }}>LVL {prestige}</span>
                )}
              </div>
              {canPrestige ? (
                <>
                  <div style={{ fontSize: 13, color: "#e8e0d4", lineHeight: 1.6, marginBottom: 12 }}>
                    You're debt-free with <span style={{ color: "#FFD700", fontWeight: 700 }}>{fmt(netWorth)}</span> net worth.
                    Cash out, level up, and restart as <span style={{ color: "#FFD700", fontWeight: 700 }}>
                    Mineral Wars {getPrestigeName(prestige + 1)}</span>.
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
                    Carry over <span style={{ color: "#51cf66" }}>{fmt(Math.floor(netWorth * PRESTIGE_CARRYOVER))}</span> bonus cash.
                    Higher prices, wilder markets, meaner roads.
                  </div>
                  <button onClick={prestigeUp} style={{
                    width: "100%", padding: 14,
                    background: "linear-gradient(135deg, #332800, #1a1207)",
                    border: "2px solid #FFD700", color: "#FFD700",
                    borderRadius: 8, cursor: "pointer", fontWeight: 900,
                    fontFamily: "'Dela Gothic One', sans-serif", fontSize: 14,
                    letterSpacing: 1,
                    animation: "pulse 2s infinite",
                  }}>🏆 PRESTIGE UP → {getPrestigeName(prestige + 1)}</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                    {debt > 0
                      ? <>Pay off all debt and reach <span style={{ color: "#FFD700" }}>{fmt(prestigeThreshold)}</span> net worth to prestige.</>
                      : <>Reach <span style={{ color: "#FFD700" }}>{fmt(prestigeThreshold)}</span> net worth to prestige.</>
                    }
                  </div>
                  <div style={{ width: "100%", height: 6, background: "#1a1a1a", borderRadius: 3 }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, netWorth / prestigeThreshold * 100))}%`,
                      height: "100%", background: "linear-gradient(90deg, #8B5E10, #FFD700)",
                      borderRadius: 3, transition: "width 0.3s",
                    }} />
                  </div>
                </>
              )}
            </div>

            <div style={{
              background: "#111", border: "1px solid #1a1a1a", borderRadius: 8,
              padding: 20,
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 8 }}>UPGRADE TRUCK</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
                Current capacity: <span style={{ color: "#F5A623", fontWeight: 700 }}>{capacity} units</span>
              </div>
              {capacity < 300 ? (() => {
                const upgradeCost = Math.floor(1500 * Math.pow(1.8, (capacity - diff.capacity) / 40));
                return (
                  <>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                      +40 capacity for <span style={{ color: "#F5A623" }}>{fmt(upgradeCost)}</span>
                    </div>
                    <button onClick={() => {
                      if (cash >= upgradeCost) {
                        setCash(c => c - upgradeCost);
                        setCapacity(cap => cap + 40);
                        flash("Truck upgraded! +40 capacity");
                      }
                    }} disabled={cash < upgradeCost} style={{
                      padding: "10px 20px", background: cash >= upgradeCost ? "#1a1207" : "#111",
                      border: `1px solid ${cash >= upgradeCost ? "#F5A623" : "#222"}`,
                      color: cash >= upgradeCost ? "#F5A623" : "#333",
                      borderRadius: 6, cursor: cash >= upgradeCost ? "pointer" : "default",
                      fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                    }}>UPGRADE</button>
                  </>
                );
              })() : (
                <div style={{ color: "#F5A623", fontWeight: 700 }}>MAX CAPACITY. That's a big truck. 🛻</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
