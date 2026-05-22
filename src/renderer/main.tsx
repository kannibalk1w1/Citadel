import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './theme/dark.css'
import './theme/light.css'
import './theme/gothicChrome.css'

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Citadel] Root crash:', error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      const e = this.state.error
      return (
        <div style={{
          background: '#070808', color: '#b99455', padding: 24,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
          whiteSpace: 'pre-wrap', height: '100vh', overflow: 'auto',
        }}>
          <div style={{ color: '#6f1717', fontSize: 14, marginBottom: 12 }}>RENDER ERROR — check DevTools for full stack</div>
          <div style={{ color: '#e3ded4', marginBottom: 8 }}>{e.message}</div>
          <div style={{ color: '#675f54' }}>{e.stack}</div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)
