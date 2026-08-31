import { apiFetchBlob } from './api'

export type DocumentBotType = 'arena' | 'box_academy' | 'fs_academy'

export interface DocumentExtractPayload {
  bot_type: DocumentBotType
  start_date: string
  end_date: string
}

function fallbackFilename(payload: DocumentExtractPayload): string {
  return `${payload.bot_type}-report-${payload.start_date}-${payload.end_date}.pdf`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function generateDocumentReport(payload: DocumentExtractPayload): Promise<string> {
  const { blob, filename } = await apiFetchBlob('/documents/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
    },
    body: JSON.stringify(payload),
  })
  const resolvedFilename = filename || fallbackFilename(payload)
  downloadBlob(blob, resolvedFilename)
  return resolvedFilename
}
