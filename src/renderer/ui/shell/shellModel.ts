export type ShellActionId =
  | 'select'
  | 'pan'
  | 'lasso'
  | 'connect'
  | 'text'
  | 'sticky'
  | 'link'
  | 'swatch'
  | 'tag'
  | 'comparison'
  | 'youtube'
  | 'snap'
  | 'auto-arrange'
  | 'record'
  | 'voice'
  | 'presentation'
  | 'theme'
  | 'import'
  | 'boards'
  | 'assets'
  | 'new-board'
  | 'clone-board'
  | 'comment'
  | 'notes'
  | 'sequence'
  | 'export-pdf'
  | 'export-png'
  | 'export-zip'

export type ShellAction = {
  id: ShellActionId
  label: string
}

export type ShellSection = {
  id: string
  title: string
  items: ShellAction[]
}

export const commandSpineSections: ShellSection[] = [
  {
    id: 'select',
    title: 'Select',
    items: [
      { id: 'select', label: 'Select' },
      { id: 'pan', label: 'Pan' },
      { id: 'lasso', label: 'Lasso' },
      { id: 'connect', label: 'Bind' },
    ],
  },
  {
    id: 'create',
    title: 'Create',
    items: [
      { id: 'text', label: 'Text' },
      { id: 'sticky', label: 'Inscription' },
      { id: 'link', label: 'Link' },
      { id: 'swatch', label: 'Swatch' },
      { id: 'tag', label: 'Sigil' },
      { id: 'comparison', label: 'Compare' },
    ],
  },
  {
    id: 'media',
    title: 'Media',
    items: [
      { id: 'youtube', label: 'YouTube' },
      { id: 'record', label: 'Record' },
      { id: 'voice', label: 'Voice' },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'snap', label: 'Snap' },
      { id: 'auto-arrange', label: 'Arrange' },
      { id: 'presentation', label: 'Present' },
      { id: 'theme', label: 'Theme' },
    ],
  },
]

export const archiveRailSections: ShellSection[] = [
  {
    id: 'project',
    title: 'Project',
    items: [
      { id: 'import', label: 'Import' },
      { id: 'boards', label: 'Chambers' },
      { id: 'assets', label: 'Relics' },
      { id: 'new-board', label: 'New chamber' },
      { id: 'clone-board', label: 'Clone chamber' },
    ],
  },
  {
    id: 'mark',
    title: 'Mark',
    items: [
      { id: 'comment', label: 'Inscription' },
      { id: 'notes', label: 'Notes' },
      { id: 'sequence', label: 'Sequence' },
    ],
  },
  {
    id: 'output',
    title: 'Output',
    items: [
      { id: 'export-pdf', label: 'PDF' },
      { id: 'export-png', label: 'PNG' },
      { id: 'export-zip', label: 'Archive' },
    ],
  },
]

export function shellCanvasInset(presentationMode: boolean): string {
  return presentationMode ? '0px' : 'var(--archive-rail-w)'
}
