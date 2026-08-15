import React from 'react'

export type ToolIconName =
  | 'select'
  | 'pan'
  | 'lasso'
  | 'connect'
  | 'text'
  | 'code'
  | 'sticky'
  | 'link'
  | 'swatch'
  | 'tag'
  | 'comparison'
  | 'youtube'
  | 'snap'
  | 'autoArrange'
  | 'record'
  | 'recordStop'
  | 'voice'
  | 'presentation'
  | 'theme'

export const TOOL_ICON_NAMES: ToolIconName[] = [
  'select',
  'pan',
  'lasso',
  'connect',
  'text',
  'code',
  'sticky',
  'link',
  'swatch',
  'tag',
  'comparison',
  'youtube',
  'snap',
  'autoArrange',
  'record',
  'recordStop',
  'voice',
  'presentation',
  'theme',
]

type ToolIconProps = {
  name: ToolIconName
  size?: number
  className?: string
}

const S = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function iconPaths(name: ToolIconName): React.ReactNode {
  switch (name) {
    case 'select':
      return <path d="M7 4 L17 12 L12.5 13.5 L10 20 L7 4 Z" />
    case 'pan':
      return (
        <>
          <path d="M12 4 V20" />
          <path d="M4 12 H20" />
          <path d="M12 4 L9.5 6.5 M12 4 L14.5 6.5" />
          <path d="M12 20 L9.5 17.5 M12 20 L14.5 17.5" />
          <path d="M4 12 L6.5 9.5 M4 12 L6.5 14.5" />
          <path d="M20 12 L17.5 9.5 M20 12 L17.5 14.5" />
        </>
      )
    case 'lasso':
      return (
        <>
          <path d="M6 10.5 C6 6.5 18 6.5 18 10.5 C18 14.5 6 14.5 6 10.5 Z" />
          <path d="M12 14.5 C11.5 17 9.5 18.5 7 19" />
          <path d="M9 10.5 H15" />
        </>
      )
    case 'connect':
      return (
        <>
          <path d="M7 8 C4 8 4 16 7 16 C9 16 9.5 14.5 10 13.5" />
          <path d="M17 8 C20 8 20 16 17 16 C15 16 14.5 14.5 14 13.5" />
          <path d="M9 12 H15" />
        </>
      )
    case 'text':
      return (
        <>
          <path d="M5 6 H19" />
          <path d="M12 6 V19" />
          <path d="M9 19 H15" />
        </>
      )
    case 'code':
      return (
        <>
          <path d="M9 7 L4.5 12 L9 17" />
          <path d="M15 7 L19.5 12 L15 17" />
          <path d="M13.5 5.5 L10.5 18.5" />
        </>
      )
    case 'sticky':
      return (
        <>
          <path d="M7 5 H17 L19 8 V19 H7 Z" />
          <path d="M17 5 V9 H19" />
          <path d="M10 12 H16 M10 15 H14" />
        </>
      )
    case 'link':
      return (
        <>
          <path d="M9.5 14.5 L14.5 9.5" />
          <path d="M10 8 L8.5 6.5 C6.8 4.8 4 6 4 8.4 C4 9.1 4.3 9.8 4.8 10.3 L7 12.5" />
          <path d="M14 16 L15.5 17.5 C17.2 19.2 20 18 20 15.6 C20 14.9 19.7 14.2 19.2 13.7 L17 11.5" />
        </>
      )
    case 'swatch':
      return (
        <>
          <path d="M6 18 L10 6" />
          <path d="M10 18 L14 6" />
          <path d="M14 18 L18 6" />
          <path d="M5 18 H19" />
        </>
      )
    case 'tag':
      return (
        <>
          <path d="M5 6 H13 L19 12 L13 18 H5 Z" />
          <circle cx="9" cy="12" r="1.4" />
        </>
      )
    case 'comparison':
      return (
        <>
          <rect x="5" y="6" width="14" height="12" rx="1.5" />
          <path d="M12 6 V18" />
          <path d="M8.5 10 V14 M15.5 10 V14" />
        </>
      )
    case 'youtube':
      return (
        <>
          <rect x="4" y="7" width="16" height="10" rx="2" />
          <path d="M10.5 10 L14.5 12 L10.5 14 Z" />
        </>
      )
    case 'snap':
      return (
        <>
          <path d="M6 5 V19 M18 5 V19 M5 6 H19 M5 18 H19" />
          <path d="M9 9 H15 V15 H9 Z" />
        </>
      )
    case 'autoArrange':
      return (
        <>
          <path d="M6 7 H10 V11 H6 Z" />
          <path d="M14 5 H18 V9 H14 Z" />
          <path d="M14 15 H18 V19 H14 Z" />
          <path d="M10 9 C13 9 13 7 14 7" />
          <path d="M10 11 C13 11 13 17 14 17" />
        </>
      )
    case 'record':
      return (
        <>
          <path d="M4.5 12 C7 7.5 17 7.5 19.5 12 C17 16.5 7 16.5 4.5 12 Z" />
          <circle cx="12" cy="12" r="2.8" />
        </>
      )
    case 'recordStop':
      return (
        <>
          <path d="M4.5 12 C7 7.5 17 7.5 19.5 12 C17 16.5 7 16.5 4.5 12 Z" />
          <rect x="9.3" y="9.3" width="5.4" height="5.4" rx="0.8" />
        </>
      )
    case 'voice':
      return (
        <>
          <path d="M9 5 H15 V13 C15 15 13.5 16 12 16 C10.5 16 9 15 9 13 Z" />
          <path d="M6 12 C6 16 8.5 18 12 18 C15.5 18 18 16 18 12" />
          <path d="M12 18 V21 M9 21 H15" />
        </>
      )
    case 'presentation':
      return (
        <>
          <path d="M6 19 L12 4 L18 19" />
          <path d="M8.5 14 H15.5" />
          <path d="M10 19 H14" />
        </>
      )
    case 'theme':
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5 A7 7 0 0 0 12 19 A3.8 7 0 0 1 12 5 Z" />
        </>
      )
  }
}

export function ToolIcon({ name, size = 18, className }: ToolIconProps): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-testid={`tool-icon-${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      focusable="false"
      {...S}
    >
      {iconPaths(name)}
    </svg>
  )
}
