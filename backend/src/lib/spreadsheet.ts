import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'

/** Convertit une cellule ExcelJS (texte riche, formule, nombre, bool...) en string simple */
export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text // rich text
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue) // formule
    if (value instanceof Date) return value.toISOString()
  }
  return String(value).trim()
}

export async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook()
  // exceljs redéclare son propre type ambiant "Buffer" (bug connu de ses .d.ts, incompatible
  // avec le Buffer générique de @types/node récent) — cast type-only, sans effet runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any)
  const ws = wb.worksheets[0]
  if (!ws) return []

  const headers: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value)
  })

  const records: Record<string, string>[] = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const record: Record<string, string> = {}
    let hasValue = false
    headers.forEach((h, colNumber) => {
      if (!h) return
      const str = cellToString(row.getCell(colNumber).value)
      if (str) hasValue = true
      record[h] = str
    })
    if (hasValue) records.push(record)
  }
  return records
}

export async function parseSpreadsheet(buffer: Buffer, isXlsx: boolean): Promise<Record<string, string>[]> {
  if (isXlsx) return parseXlsx(buffer)
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[]
}
