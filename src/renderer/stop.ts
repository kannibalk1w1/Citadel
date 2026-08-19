/**
 * The Stop control for click-through, as its own window.
 *
 * It cannot live inside the main window. Making a window click-through is
 * all-or-nothing in Electron, so keeping one patch of it clickable meant
 * watching where the pointer was and handing the mouse back as it arrived —
 * and no X client on a Wayland session can see the pointer while its window is
 * ignoring mouse events, so that reading never changed and the panel could
 * never be clicked. A separate window that simply never ignores the mouse needs
 * none of that, and behaves the same on all three platforms.
 *
 * Deliberately plain DOM: this is one button, and it has to be the most
 * reliable thing in the app.
 */
// Fonts before tokens, in the order main.tsx uses. dark.css only names the
// families; the @font-face rules live in fonts.css, so without it this window
// silently falls back to whatever sans-serif the host provides and stops
// matching the rest of the app.
import './theme/fonts.css'
import './theme/dark.css'

const EXIT_HINT = 'Ctrl+Alt+C'

const ipc = (window as unknown as {
  ipc?: { invoke: (channel: string, payload?: unknown) => Promise<unknown> }
}).ipc

function stop(): void {
  void ipc?.invoke('window:setMode', { clickThrough: false })
}

const root = document.getElementById('stop-root')!
root.className = 'stop-shell'
root.innerHTML = `
  <span class="stop-dot" aria-hidden="true"></span>
  <span class="stop-text">
    <span>Clicks pass through</span>
    <span class="stop-hint">${EXIT_HINT}</span>
  </span>
  <button type="button" id="stop-button" title="Stop click-through (${EXIT_HINT})">Stop</button>
`

// Announced rather than merely coloured: the main window looks unchanged when
// click-through turns on, so the state has to be stated.
root.setAttribute('role', 'status')
root.setAttribute('aria-live', 'polite')
root.setAttribute('aria-label', 'Click-through is on')

const button = document.getElementById('stop-button') as HTMLButtonElement
// Acts on press as well as click. While click-through is on the user is working
// in another application, so this is a background window — and a press on a
// background window can be consumed activating it, leaving no `click` to
// follow. `onclick` stays for the keyboard, where Enter and Space fire it
// without any mousedown.
button.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return
  event.preventDefault()
  stop()
})
button.addEventListener('click', stop)
