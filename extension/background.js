// Rule of 100 Quick Log — background service worker.
// Talks to the production tracker API so outreach logged from any tab
// (via content-widget.js) lands in the same database the Daily Actions
// page reads from. Content scripts can't do this fetch themselves —
// cross-origin requests from a page's content-script context are still
// subject to that page's CORS, but requests from here are not, because
// this origin (chrome-extension://…) has host_permissions for the API.

const BASE_URL = 'https://homebase-pearl.vercel.app'

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

async function getActivatedDate() {
  const { activatedDate } = await chrome.storage.local.get('activatedDate')
  return activatedDate || null
}

async function isActiveToday() {
  const activatedDate = await getActivatedDate()
  return activatedDate === getTodayStr()
}

async function fetchToday() {
  const date = getTodayStr()
  const res = await fetch(`${BASE_URL}/api/tracker?date=${date}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GET /api/tracker failed: ${res.status}`)
  return res.json()
}

async function increment(key, value) {
  const date = getTodayStr()
  const res = await fetch(`${BASE_URL}/api/tracker/increment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, key, value }),
  })
  if (!res.ok) throw new Error(`POST /api/tracker/increment failed: ${res.status}`)
  return res.json()
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'activate-today') {
        await chrome.storage.local.set({ activatedDate: getTodayStr() })
        sendResponse({ ok: true })
      } else if (msg.type === 'check-active') {
        sendResponse({ active: await isActiveToday() })
      } else if (msg.type === 'get-today') {
        const data = await fetchToday()
        sendResponse({ ok: true, data })
      } else if (msg.type === 'increment') {
        const data = await increment(msg.key, msg.value)
        sendResponse({ ok: true, data })
      } else {
        sendResponse({ ok: false, error: 'Unknown message type' })
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) })
    }
  })()
  return true // keep the message channel open for the async response
})

// Clear the "activated today" flag shortly after midnight ET so the widget
// stops appearing until the Daily Actions page is opened again.
chrome.alarms.create('check-day-rollover', { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'check-day-rollover') return
  const activatedDate = await getActivatedDate()
  if (activatedDate && activatedDate !== getTodayStr()) {
    await chrome.storage.local.remove('activatedDate')
  }
})
