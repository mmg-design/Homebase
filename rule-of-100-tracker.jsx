import { useState, useEffect, useRef, useCallback } from "react";

const SK_STREAK = "r100-streak";
const SK_LAST = "r100-last-date";
const SK_TODAY = "r100-today";

function getTodayStr() {
  // Use Eastern Time so the day resets at midnight ET, not midnight UTC
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

const icons = {
  email: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  linkedin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  comment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  text: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  referral: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  call: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.4 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.16 6.16l1.13-1.13a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  meeting: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <line x1="19" y1="11" x2="19" y2="17"/>
      <line x1="22" y1="14" x2="16" y2="14"/>
    </svg>
  ),
  play: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  pause: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  ),
  undo: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/>
      <path d="M3 13C5 8 9.5 5 15 5a9 9 0 0 1 0 18c-4 0-7.5-2-9.5-5"/>
    </svg>
  ),
};

function TapButton({ icon, label, count, onTap, color }) {
  const [flash, setFlash] = useState(false);
  const handle = (e) => {
    onTap(e.clientX, e.clientY);
    setFlash(true);
    setTimeout(() => setFlash(false), 130);
  };
  return (
    <button onClick={handle} style={{
      background: flash ? `${color}12` : "#ffffff",
      border: `1px solid ${flash ? color + "80" : "#e8edf2"}`,
      borderRadius: 12,
      padding: "16px 4px",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 7,
      cursor: "pointer",
      transition: "background 0.1s, border-color 0.1s, transform 0.1s, box-shadow 0.1s",
      transform: flash ? "scale(0.95)" : "scale(1)",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      flex: 1,
      minWidth: 0,
      boxShadow: flash
        ? `0 2px 8px ${color}25`
        : "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
    }}>
      <span style={{ color: count > 0 ? color : "#c8d3de" }}>{icon}</span>
      <span style={{
        fontSize: 20,
        fontFamily: "'Tiempos Headline', 'Georgia', 'Times New Roman', serif",
        color: count > 0 ? color : "#dde3ea",
        lineHeight: 1,
        letterSpacing: -0.5,
      }}>{count}</span>
      <span style={{
        fontSize: 9, color: "#94a3b8", letterSpacing: 0.8,
        textAlign: "center", lineHeight: 1.3,
        fontFamily: "'Inter', sans-serif",
        textTransform: "uppercase",
      }}>{label}</span>
    </button>
  );
}

export default function RuleOf100() {
  const WARM_TYPES = [
    { key: "email",    label: "Email",    iconKey: "email",    value: 1 },
    { key: "linkedin", label: "LinkedIn", iconKey: "linkedin", value: 1 },
    { key: "comment",  label: "Comment",  iconKey: "comment",  value: 1 },
    { key: "text",     label: "Text/DM",  iconKey: "text",     value: 1 },
    { key: "referral", label: "Referral", iconKey: "referral", value: 1 },
    { key: "meeting",  label: "In Person", iconKey: "meeting", value: 10 },
  ];

  const initCounts = () => Object.fromEntries(WARM_TYPES.map(t => [t.key, 0]));

  const [counts, setCounts]       = useState(initCounts);
  const [coldSent, setColdSent]   = useState(false);
  const [minutes, setMinutes]     = useState(0);
  const [timerActive, setTimer]   = useState(false);
  const [streak, setStreak]       = useState(0);
  const [loaded, setLoaded]       = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const [history, setHistory]     = useState([]);
  const [heatmap, setHeatmap]     = useState([]);
  const [tooltip, setTooltip]     = useState(null); // { x, y, day }
  const [hmMonth, setHmMonth]     = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const timerRef      = useRef(null);
  const prevWarm      = useRef(false);
  const prevContent   = useRef(false);
  const prevCold      = useRef(false);
  const rawSec        = useRef(0);
  const saveDebounce  = useRef(null);
  const isInitialLoad = useRef(true);
  const confettiId    = useRef(0);
  const [dispSec, setDispSec]     = useState(0);
  const [confetti, setConfetti]   = useState([]);

  const warmTotal   = Object.values(counts).reduce((a, b) => a + b, 0);
  const warmDone    = warmTotal >= 100;
  const contentDone = minutes >= 100;
  const bothDone    = warmDone && coldSent && contentDone;

  useEffect(() => {
    async function load() {
      const today = getTodayStr();
      // 1. Show localStorage instantly while API loads
      try {
        const cached = localStorage.getItem(SK_TODAY);
        if (cached) {
          const p = JSON.parse(cached);
          if (p.date === today) {
            setCounts(p.counts || initCounts());
            setColdSent(p.coldSent || false);
            setMinutes(p.minutes || 0);
          }
        }
      } catch(e) {}

      // 2. Fetch from DB (source of truth — syncs across devices)
      try {
        const res = await fetch(`/api/tracker?date=${today}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.date === today) {
            const merged = { ...initCounts(), ...(data.counts || {}) };
            setCounts(merged);
            setColdSent(data.cold_sent || false);
            setMinutes(data.minutes || 0);
            setStreak(data.streak || 0);
          }
        }
      } catch(e) {}

      setLoaded(true);
    }
    load();
  }, []);

  // Save to localStorage immediately + debounce save to DB
  useEffect(() => {
    if (!loaded) return;
    // Skip the very first fire (triggered by initial load from DB) to prevent
    // overwriting DB data with zeros on a fresh device with no localStorage
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    const today = getTodayStr();
    const completed = warmTotal >= 100 || minutes >= 100;

    // Instant local cache
    localStorage.setItem(SK_TODAY, JSON.stringify({ date: today, counts, coldSent, minutes }));

    // Debounced DB save (1.5s after last change)
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/tracker', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, counts, cold_sent: coldSent, minutes, completed }),
        });
        if (res.ok) {
          const { streak: s } = await res.json();
          if (typeof s === 'number') setStreak(s);
        }
      } catch(e) {}
    }, 1500);
  }, [counts, coldSent, minutes, loaded]);

  const prevBoth = useRef(false);
  useEffect(() => {
    if (bothDone && !prevBoth.current) {
      setDoneFlash(true);
      setTimeout(() => setDoneFlash(false), 1000);
    }
    prevBoth.current = bothDone;
  }, [bothDone]);

  // Log milestones to Neon when each goal is hit for the first time today
  useEffect(() => {
    if (!loaded) return;
    async function log(type) {
      try {
        await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: getTodayStr(), type }),
        });
        // Refresh history after logging
        fetch('/api/milestones').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
      } catch(e) {}
    }
    if (warmDone && !prevWarm.current) log('warm');
    if (contentDone && !prevContent.current) log('content');
    if (coldSent && !prevCold.current) log('cold');
    prevWarm.current    = warmDone;
    prevContent.current = contentDone;
    prevCold.current    = coldSent;
  }, [warmDone, contentDone, coldSent, loaded]);

  // Fetch milestone history + heatmap data on mount
  useEffect(() => {
    fetch('/api/milestones').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/tracker?days=180', { cache: 'no-store' }).then(r => r.json()).then(d => setHeatmap(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        rawSec.current += 1;
        setDispSec(rawSec.current % 60);
        if (rawSec.current % 60 === 0) setMinutes(m => m + 1);
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const spawnConfetti = useCallback((x, y) => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const colors = ['#ea6f1e', '#0c6b78', '#3172d4', '#0a8f6a', '#f59e0b', '#ec4899', '#8b5cf6'];
    const particles = Array.from({ length: 10 }, () => ({
      id: confettiId.current++,
      x, y,
      color: colors[Math.floor(Math.random() * colors.length)],
      dx: (Math.random() - 0.5) * 130,
      dy: -(Math.random() * 90 + 30),
      size: Math.random() * 5 + 5,
      round: Math.random() > 0.5,
    }));
    setConfetti(c => [...c, ...particles]);
    setTimeout(() => setConfetti(c => c.filter(p => !particles.some(np => np.id === p.id))), 700);
  }, []);

  const tap  = useCallback((key, x, y, value = 1) => { setCounts(c => ({ ...c, [key]: c[key] + value })); spawnConfetti(x, y); }, [spawnConfetti]);
  const undo = useCallback((key, value = 1) => setCounts(c => ({ ...c, [key]: Math.max(0, c[key] - value) })), []);

  const resetDay = () => {
    const today = getTodayStr();
    setCounts(initCounts()); setColdSent(false);
    setMinutes(0); rawSec.current=0; setDispSec(0); setTimer(false);
    localStorage.removeItem(SK_TODAY);
    fetch('/api/tracker', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, counts: initCounts(), cold_sent: false, minutes: 0, completed: false }),
    }).catch(() => {});
  };

  if (!loaded) return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#94a3b8", fontFamily:"'Inter',sans-serif", letterSpacing:3, fontSize:11, textTransform:"uppercase" }}>Loading</div>
    </div>
  );

  const mm = String(minutes).padStart(2,"0");
  const ss = String(dispSec).padStart(2,"0");
  const warmPct    = Math.min(warmTotal/100, 1) * 100;
  const contentPct = Math.min(minutes/100, 1) * 100;

  const C = {
    teal:   "#0c6b78",
    orange: "#ea6f1e",
    blue:   "#3172d4",
    green:  "#0a8f6a",
  };

  const card = {
    background: "#ffffff",
    borderRadius: 14,
    boxShadow: "0 1px 3px rgba(15,23,42,0.07), 0 4px 12px rgba(15,23,42,0.04)",
    border: "1px solid #eaeff4",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: doneFlash ? "#f0fdf9" : "#f0f4f8",
      transition: "background 0.5s",
      color: "#1e293b",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @font-face {
          font-family: 'Tiempos Headline';
          src: url('/TestTiemposHeadline-Regular.otf') format('opentype');
          font-weight: 400;
          font-style: normal;
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f0f4f8; }
        button { font-family: 'Inter', -apple-system, sans-serif; }
        @keyframes confetti-burst {
          0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(0.4); opacity: 0; }
        }
        .hm-cell { transition: opacity 0.1s; height: 11px; }
        @media (min-width: 480px) { .hm-cell { height: 13px; } }
        .hm-cell:hover { opacity: 0.75; }
        .hm-row-label { height: 11px; }
        @media (min-width: 480px) { .hm-row-label { height: 13px; } }
        .hm-tooltip {
          position: fixed; z-index: 1000; pointer-events: none;
          background: #1e293b; color: #f8fafc; border-radius: 8px;
          padding: 8px 11px; font-size: 11px; line-height: 1.6;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        }
        .tracker-page { max-width: 1200px; margin: 0 auto; padding: 12px 10px 56px; }
        @media (min-width: 640px) { .tracker-page { padding: 24px 20px 56px; } }
        .tracker-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        .tracker-bottom-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        .tracker-right-col { display: flex; flex-direction: column; gap: 12px; height: 100%; }
        @media (min-width: 768px) {
          .tracker-main-grid {
            grid-template-columns: 3fr 2fr;
            gap: 16px;
            margin-top: 16px;
            align-items: stretch;
          }
          .tracker-bottom-grid {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 16px;
            align-items: start;
          }
          .tracker-right-col { gap: 16px; }
        }
        /* Status cards */
        .status-card { border-radius: 12px; padding: 12px 10px 10px; }
        @media (min-width: 480px) { .status-card { border-radius: 16px; padding: 18px 20px 16px; } }
        .stat-num { font-size: 34px; line-height: 1; }
        @media (min-width: 480px) { .stat-num { font-size: 52px; } }
        .stat-suffix { font-size: 11px; }
        @media (min-width: 480px) { .stat-suffix { font-size: 13px; } }
        /* Tap buttons */
        .tap-btn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (min-width: 640px) {
          .tap-btn-grid { grid-template-columns: repeat(6, 1fr); gap: 10px; }
        }
        @media (min-width: 768px) {
          .tap-btn-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .tap-btn-grid { grid-template-columns: repeat(6, 1fr); }
        }
        .undo-btn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
        @media (min-width: 640px) {
          .undo-btn-grid { grid-template-columns: repeat(6, 1fr); gap: 6px; }
        }
        @media (min-width: 768px) {
          .undo-btn-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .undo-btn-grid { grid-template-columns: repeat(6, 1fr); }
        }
        /* Header compact on mobile */
        .tracker-header { padding: 14px 16px; }
        @media (min-width: 640px) { .tracker-header { padding: 20px 28px; } }
        .tracker-title { font-size: 22px; }
        @media (min-width: 640px) { .tracker-title { font-size: 26px; } }
        .streak-num { font-size: 32px; }
        @media (min-width: 640px) { .streak-num { font-size: 40px; } }
        /* Warm outreach card padding */
        .warm-card { padding: 16px 14px 14px; }
        @media (min-width: 640px) { .warm-card { padding: 24px 22px 20px; } }
        /* Content card */
        .content-card { padding: 16px 14px 14px; }
        @media (min-width: 640px) { .content-card { padding: 24px 22px 20px; } }
        .timer-display { font-size: 40px; }
        @media (min-width: 640px) { .timer-display { font-size: 54px; } }
      `}</style>

      {/* ── Header ── */}
      <div className="tracker-header" style={{
        ...card,
        borderRadius: "0 0 20px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/hormozi.jpg"
            alt="Alex Hormozi"
            style={{
              width: 44, height: 44, borderRadius: "50%",
              objectFit: "cover", objectPosition: "center top",
              flexShrink: 0,
              border: "2px solid #e2e8f0",
            }}
          />
          <div>
            <div className="tracker-title" style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              color: "#0f172a", lineHeight: 1.1, letterSpacing: -0.5,
            }}>
              Rule of 100
            </div>
            <div style={{
              fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginTop: 4,
              textTransform: "uppercase", fontWeight: 500,
            }}>
              MMG Design Studio
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {bothDone && (
            <div style={{
              background: "#f0fdf9", border: "1px solid #a7f3d8", borderRadius: 8,
              padding: "6px 14px", fontSize: 10, letterSpacing: 2,
              color: C.green, fontWeight: 600, textTransform: "uppercase",
            }}>
              All Done · Day Locked
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2, marginBottom: 1, textTransform: "uppercase", fontWeight: 500 }}>Streak</div>
            <div className="streak-num" style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              color: C.teal, lineHeight: 1,
            }}>
              {streak}<span style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'Inter',sans-serif", fontWeight: 500 }}>d</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tracker-page">

        {/* ── STATUS CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 0 }}>
          {[
            { label: "Warm Outreach", done: warmDone, pct: Math.min(warmTotal / 100, 1), display: warmTotal, suffix: "/ 100", color: C.orange },
            { label: "Content", done: contentDone, pct: Math.min(minutes / 100, 1), display: minutes, suffix: "/ 100m", color: C.blue },
            { label: "Cold Outreach", done: coldSent, pct: coldSent ? 1 : 0, display: coldSent ? "✓" : "—", suffix: coldSent ? "" : "pending", color: C.teal },
          ].map(({ label, done, pct, display, suffix, color }) => (
            <div key={label} className="status-card" style={{
              background: done ? "#f0fdf9" : "#ffffff",
              border: `1.5px solid ${done ? "#6ee7c7" : "#eaeff4"}`,
              transition: "all 0.3s",
              boxShadow: done ? "0 2px 8px rgba(10,143,106,0.10)" : "0 1px 3px rgba(15,23,42,0.06)",
            }}>
              <div style={{ fontSize: 9, color: done ? C.green : "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
                <span className="stat-num" style={{
                  fontFamily: "'Tiempos Headline', Georgia, serif",
                  color: done ? C.green : color,
                  transition: "color 0.3s",
                }}>{display}</span>
                {suffix && <span className="stat-suffix" style={{ color: "#94a3b8", fontWeight: 500 }}>{suffix}</span>}
              </div>
              <div style={{ height: 6, background: "#eaeff4", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${pct * 100}%`,
                  background: done
                    ? C.green
                    : `linear-gradient(90deg, ${color}cc, ${color})`,
                  transition: "width 0.35s ease, background 0.3s",
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── ACTIVITY HEATMAP ── */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const { year, month } = hmMonth;
          const isCurrent = year === today.getFullYear() && month === today.getMonth();

          const prevMo = () => setHmMonth(m => { const d = new Date(m.year, m.month-1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
          const nextMo = () => { if (!isCurrent) setHmMonth(m => { const d = new Date(m.year, m.month+1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); };

          // Build data lookup
          const dataMap = {};
          for (const row of heatmap) {
            const warm = row.counts ? Object.values(row.counts).reduce((a,b)=>a+b,0) : 0;
            dataMap[row.date] = { warm, minutes: row.minutes||0, cold: row.cold_sent||false };
          }
          function cellColor(d) {
            if (!d || (d.warm===0 && d.minutes===0 && !d.cold)) return '#e2e8f0';
            const s = Math.min(d.warm/100,1)*50 + Math.min(d.minutes/100,1)*50 + (d.cold?5:0);
            if (s >= 90) return '#0c6b78';
            if (s >= 60) return '#0e8a9e';
            if (s >= 35) return '#ea6f1e';
            if (s >= 15) return '#f4a46a';
            return '#fcd5b4';
          }

          // Rolling 18-week window ending at end of selected month (or today)
          const anchorEnd = isCurrent ? new Date(today) : new Date(year, month+1, 0);
          const anchorDow = (anchorEnd.getDay()+6)%7; // days since Mon
          const gridEnd = new Date(anchorEnd); gridEnd.setDate(anchorEnd.getDate() + (6-anchorDow));
          const gridStart = new Date(gridEnd); gridStart.setDate(gridEnd.getDate() - 18*7 + 1);

          // Build week columns
          const weeks = [];
          const cur = new Date(gridStart);
          while (cur <= gridEnd) {
            const week = [];
            for (let d=0; d<7; d++) { week.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
            weeks.push(week);
          }

          // Month labels: show label on the week containing the 1st of each month
          const monthLabels = [];
          weeks.forEach((week, wi) => {
            const first = week.find(d => d.getDate() <= 7);
            if (first) {
              const lbl = first.toLocaleDateString('en-US', { month: 'short' });
              if (!monthLabels.length || monthLabels[monthLabels.length-1].lbl !== lbl)
                monthLabels.push({ wi, lbl });
            }
          });

          const CELL_H = 11; // controlled by CSS .hm-cell for responsive sizing
          const GAP = 3;
          const DAY_LABELS = ['M','','W','','F','','S'];

          return (
            <div style={{ marginTop: 12 }}>
              <div style={{ ...card, padding: "10px 10px 8px" }}>
                {/* Header row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8 }}>
                  <div style={{ fontSize:9, color:"#94a3b8", letterSpacing:2, textTransform:"uppercase", fontWeight:600 }}>Activity</div>
                  <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                    <button onClick={prevMo} style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 7px', fontSize:15, color:'#64748b', lineHeight:1 }}>‹</button>
                    <span style={{ fontSize:11, color:"#475569", fontWeight:600, fontFamily:"'Inter',sans-serif", minWidth:88, textAlign:'center' }}>
                      {new Date(year, month).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
                    </span>
                    <button onClick={nextMo} disabled={isCurrent} style={{ background:'none', border:'none', cursor: isCurrent?'default':'pointer', padding:'2px 7px', fontSize:15, color: isCurrent?'#d1d9e0':'#64748b', lineHeight:1 }}>›</button>
                  </div>
                </div>

                {/* Month labels above grid columns */}
                <div style={{ display:"flex", gap:GAP, marginLeft:20, marginBottom:3 }}>
                  {weeks.map((_,wi) => {
                    const ml = monthLabels.find(m=>m.wi===wi);
                    return <div key={wi} style={{ flex:1, fontSize:9, color:"#94a3b8", fontFamily:"'Inter',sans-serif", fontWeight:500 }}>{ml?ml.lbl:''}</div>;
                  })}
                </div>

                {/* Grid: day-of-week labels + week columns */}
                <div style={{ display:"flex", gap:GAP }}>
                  {/* Day labels — fixed width, fixed cell height to match grid rows */}
                  <div style={{ display:"flex", flexDirection:"column", gap:GAP, width:16, flexShrink:0 }}>
                    {DAY_LABELS.map((l,i) => (
                      <div key={i} className="hm-row-label" style={{ fontSize:8, color:"#b0bec5", fontFamily:"'Inter',sans-serif", display:"flex", alignItems:"center" }}>{l}</div>
                    ))}
                  </div>

                  {/* Week columns — flex:1 fills full width; cells fixed CELL_H tall */}
                  {weeks.map((week,wi) => (
                    <div key={wi} style={{ flex:1, display:"flex", flexDirection:"column", gap:GAP }}>
                      {week.map((date,di) => {
                        const iso = date.toISOString().slice(0,10);
                        const isFuture = date > today;
                        const d = dataMap[iso];
                        const bg = isFuture ? 'transparent' : cellColor(d);
                        const hasData = !isFuture && !!d;
                        const warm=d?.warm??0, mins=d?.minutes??0, cold=d?.cold??false;
                        const lbl = date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
                        return (
                          <div key={iso} className="hm-cell" style={{
                            borderRadius:2,
                            background: bg,
                            border: !isFuture ? `1px solid ${bg==='#e2e8f0'?'#d1d9e0':'transparent'}` : 'none',
                          }}
                          onMouseEnter={e=>{ if(!hasData)return; setTooltip({x:e.clientX,y:e.clientY,lbl,warm,mins,cold}); }}
                          onMouseMove={e=>{ if(!hasData)return; setTooltip(t=>t?{...t,x:e.clientX,y:e.clientY}:null); }}
                          onMouseLeave={()=>setTooltip(null)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:8, justifyContent:"flex-end" }}>
                  <span style={{ fontSize:9, color:"#b0bec5", fontFamily:"'Inter',sans-serif" }}>Less</span>
                  {['#e2e8f0','#fcd5b4','#f4a46a','#ea6f1e','#0e8a9e','#0c6b78'].map(c=>(
                    <div key={c} style={{ width:9, height:9, borderRadius:2, background:c, flexShrink:0 }}/>
                  ))}
                  <span style={{ fontSize:9, color:"#b0bec5", fontFamily:"'Inter',sans-serif" }}>More</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MAIN GRID ── */}
        <div className="tracker-main-grid">

          {/* Left: Warm Outreach */}
          <div className="warm-card" style={{ ...card }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Warm Outreach</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>1-to-1 · you sent it</div>
            </div>

            <div style={{ height: 6, background: "#eaeff4", borderRadius: 3, marginBottom: 22, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${warmPct}%`,
                background: warmDone ? C.green : `linear-gradient(90deg, ${C.orange}bb, ${C.orange})`,
                transition: "width 0.35s ease, background 0.3s",
              }} />
            </div>

            <div className="tap-btn-grid" style={{ marginBottom: 12 }}>
              {WARM_TYPES.map(t => (
                <TapButton key={t.key} icon={icons[t.iconKey]} label={t.label}
                  count={counts[t.key]} color={t.value > 1 ? C.teal : C.orange}
                  onTap={(x, y) => tap(t.key, x, y, t.value)}
                />
              ))}
            </div>

            <div className="undo-btn-grid">
              {WARM_TYPES.map(t => (
                <button key={t.key} onClick={() => undo(t.key, t.value)} style={{
                  background: "#f8fafc",
                  border: "1px solid #eaeff4",
                  borderRadius: 8, padding: "7px 4px",
                  color: "#94a3b8", fontSize: 9, letterSpacing: 0.8,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}>
                  {icons.undo}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Content */}
          <div className="tracker-right-col">

            {/* Content */}
            <div className="content-card" style={{ ...card, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Content</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>LinkedIn · Podcast · Copy</div>
                </div>
                <div style={{ textAlign: "right", lineHeight: 1 }}>
                  <span style={{
                    fontFamily: "'Tiempos Headline', Georgia, serif",
                    fontSize: 38,
                    color: contentDone ? C.green : C.blue,
                    transition: "color 0.3s",
                  }}>{minutes}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 3 }}>/ 100m</span>
                </div>
              </div>

              <div style={{ height: 6, background: "#eaeff4", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${contentPct}%`,
                  background: contentDone ? C.green : `linear-gradient(90deg, ${C.blue}bb, ${C.blue})`,
                  transition: "width 0.35s ease, background 0.3s",
                }} />
              </div>

              <div className="timer-display" style={{
                textAlign: "center", marginBottom: 14,
                fontFamily: "'Tiempos Headline', Georgia, serif",
                letterSpacing: 3,
                color: timerActive ? C.blue : "#c8d3de",
                transition: "color 0.3s",
                lineHeight: 1,
              }}>
                {mm}:{ss}
              </div>

              <button onClick={() => setTimer(a => !a)} style={{
                width: "100%", padding: "14px",
                background: timerActive ? "#eff6ff" : "#ffffff",
                border: `1.5px solid ${timerActive ? "#93c5fd" : "#eaeff4"}`,
                borderRadius: 12, marginBottom: 10,
                color: timerActive ? C.blue : "#64748b",
                fontSize: 12, letterSpacing: 2, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
                WebkitTapHighlightColor: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                textTransform: "uppercase",
                boxShadow: timerActive
                  ? "0 2px 8px rgba(49,114,212,0.14)"
                  : "0 1px 3px rgba(15,23,42,0.06)",
              }}>
                {timerActive ? icons.pause : icons.play}
                {timerActive ? "Pause" : "Start Timer"}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
                {[15,25,30,45].map(n => (
                  <button key={n} onClick={() => setMinutes(m => Math.min(m+n,999))} style={{
                    background: "#f8fafc",
                    border: "1px solid #eaeff4",
                    borderRadius: 10, padding: "11px 4px",
                    color: "#64748b", fontSize: 12, letterSpacing: 0.5,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                    fontWeight: 500,
                  }}>+{n}m</button>
                ))}
              </div>
            </div>

          </div>{/* end right col */}
        </div>{/* end main grid */}

        {/* ── BOTTOM ROW: Cold Outreach + Achievement Log ── */}
        <div className="tracker-bottom-grid" style={{ marginTop: 16 }}>

          {/* Cold Outreach */}
          <div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Cold Outreach</div>
            <button onClick={() => setColdSent(s => !s)} style={{
              width: "100%", padding: "20px",
              background: coldSent ? "#f0fdf9" : "#ffffff",
              border: `1.5px solid ${coldSent ? "#6ee7c7" : "#eaeff4"}`,
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.25s ease",
              WebkitTapHighlightColor: "transparent",
              boxShadow: coldSent
                ? "0 2px 8px rgba(10,143,106,0.12)"
                : "0 1px 3px rgba(15,23,42,0.07), 0 4px 12px rgba(15,23,42,0.04)",
              textAlign: "left",
            }}>
              <div>
                <div style={{
                  fontFamily: "'Tiempos Headline', Georgia, serif",
                  fontSize: 20,
                  color: coldSent ? C.green : "#334155",
                  lineHeight: 1, letterSpacing: -0.3,
                }}>
                  {coldSent ? "Batch Sent" : "Mark Batch Sent"}
                </div>
                <div style={{ fontSize: 11, color: coldSent ? C.green : "#94a3b8", marginTop: 5 }}>
                  {coldSent ? "Instantly — 100 cold emails complete" : "Tap when today's Instantly batch fires"}
                </div>
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                border: `1.5px solid ${coldSent ? C.green : "#dde3ea"}`,
                background: coldSent ? C.green : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.25s",
                color: "#ffffff",
                boxShadow: coldSent ? "0 2px 6px rgba(10,143,106,0.25)" : "none",
              }}>
                {coldSent && icons.check}
              </div>
            </button>
          </div>

          {/* Achievement Log */}
          <div>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
              Achievement Log
            </div>
            {history.length > 0 ? (
              <div style={{ ...card, padding: "4px 0", maxHeight: 260, overflowY: "auto" }}>
                {history.map((m, i) => {
                  const label = m.type === 'warm' ? '100 Warm Outreaches' : m.type === 'content' ? '100 Min Content' : '100 Cold Outreaches';
                  const color = m.type === 'warm' ? C.orange : m.type === 'content' ? C.blue : C.teal;
                  const dateStr = new Date(m.reached_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  return (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px",
                      borderBottom: i < history.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 500 }}>{label}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{dateStr}</div>
                      </div>
                      <div style={{
                        fontSize: 9, color: color, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
                        background: `${color}12`, borderRadius: 6, padding: "3px 7px",
                      }}>Done</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ ...card, padding: "20px 16px", color: "#b0bec5", fontSize: 11, textAlign: "center", letterSpacing: 0.5 }}>
                No achievements yet — keep going!
              </div>
            )}
          </div>

        </div>{/* end bottom row */}

        {/* Footer */}
        <div style={{
          marginTop: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button onClick={resetDay} style={{
            background: "#ffffff",
            border: "1px solid #eaeff4",
            borderRadius: 8, padding: "8px 16px",
            color: "#94a3b8", fontSize: 10, letterSpacing: 1.5,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            textTransform: "uppercase",
            fontWeight: 500,
            boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
          }}>Reset Day</button>
          <div style={{ fontSize: 10, color: "#b0bec5", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>
            {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}
          </div>
        </div>

      </div>{/* end tracker-page */}

      {/* Tooltip */}
      {tooltip && (
        <div className="hm-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 3, color: "#e2e8f0" }}>{tooltip.lbl}</div>
          <div>Warm outreach: <b>{tooltip.warm}</b></div>
          <div>Content: <b>{tooltip.mins}m</b></div>
          <div>Cold sent: <b>{tooltip.cold ? '✓' : '—'}</b></div>
        </div>
      )}

      {/* Confetti particles — desktop only, spawned on outreach tap */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position: 'fixed',
          left: p.x - p.size / 2,
          top: p.y - p.size / 2,
          width: p.size,
          height: p.size,
          borderRadius: p.round ? '50%' : 2,
          background: p.color,
          pointerEvents: 'none',
          zIndex: 9999,
          animation: 'confetti-burst 0.65s ease-out forwards',
          '--dx': p.dx + 'px',
          '--dy': p.dy + 'px',
          '--rot': Math.floor(Math.random() * 360) + 'deg',
        }} />
      ))}
    </div>
  );
}
