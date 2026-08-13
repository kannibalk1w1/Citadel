import React from 'react'

type ShellFrameProps = {
  presentationMode: boolean
  archiveRailCollapsed: boolean
  topBar?: React.ReactNode
  commandSpine?: React.ReactNode
  canvas: React.ReactNode
  archiveRail?: React.ReactNode
  contextDeck?: React.ReactNode
  presentationOverlay?: React.ReactNode
  globalOverlays?: React.ReactNode
}

export function ShellFrame({
  presentationMode,
  archiveRailCollapsed,
  topBar,
  commandSpine,
  canvas,
  archiveRail,
  contextDeck,
  presentationOverlay,
  globalOverlays,
}: ShellFrameProps): React.ReactElement {
  return (
    <div
      className={presentationMode ? 'app-root citadel-shell citadel-shell-presentation' : 'app-root citadel-shell'}
      data-shell-mode={presentationMode ? 'presentation' : 'workbench'}
      data-archive-rail-collapsed={archiveRailCollapsed}
    >
      <div className="citadel-shell-canvas">{canvas}</div>
      {!presentationMode && topBar && <div className="citadel-shell-topbar">{topBar}</div>}
      {!presentationMode && commandSpine && <div className="citadel-shell-command-spine">{commandSpine}</div>}
      {!presentationMode && archiveRail && <aside className="citadel-shell-archive-rail">{archiveRail}</aside>}
      {!presentationMode && contextDeck && <div className="citadel-shell-context-deck">{contextDeck}</div>}
      {presentationMode && presentationOverlay}
      {globalOverlays}
    </div>
  )
}
