// Rule of 100 Quick Log — floating widget injected into every other tab
// once the Daily Actions page has been opened today (see
// content-detector.js). Bottom-left, collapsible, logs straight to the
// same tracker your Daily Actions page reads from.
(function () {
  if (window.top !== window) return // skip iframes

  const FIELDS = [
    { key: 'email', label: 'Email', value: 1, icon: 'M2 4h20v16H2z M2 4l10 8 10-8' },
    { key: 'linkedin', label: 'LI Connect', value: 1, icon: 'li' },
    { key: 'comment', label: 'Comment', value: 1, icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
    { key: 'text', label: 'Text/DM', value: 1, icon: 'chat' },
    { key: 'referral', label: 'Referral', value: 1, icon: 'people' },
    { key: 'meeting', label: 'Meeting', value: 10, icon: 'calendar' },
    { key: 'videoDM', label: 'Video DM', value: 10, icon: 'video' },
  ]

  const COLLAPSE_KEY = 'r100-widget-collapsed'
  const AVATAR_URL = chrome.runtime.getURL('images/hormozi.jpg')

  function iconSvg(kind) {
    switch (kind) {
      case 'li':
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>'
      case 'chat':
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
      case 'people':
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      case 'calendar':
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
      case 'video':
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8.5-6 3.5 6 3.5z"/></svg>'
      default:
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
    }
  }

  function sendMessage(msg) {
    return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve))
  }

  async function init() {
    const { active } = await sendMessage({ type: 'check-active' })
    if (!active) return

    let warmTotal = 0
    try {
      const { ok, data } = await sendMessage({ type: 'get-today' })
      if (ok && data && data.counts) {
        warmTotal = Object.values(data.counts).reduce((a, b) => a + (b || 0), 0)
      }
    } catch (e) { /* start from 0, still usable */ }

    mount(warmTotal)
  }

  function mount(initialTotal) {
    const host = document.createElement('div')
    host.id = 'r100-widget-host'
    host.style.cssText = 'all:initial;position:fixed;left:16px;bottom:16px;z-index:2147483647;'
    document.documentElement.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, 'Inter', sans-serif; }
      .panel {
        width: 250px;
        background: #ffffff;
        border: 1px solid #eaeff4;
        border-radius: 14px;
        box-shadow: 0 8px 28px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.10);
        overflow: hidden;
        animation: rise 0.25s cubic-bezier(0.22,1,0.36,1) both;
      }
      @keyframes rise { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
      .head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        background: #0c6b78;
        color: #fff;
        cursor: pointer;
        user-select: none;
      }
      .head-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .head-avatar {
        width: 24px; height: 24px; border-radius: 50%;
        object-fit: cover; object-position: center top;
        flex-shrink: 0;
        border: 1.5px solid rgba(255,255,255,0.5);
      }
      .head-title { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; white-space: nowrap; }
      .head-total { font-size: 13px; font-weight: 700; }
      .head-toggle { font-size: 14px; opacity: 0.85; line-height: 1; padding: 2px 4px; }
      .body { padding: 10px; }
      .bar-track { height: 5px; background: #eaeff4; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
      .bar-fill { height: 100%; background: linear-gradient(90deg,#ea6f1ecc,#ea6f1e); border-radius: 3px; transition: width 0.3s ease; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      button.field {
        all: unset;
        display: flex; flex-direction: column; align-items: center; gap: 3px;
        padding: 8px 2px;
        background: #f8fafc;
        border: 1px solid #eaeff4;
        border-radius: 9px;
        cursor: pointer;
        color: #64748b;
        transition: background 0.1s, transform 0.1s;
        box-sizing: border-box;
      }
      button.field:hover { background: #f0f4f8; }
      button.field.flash { background: #fff2e8; transform: scale(0.94); border-color: #ea6f1e80; }
      button.field .n { font-size: 9px; letter-spacing: 0.5px; text-transform: uppercase; text-align: center; line-height: 1.15; }
      .collapsed .panel { width: auto; }
      .pill {
        display: flex; align-items: center; gap: 8px;
        padding: 9px 14px;
        background: #0c6b78;
        color: #fff;
        border-radius: 999px;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(15,23,42,0.2);
        font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
        user-select: none;
      }
      .toast {
        position: absolute; left: 0; right: 0; top: -42px;
        text-align: center; font-size: 12px; font-weight: 600;
        color: #0a8f6a; background: #f0fdf9; border: 1px solid #a7f3d8;
        border-radius: 8px; padding: 6px 10px;
        opacity: 0; transform: translateY(6px);
        transition: opacity 0.25s, transform 0.25s;
        pointer-events: none;
      }
      .toast.show { opacity: 1; transform: translateY(0); }
    `
    root.appendChild(style)

    const wrap = document.createElement('div')
    root.appendChild(wrap)

    let collapsed = false
    try { collapsed = sessionStorage.getItem(COLLAPSE_KEY) === '1' } catch (e) {}

    let total = initialTotal || 0

    function render() {
      wrap.className = collapsed ? 'collapsed' : ''
      if (collapsed) {
        wrap.innerHTML = `<div class="pill" id="r100-pill">🎯 ${total}/100 outreach</div>`
        wrap.querySelector('#r100-pill').addEventListener('click', () => {
          collapsed = false
          try { sessionStorage.setItem(COLLAPSE_KEY, '0') } catch (e) {}
          render()
        })
        return
      }

      const pct = Math.min(total / 100, 1) * 100
      wrap.innerHTML = `
        <div class="panel" style="position:relative;">
          <div class="toast" id="r100-toast"></div>
          <div class="head" id="r100-head">
            <span class="head-left">
              <img class="head-avatar" src="${AVATAR_URL}" alt="">
              <span class="head-title">Rule of 100</span>
            </span>
            <span class="head-total">${total}<span style="opacity:.65;font-weight:500;">/100</span></span>
            <span class="head-toggle">–</span>
          </div>
          <div class="body">
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
            <div class="grid">
              ${FIELDS.map(f => `
                <button class="field" data-key="${f.key}" data-value="${f.value}" title="${f.label}">
                  ${iconSvg(f.icon)}
                  <span class="n">${f.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `

      wrap.querySelector('#r100-head').addEventListener('click', () => {
        collapsed = true
        try { sessionStorage.setItem(COLLAPSE_KEY, '1') } catch (e) {}
        render()
      })

      wrap.querySelectorAll('button.field').forEach((btn) => {
        btn.addEventListener('click', () => onTap(btn))
      })
    }

    async function onTap(btn) {
      const key = btn.getAttribute('data-key')
      const value = parseInt(btn.getAttribute('data-value'), 10)
      btn.classList.add('flash')
      setTimeout(() => btn.classList.remove('flash'), 150)

      const wasUnder100 = total < 100
      total += value
      render()

      try {
        const { ok, data } = await sendMessage({ type: 'increment', key, value })
        if (ok && data && typeof data.warmTotal === 'number') {
          total = data.warmTotal
          if (wasUnder100 && total >= 100) showCelebration()
          render()
        }
      } catch (e) { /* optimistic value stands if the network call fails */ }
    }

    function showCelebration() {
      const toast = root.querySelector('#r100-toast') || (wrap.querySelector('.panel') && wrap.querySelector('.panel').querySelector('.toast'))
      if (!toast) return
      toast.textContent = '🏆 100 outreach — nice work!'
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 2200)
    }

    render()
  }

  init()
})()
