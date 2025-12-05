/* eslint-disable @stylistic/operator-linebreak */
/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import type { IncomingMessage } from "http";
import formidable from "formidable";
import type { Files, File as FormidableFile } from "formidable";
import xlsx from "@e965/xlsx";
import fs from "fs";
import path from "path";
import Bree from "bree";
import { defineEventHandler } from "h3";
import type { H3Event } from "h3";
import { generateCsvReport, sanitize } from "~~/shared/utils/sanitize";

type CsvRow = Record<string, unknown>;

export default defineEventHandler(async (event: H3Event) => {
  const uploadDir = path.join(process.cwd(), "tmp/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    multiples: false,
    uploadDir,
    keepExtensions: true,
  });

  // Use explicit typing with generics to fix: Property 'files' does not exist on type 'unknown'
  const { files } = await new Promise<{ files: Files }>((resolve, reject) =>
    form.parse(event.node.req as IncomingMessage, (err, fields, files) => {
      if (err) reject(err);
      resolve({ files }); // now typescript knows files is Files
    })
  );

  // Correction: handle "files.file" being an array or object, provide type safety
  const uploadedFile: FormidableFile | undefined = Array.isArray(files.file)
    ? files.file[0]
    : (files.file as unknown as FormidableFile);

  if (!uploadedFile?.filepath) {
    throw new Error("No file uploaded");
  }

  // Logging for debugging
  console.log("KKKKL", files, uploadedFile?.filepath);

  const ext = path
    .extname(uploadedFile.originalFilename || uploadedFile.filepath)
    .toLowerCase();

  let rows: CsvRow[] = [];

  if (ext === ".xlsx") {
    const workbook = xlsx.readFile(uploadedFile.filepath);
    const sheet = workbook.SheetNames[0];
    rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
  } else if (ext === ".csv") {
    const csvText = fs.readFileSync(uploadedFile.filepath, "utf8");
    rows = xlsx.utils.sheet_to_json(
      xlsx.read(csvText, { type: "string" }).Sheets.Sheet1
    );
  } else {
    throw new Error("Only CSV or XLSX files are accepted");
  }
  try {
    if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
      fs.unlinkSync(uploadedFile.filepath);
    }
  } catch (err) {
    console.error("Erreur lors de la suppression du fichier temporaire:", err);
    // Non-blocking: only logging the error
  }
  const refusedRows: CsvRow[] = [];
  const acceptedRows: CsvRow[] = [];

  const sanitizedRows = sanitize(rows);

  for (const row of sanitizedRows) {
    const result = validateCsvRow(row);

    if (!result.validatedRow) {
      refusedRows.push({
        ...row,
        status: "REFUSED",
        message: result.errorMessage,
      });
    } else {
      acceptedRows.push({
        ...row,
        status: "PENDING",
        message: "",
      });
    }
  }

  // Pour le job Bree on n’envoie que les lignes validées
  const payload = acceptedRows;

  console.log("PAYx Before", JSON.stringify(rows, null, 1));
  console.log("PAYx acceptedRows", JSON.stringify(payload, null, 1));
  console.log("PAYx refusedRows", JSON.stringify(refusedRows, null, 1));

  // Générer rapport pré-paiement
  const initialReport = generateCsvReport(
    refusedRows,
    `rapport_initial_${Date.now()}.csv`
  );

  const bree = new Bree({
    jobs: [
      {
        name: "processCsv",
        path: path.join(process.cwd(), "server/jobs/processCsv.ts"),
        worker: {
          workerData: { accepted: payload, refused: refusedRows },
          execArgv: [
            "--require",
            "ts-node/register",
            "--loader",
            "ts-node/esm",
          ],
        },
      },
    ],
  });

  // Démarrer le job
  await bree.start("processCsv");

  return {
    ok: true,
    message: "CSV job queued",
    rows,
    reportInitial: initialReport,
  };
});

function validateCsvRow(row: CsvRow) {
  const errors: string[] = [];

  const typeId = (row.type_id || "").toString().trim();
  const valeurId = (row.valeur_id || "").toString().trim();
  const devise = (row.devise || "").toString().trim();
  const montant = (row.montant || "").toString().trim();

  // 1) type_id
  if (!typeId) {
    errors.push("Le type est requis");
  } else if (!["PERSONAL_ID", "MSISDN"].includes(typeId)) {
    errors.push("Le type est invalide");
  }

  // 2) valeur_id numérique
  if (!valeurId) {
    errors.push("La valeur_id est requise");
  } else if (!/^\d+$/.test(valeurId)) {
    errors.push("valeur_id doit être un nombre");
  }

  // 3) PERSONAL_ID = 10 chiffres
  if (typeId === "PERSONAL_ID") {
    if (valeurId.length !== 10) {
      errors.push(
        "Pour PERSONAL_ID, valeur_id doit contenir exactement 10 chiffres"
      );
    }
  }

  // 4) devise
  const validDevises = ["XOF"];
  if (!devise) {
    errors.push("La devise est requise");
  } else if (!validDevises.includes(devise)) {
    errors.push("La devise doit être XOF");
  }

  // 5) montant
  if (!montant) {
    errors.push("Le montant est requis");
  } else if (isNaN(Number(montant)) || Number(montant) <= 0) {
    errors.push("Le montant doit être un nombre positif");
  }

  // Résultat final
  if (errors.length > 0) {
    return {
      validatedRow: false,
      errorMessage: errors.join(", "),
    };
  }

  return {
    validatedRow: true,
    errorMessage: "",
  };
}
