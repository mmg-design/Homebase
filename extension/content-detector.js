// Runs only on the Daily Actions (/tracker) page. Marks today as
// "activated" so the floating widget (content-widget.js) starts showing
// up on other tabs for the rest of the day.
chrome.runtime.sendMessage({ type: 'activate-today' })
