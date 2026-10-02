// Runs on every Homebase page. Marks today as "activated" once the Daily
// Actions (/tracker) page is shown, so the floating widget
// (content-widget.js) starts showing up on other tabs for the rest of the
// day. The app's sidebar uses client-side navigation, so reaching /tracker
// from another page is not a fresh page load and a /tracker-only content
// script would never run — watch for in-app URL changes instead.
(function () {
  let activated = false

  function check() {
    if (activated || !location.pathname.startsWith('/tracker')) return
    activated = true
    chrome.runtime.sendMessage({ type: 'activate-today' })
  }

  check()
  if (window.navigation) {
    window.navigation.addEventListener('navigatesuccess', check)
  }
  // Fallback for history changes the Navigation API doesn't report.
  setInterval(check, 1000)
})()
