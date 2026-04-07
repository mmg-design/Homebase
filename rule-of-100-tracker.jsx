import { useState, useEffect, useRef, useCallback } from "react";

const SK_STREAK = "r100-streak";
const SK_LAST = "r100-last-date";
const SK_TODAY = "r100-today";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
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
      padding: "14px 6px",
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
    { key: "email",    label: "Email",    iconKey: "email" },
    { key: "linkedin", label: "LinkedIn", iconKey: "linkedin" },
    { key: "comment",  label: "Comment",  iconKey: "comment" },
    { key: "text",     label: "Text/DM",  iconKey: "text" },
    { key: "referral", label: "Referral", iconKey: "referral" },
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
    const completed = Object.values(counts).reduce((a, b) => a + b, 0) >= 100 && coldSent && minutes >= 100;

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

  const tap  = useCallback((key, x, y) => { setCounts(c => ({ ...c, [key]: c[key]+1 })); spawnConfetti(x, y); }, [spawnConfetti]);
  const undo = useCallback((key) => setCounts(c => ({ ...c, [key]: Math.max(0, c[key]-1) })), []);

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
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: 48,
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
        .hm-cell { transition: opacity 0.1s; }
        .hm-cell:hover { opacity: 0.75; }
        .hm-tooltip {
          position: fixed; z-index: 1000; pointer-events: none;
          background: #1e293b; color: #f8fafc; border-radius: 8px;
          padding: 8px 11px; font-size: 11px; line-height: 1.6;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        ...card,
        margin: "0 0 0 0",
        borderRadius: "0 0 16px 16px",
        padding: "28px 22px 22px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        boxShadow: "0 2px 8px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <div style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              fontSize: 28, color: "#0f172a", lineHeight: 1.1, letterSpacing: -0.5,
            }}>
              Rule of 100
            </div>
            <div style={{
              fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginTop: 5,
              textTransform: "uppercase", fontWeight: 500,
            }}>
              MMG Design Studio
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginBottom: 2, textTransform: "uppercase", fontWeight: 500 }}>Streak</div>
          <div style={{
            fontFamily: "'Tiempos Headline', Georgia, serif",
            fontSize: 46, color: C.teal, lineHeight: 1,
          }}>
            {streak}<span style={{ fontSize: 16, color: "#94a3b8", fontFamily: "'Inter',sans-serif", fontWeight: 500 }}>d</span>
          </div>
        </div>
      </div>

      {bothDone && (
        <div style={{
          margin: "12px 16px 0",
          background: "#f0fdf9",
          border: "1px solid #a7f3d8",
          borderRadius: 10,
          padding: "10px 16px",
          textAlign: "center",
          fontSize: 11,
          letterSpacing: 2,
          color: C.green,
          fontWeight: 600,
          textTransform: "uppercase",
          boxShadow: "0 1px 4px rgba(10,143,106,0.10)",
        }}>
          All Three Done · Day Locked
        </div>
      )}

      {/* ── STATUS PILLS ── */}
      <div style={{ display: "flex", gap: 8, margin: "12px 16px 0" }}>
        {[
          { label: "Warm", done: warmDone, pct: Math.min(warmTotal / 100, 1), display: `${warmTotal}`, color: C.orange },
          { label: "Content", done: contentDone, pct: Math.min(minutes / 100, 1), display: `${minutes}m`, color: C.blue },
          { label: "Cold", done: coldSent, pct: coldSent ? 1 : 0, display: coldSent ? "Done" : "—", color: C.teal },
        ].map(({ label, done, pct, display, color }) => (
          <div key={label} style={{
            flex: 1,
            background: done ? "#f0fdf9" : "#ffffff",
            border: `1px solid ${done ? "#6ee7c7" : "#eaeff4"}`,
            borderRadius: 12,
            padding: "11px 12px 10px",
            transition: "all 0.3s",
            boxShadow: done ? "0 2px 6px rgba(10,143,106,0.10)" : "0 1px 3px rgba(15,23,42,0.06)",
          }}>
            <div style={{ fontSize: 8, color: done ? C.green : "#94a3b8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 5 }}>
              {label}
            </div>
            <div style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              fontSize: 18, color: done ? C.green : color, lineHeight: 1, marginBottom: 7,
              transition: "color 0.3s",
            }}>
              {done ? "✓" : display}
            </div>
            <div style={{ height: 3, background: "#eaeff4", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${pct * 100}%`,
                background: done ? C.green : color,
                transition: "width 0.35s ease, background 0.3s",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── WARM OUTREACH ── */}
      <div style={{ ...card, margin: "12px 16px 0", padding: "20px 18px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Warm Outreach</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>1-to-1 · you sent it</div>
          </div>
          <div style={{ textAlign: "right", lineHeight: 1 }}>
            <span style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              fontSize: 42,
              color: warmDone ? C.green : C.orange,
              transition: "color 0.3s",
            }}>{warmTotal}</span>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 3 }}>/ 100</span>
          </div>
        </div>

        <div style={{ height: 4, background: "#eaeff4", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${warmPct}%`,
            background: warmDone ? C.green : C.orange,
            transition: "width 0.35s ease, background 0.3s",
          }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
          {WARM_TYPES.map(t => (
            <TapButton key={t.key} icon={icons[t.iconKey]} label={t.label}
              count={counts[t.key]} color={C.orange}
              onTap={(x, y) => tap(t.key, x, y)}
            />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {WARM_TYPES.map(t => (
            <button key={t.key} onClick={() => undo(t.key)} style={{
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

      {/* ── CONTENT ── */}
      <div style={{ ...card, margin: "12px 16px 0", padding: "20px 18px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Content</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>LinkedIn · Podcast · Copy</div>
          </div>
          <div style={{ textAlign: "right", lineHeight: 1 }}>
            <span style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              fontSize: 42,
              color: contentDone ? C.green : C.blue,
              transition: "color 0.3s",
            }}>{minutes}</span>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 3 }}>/ 100m</span>
          </div>
        </div>

        <div style={{ height: 4, background: "#eaeff4", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${contentPct}%`,
            background: contentDone ? C.green : C.blue,
            transition: "width 0.35s ease, background 0.3s",
          }} />
        </div>

        <div style={{
          textAlign: "center", marginBottom: 14,
          fontFamily: "'Tiempos Headline', Georgia, serif",
          fontSize: 58, letterSpacing: 3,
          color: timerActive ? C.blue : "#c8d3de",
          transition: "color 0.3s",
          lineHeight: 1,
        }}>
          {mm}:{ss}
        </div>

        <button onClick={() => setTimer(a => !a)} style={{
          width: "100%", padding: "15px",
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
            ? "0 2px 8px rgba(49,114,212,0.14), 0 1px 3px rgba(15,23,42,0.05)"
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
              borderRadius: 10, padding: "12px 4px",
              color: "#64748b", fontSize: 12, letterSpacing: 0.5,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              fontWeight: 500,
            }}>+{n}m</button>
          ))}
        </div>
      </div>

      {/* ── COLD / INSTANTLY ── */}
      <div style={{ margin: "12px 16px 0" }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 3, paddingLeft: 2 }}>Cold Outreach</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, paddingLeft: 2 }}>Instantly · automated · bulk send</div>

        <button onClick={() => setColdSent(s => !s)} style={{
          width: "100%", padding: "18px 20px",
          background: coldSent ? "#f0fdf9" : "#ffffff",
          border: `1.5px solid ${coldSent ? "#6ee7c7" : "#eaeff4"}`,
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.25s ease",
          WebkitTapHighlightColor: "transparent",
          boxShadow: coldSent
            ? "0 2px 8px rgba(10,143,106,0.12), 0 1px 3px rgba(15,23,42,0.05)"
            : "0 1px 3px rgba(15,23,42,0.07), 0 4px 12px rgba(15,23,42,0.04)",
          textAlign: "left",
        }}>
          <div>
            <div style={{
              fontFamily: "'Tiempos Headline', Georgia, serif",
              fontSize: 20,
              color: coldSent ? C.green : "#334155",
              lineHeight: 1,
              letterSpacing: -0.3,
            }}>
              {coldSent ? "Batch Sent" : "Mark Batch Sent"}
            </div>
            <div style={{ fontSize: 11, color: coldSent ? C.green : "#94a3b8", marginTop: 5 }}>
              {coldSent ? "Instantly — 100 cold emails complete" : "Tap when today's Instantly batch fires"}
            </div>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
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

      {/* ── ACHIEVEMENT LOG ── */}
      {history.length > 0 && (
        <div style={{ margin: "16px 16px 0" }}>
          <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, paddingLeft: 2 }}>
            Achievement Log
          </div>
          <div style={{ ...card, padding: "4px 0", maxHeight: 220, overflowY: "auto" }}>
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
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: color,
                  }} />
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
        </div>
      )}

      {/* ── ACTIVITY HEATMAP ── */}
      {(() => {
        // Build a map of date → row data
        const dataMap = {};
        for (const d of heatmap) {
          const warm = d.counts ? Object.values(d.counts).reduce((a, b) => a + b, 0) : 0;
          dataMap[d.date] = { warm, minutes: d.minutes || 0, cold: d.cold_sent || false, completed: d.completed || false };
        }

        // Score 0–100 for colour intensity (warm 0-100 + content 0-100 averaged, cold as bonus)
        function score(d) {
          if (!d) return 0;
          const w = Math.min(d.warm / 100, 1);
          const c = Math.min(d.minutes / 100, 1);
          return Math.round(((w + c) / 2) * 100 + (d.cold ? 10 : 0));
        }

        function cellColor(d) {
          if (!d || (d.warm === 0 && d.minutes === 0 && !d.cold)) return '#e2e8f0';
          const s = score(d);
          if (s >= 90) return '#0c6b78';      // full teal — complete
          if (s >= 60) return '#0e8a9e';      // teal-ish
          if (s >= 35) return '#ea6f1e';      // orange
          if (s >= 15) return '#f4a46a';      // light orange
          return '#fcd5b4';                   // very light
        }

        // Generate grid: last 182 days (26 weeks), starting on Monday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Rewind to most recent Sunday so columns align as full weeks
        const startOffset = (today.getDay() + 6) % 7; // days since last Monday
        const gridStart = new Date(today);
        gridStart.setDate(today.getDate() - startOffset - 7 * 25); // 26 weeks back

        const weeks = [];
        let cur = new Date(gridStart);
        for (let w = 0; w < 26; w++) {
          const week = [];
          for (let d = 0; d < 7; d++) {
            const iso = cur.toISOString().slice(0, 10);
            week.push({ iso, date: new Date(cur), dayOfWeek: d });
            cur.setDate(cur.getDate() + 1);
          }
          weeks.push(week);
        }

        // Month labels: find which week each month first appears in
        const monthLabels = [];
        weeks.forEach((week, wi) => {
          const firstOfMonth = week.find(d => d.date.getDate() <= 7);
          if (firstOfMonth) {
            const label = firstOfMonth.date.toLocaleDateString('en-US', { month: 'short' });
            if (!monthLabels.length || monthLabels[monthLabels.length - 1].label !== label) {
              monthLabels.push({ wi, label });
            }
          }
        });

        const SZ = 11; // cell size px
        const GAP = 3; // gap px
        const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

        return (
          <div style={{ margin: "16px 16px 0" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 10, paddingLeft: 2 }}>
              Activity
            </div>
            <div style={{ ...card, padding: "16px 14px 14px", overflowX: "auto" }}>
              <div style={{ display: "inline-flex", flexDirection: "column", minWidth: "100%" }}>

                {/* Month labels row */}
                <div style={{ display: "flex", marginLeft: 18, marginBottom: 4, gap: GAP }}>
                  {weeks.map((_, wi) => {
                    const ml = monthLabels.find(m => m.wi === wi);
                    return (
                      <div key={wi} style={{ width: SZ, fontSize: 9, color: "#94a3b8", fontFamily: "'Inter',sans-serif", fontWeight: 500, flexShrink: 0 }}>
                        {ml ? ml.label : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Grid rows: one per day of week */}
                <div style={{ display: "flex", gap: GAP }}>
                  {/* Day-of-week labels */}
                  <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 2 }}>
                    {DAY_LABELS.map((l, i) => (
                      <div key={i} style={{ width: 12, height: SZ, fontSize: 8, color: "#b0bec5", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", flexShrink: 0 }}>
                        {l}
                      </div>
                    ))}
                  </div>

                  {/* Week columns */}
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                      {week.map(({ iso, date }) => {
                        const d = dataMap[iso];
                        const isFuture = date > today;
                        const bg = isFuture ? 'transparent' : cellColor(d);
                        const warm = d?.warm ?? 0;
                        const mins = d?.minutes ?? 0;
                        const cold = d?.cold ?? false;
                        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <div
                            key={iso}
                            className="hm-cell"
                            style={{
                              width: SZ, height: SZ,
                              borderRadius: 2,
                              background: bg,
                              border: isFuture ? 'none' : `1px solid ${bg === '#e2e8f0' ? '#d1d9e0' : 'transparent'}`,
                              flexShrink: 0,
                              cursor: d ? 'default' : 'default',
                            }}
                            onMouseEnter={e => {
                              if (isFuture || !d) return;
                              setTooltip({ x: e.clientX, y: e.clientY, label, warm, mins, cold });
                            }}
                            onMouseMove={e => {
                              if (isFuture || !d) return;
                              setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 9, color: "#b0bec5", fontFamily: "'Inter',sans-serif" }}>Less</span>
                  {['#e2e8f0','#fcd5b4','#f4a46a','#ea6f1e','#0e8a9e','#0c6b78'].map(c => (
                    <div key={c} style={{ width: 9, height: 9, borderRadius: 2, background: c }} />
                  ))}
                  <span style={{ fontSize: 9, color: "#b0bec5", fontFamily: "'Inter',sans-serif" }}>More</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tooltip */}
      {tooltip && (
        <div className="hm-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 3, color: "#e2e8f0" }}>{tooltip.label}</div>
          <div>Warm outreach: <b>{tooltip.warm}</b></div>
          <div>Content: <b>{tooltip.mins}m</b></div>
          <div>Cold sent: <b>{tooltip.cold ? '✓' : '—'}</b></div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        margin: "14px 16px 0",
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
