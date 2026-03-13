// lib/csv.ts
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

type CsvRow = Record<string, string>;

const cache = new Map<string, CsvRow[]>();

export async function loadCsv(fileName: string): Promise<CsvRow[]> {
  if (cache.has(fileName)) return cache.get(fileName)!;

  const filePath = path.join(process.cwd(), "data", fileName);
  const content = await fs.readFile(filePath, "utf-8");

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as CsvRow[];

  cache.set(fileName, rows);
  return rows;
}

// Optional: if you ever want to reload after replacing CSVs
export function clearCsvCache() {
  cache.clear();
}