/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import type { IncomingMessage } from "http";
import formidable from "formidable";
import type { Files, File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";
import { defineEventHandler } from "h3";
import type { H3Event } from "h3";
import { processPaymentsBatch } from "~~/server/service/mojaloop";

type CsvRow = Record<string, string>;

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

  if(ext !== ".csv" && ext !== ".xlsx") {
    throw new Error("Only CSV or XLSX files are accepted");
  }

  const jobId = `batch_${Date.now()}`;
  console.log("ABC")
  processPaymentsBatch(jobId, uploadedFile, ext);
  console.log("DEF")
  
  return { jobId };

});


