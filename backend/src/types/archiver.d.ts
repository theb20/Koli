// archiver@8 ne fournit plus de types (ni bundlés, ni via @types/archiver,
// devenu obsolète face à sa nouvelle API à base de classes nommées) —
// déclaration minimale couvrant l'usage réel du projet (settings.ts,
// export ZIP des images). À étendre si un nouvel usage l'exige.
declare module 'archiver' {
  import type { Writable } from 'stream'

  export interface ZipArchiveOptions {
    zlib?: { level?: number }
  }

  export class ZipArchive {
    constructor(options?: ZipArchiveOptions)
    pipe(destination: Writable): void
    directory(dirpath: string, destpath: string | false): this
    finalize(): Promise<void>
    pointer(): number
    on(event: 'error' | 'warning', listener: (err: Error) => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
  }
}
