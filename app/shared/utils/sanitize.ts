/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/member-delimiter-style */
/* eslint-disable @stylistic/arrow-parens */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */

// shared/utils/report.ts
import fs from "node:fs";
import path from "node:path";
import { utils } from "@e965/xlsx";

// export interface ReportRow {
//   [key: string]: string | number | undefined;
//   _rowIndex: number;
//   statut?: string;
//   message?: string;
// }
type ReportRow = Record<string, unknown>;

export function removeAccents(str = "") {
  if (typeof str !== "string") return str;
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Nettoie récursivement tout un objet (string + nested)

export function sanitize<T>(obj: T): T {
  if (obj == null) return obj;

  if (typeof obj === "string") {
    return removeAccents(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item)) as T;
  }

  if (typeof obj === "object") {
    // obj is object but not null or array
    const cleaned: { [key: string]: unknown } = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cleaned[key] = sanitize((obj as Record<string, unknown>)[key]);
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Construit un rapport unifié contenant :
 * - les lignes originales
 * - les lignes nettoyées
 * - les validations
 * - les lignes refusées
 * - les lignes acceptées
 */

export function buildReport(
  originalRows: ReportRow[],
  sanitizedRows: ReportRow[],
  acceptedRows: ReportRow[],
  refusedRows: ReportRow[]
): ReportRow[] {
  const report: ReportRow[] = [];

  for (const row of originalRows) {
    const index = row._rowIndex;

    const sanitized = sanitizedRows.find((s) => s._rowIndex === index);
    const refused = refusedRows.find((r) => r._rowIndex === index);
    const accepted = acceptedRows.find((a) => a._rowIndex === index);

    // Ligne supprimée par sanitize()
    if (!sanitized) {
      report.push({
        ...row,
        statut: "REFUSED",
        message: "La ligne a été supprimée lors du nettoyage des données.",
      });
      continue;
    }

    // Ligne refusée par validate()
    if (refused) {
      report.push({
        ...refused,
        statut: "REFUSED",
        message: refused.message,
      });
      continue;
    }

    // Ligne acceptée (en attente de paiement)
    if (accepted && typeof accepted._rowIndex === "number") {
      report.push({
        ...accepted,
        _rowIndex: accepted._rowIndex, // Ensure _rowIndex is present and a number
        statut: accepted.statut ?? "ACCEPTED",
        message: accepted.message ?? "",
      });
    } else {
      report.push({
        ...row,
        _rowIndex: typeof row._rowIndex === "number" ? row._rowIndex : 0, // fallback to 0 if not found, or you could throw
        statut: "ACCEPTED",
        message: "",
      });
    }
  }

  return report;
}

/**
 * Génère un fichier CSV dans tmp/reports
 */
export function generateCsvReport(rows: ReportRow[], filename: string): string {
  const worksheet = utils.json_to_sheet(rows);
  const csvContent = utils.sheet_to_csv(worksheet);

  const outDir = path.join(process.cwd(), "tmp/reports");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fullPath = path.join(outDir, filename);

  fs.writeFileSync(fullPath, csvContent, "utf8");

  return fullPath;
}
