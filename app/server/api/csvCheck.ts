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

  // const payload = sanitize(rows);

  const bree = new Bree({
    jobs: [
      {
        name: "processCsv",
        path: path.join(process.cwd(), "server/jobs/processCsv.js"),
        worker: {
          workerData: { rows },
        },
      },
    ],
  });

  // Démarrer le job
  await bree.start("processCsv");

  return { ok: true, message: "CSV job queued", rows };
});
