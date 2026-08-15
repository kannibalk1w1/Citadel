// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { CodeItem } from './CodeItem'

vi.mock('./DOMItem', () => ({
  DOMItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const item: CanvasItem = {
  id: 'code-1', type: 'code', x: 0, y: 0, width: 500, height: 300,
  rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
  meta: { language: 'typescript', code: "const title = 'Citadel'\n// archive" },
}

describe('CodeItem', () => {
  it('renders a labelled terminal card with code and a copy control', () => {
    render(<CodeItem item={item} domOnly />)

    expect(screen.getByLabelText('typescript code snippet')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy()
    expect(screen.getByText('const')).toBeTruthy()
    expect(screen.getByText('// archive')).toBeTruthy()
  })
})
