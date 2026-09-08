import { expect, test } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

let session: CitadelSession | undefined
test.beforeEach(async () => { session = await launchCitadel(); await openBoard(session.page) })
test.afterEach(async () => { await closeCitadel(session); session = undefined })

for (const extension of ['md', 'docx']) {
  test(`imports formatted ${extension}, edits and undoes without fetching external content`, async () => {
    const page = session!.page
    const path = join(session!.userDataDir, `research.${extension}`)
    if (extension === 'md') {
      await writeFile(path, '# Research heading\n\n**Evidence** and *context*.\n\n- First source\n- Second source\n\n[Reference](https://example.com)')
    } else {
      const zip = new JSZip()
      zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
      zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
      zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Evidence</w:t></w:r><w:r><w:t xml:space="preserve"> and </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>context</w:t></w:r></w:p></w:body></w:document>')
      await writeFile(path, await zip.generateAsync({ type: 'nodebuffer' }))
    }
    const requests: string[] = []
    page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
    await page.evaluate(({ path, extension }) => {
      const file = new File(['fixture'], `research.${extension}`)
      Object.defineProperty(file, 'path', { value: path })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      const target = document.querySelector('[data-vision-surface="canvas"] > div')
      if (!target) throw new Error('Canvas drop target missing')
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: 500, clientY: 350, dataTransfer }))
    }, { path, extension })
    const edit = page.getByRole('button', { name: 'Edit document', exact: true })
    await edit.click()
    const editor = page.getByRole('textbox', { name: 'Document Markdown' })
    await expect(editor).toBeVisible()
    const original = await editor.inputValue()
    expect(original).toContain('**Evidence**')
    expect(original).toContain('*context*')
    await editor.fill('# Revised heading\n\n**Updated evidence**')
    // Blurring commits the editor's existing single ITEM_STYLE event.
    await editor.evaluate((element) => (element as HTMLTextAreaElement).blur())
    await expect(editor).toHaveCount(0)
    await page.keyboard.press('Control+z')
    await edit.click()
    await expect(editor).toHaveValue(original)
    await editor.press('Escape')
    await page.keyboard.press('Control+Shift+z')
    await edit.click()
    await expect(editor).toHaveValue('# Revised heading\n\n**Updated evidence**')
    await editor.press('Escape')
    const projectPath = join(session!.userDataDir, 'formatted.citadel')
    await session!.app.evaluate(({ ipcMain }, path) => {
      ipcMain.removeHandler('file:saveDialog')
      ipcMain.handle('file:saveDialog', () => ({ path }))
      ipcMain.removeHandler('file:openDialog')
      ipcMain.handle('file:openDialog', () => ({ path }))
    }, projectPath)
    await session!.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('menu:save'))
    await expect.poll(() => readFile(projectPath, 'utf8').then(() => 'saved', () => 'pending')).toBe('saved')
    const saved = JSON.parse(await readFile(projectPath, 'utf8'))
    const meta = saved.boards[0].items[0].meta
    expect(meta.content).toBe('Revised heading\n\nUpdated evidence')
    expect(meta.richDocument.version).toBe(1)
    expect(meta.documentMarkdown).toBe('# Revised heading\n\n**Updated evidence**')
    await session!.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('menu:open'))
    await expect(edit).toHaveCount(0)
    await page.keyboard.press('Control+a')
    await edit.click()
    await expect(editor).toHaveValue('# Revised heading\n\n**Updated evidence**')
    await editor.press('Escape')
    expect(requests).toEqual([])
    await page.screenshot({ path: test.info().outputPath(`formatted-${extension}.png`) })
  })
}
