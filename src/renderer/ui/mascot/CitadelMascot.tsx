import React from 'react'

type Props = { size?: number; state?: 'rest' | 'unsaved' | 'saved' | 'recording' }

/**
 * Citadel's repo-authored rail mark.
 *
 * The forms stay broad because this is most often read at 22px. The gate is
 * the only stateful part, so a save or recording is visible without making the
 * small silhouette compete with the workspace.
 */
export function CitadelMascot({ size = 26, state = 'rest' }: Props): React.ReactElement {
  const gateFill = state === 'saved'
    ? 'var(--accent)'
    : state === 'recording'
      ? 'var(--accent-danger)'
      : 'var(--bg-panel)'

  return (
    <svg
      viewBox="0 0 44 60"
      width={size}
      height={size * (60 / 44)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      <path
        data-part="outcrop"
        fill="var(--text-secondary)"
        d="M2 59 8 55l5 1 4-5h10l4 5 5-1 6 4H2Z"
      />
      <path
        data-part="tower"
        fill="var(--text-secondary)"
        d="M9 51V28h3v-5h2v-7l2-5 2 5v7h2V14l2-10 2 10v9h2v-7l2-5 2 5v7h2v5h3v23H9Z"
      />
      {/* Keeping the gate as a single negative shape gives the state colour a clear home. */}
      <path
        data-part="gate"
        fill={gateFill}
        d="M17 51V43c0-6 10-6 10 0v8H17Z"
      />
      <path data-part="window" fill="var(--bg-panel)" d="M20 29v-5c0-3 4-3 4 0v5h-4Z" />
    </svg>
  )
}
