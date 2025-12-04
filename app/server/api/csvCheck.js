/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import formidable from "formidable";
import xlsx from "@e965/xlsx";
import fs from "fs";
import path from "path";
import Bree from "bree";

export default defineEventHandler(async (event) => {
  const uploadDir = path.join(process.cwd(), "tmp/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    multiples: false,
    uploadDir,
    keepExtensions: true,
  });

  const { files } = await new Promise((resolve, reject) =>
    form.parse(event.node.req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ files });
    })
  );

  // Correction: gérer le fait que "files.file" peut-être un tableau ou un objet, et robustesse du log
  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!uploadedFile?.filepath) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  console.log("KKKKL", files, uploadedFile?.filepath);
  const file = uploadedFile;

  const ext = path
    .extname(file.originalFilename || file.filepath)
    .toLowerCase();

  let rows = [];

  if (ext === ".xlsx") {
    const workbook = xlsx.readFile(file.filepath);
    const sheet = workbook.SheetNames[0];
    rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
  } else if (ext === ".csv") {
    const csvText = fs.readFileSync(file.filepath, "utf8");
    rows = xlsx.utils.sheet_to_json(
      xlsx.read(csvText, { type: "string" }).Sheets.Sheet1
    );
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: "Only CSV or XLSX files are accepted",
    });
  }
  try {
    if (file.filepath && fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }
  } catch (err) {
    console.error("Erreur lors de la suppression du fichier temporaire:", err);
    // Ici on n'interrompt pas le flux, mais on log l'erreur
  }
  const bree = new Bree({
    jobs: [
      {
        name: "processCsv", // Nom du job
        path: path.join(process.cwd(), "server/jobs/processCsv.js"), // Le chemin vers le fichier dans src/jobs
        worker: {
          workerData: { rows }, // Passez vos arguments ici
        },
      },
    ],
  });

  // Démarrer le job avec le contenu,
  await bree.start("processCsv");

  return { ok: true, message: "CSV job queued", rows };
});
