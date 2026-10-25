// Minimal typings for dropzone v6 (no bundled types; @types/dropzone targets v5)
declare module 'dropzone' {
  export interface DropzoneFile extends File {
    status?: string
  }

  export interface DropzoneOptions {
    url: string
    thumbnailWidth?: number
    maxFilesize?: number
    acceptedFiles?: string
    headers?: Record<string, string>
    dictDefaultMessage?: string
    init?: (this: Dropzone) => void
  }

  export default class Dropzone {
    static autoDiscover: boolean
    constructor(element: string | HTMLElement, options: DropzoneOptions)
    on(event: 'addedfile', callback: (file: DropzoneFile) => void): this
    on(event: 'success', callback: (file: DropzoneFile, response: unknown) => void): this
    on(event: 'error', callback: (file: DropzoneFile, error: string | Error) => void): this
    on(event: string, callback: (...args: unknown[]) => void): this
    destroy(): void
  }
}
