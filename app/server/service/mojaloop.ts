import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import xlsx from "@e965/xlsx";
import type { File as FormidableFile } from "formidable";
import csvParser from "csv-parser";

type CsvRow = Record<string, string>;

interface Data {
  type_id: string;
  valeur_id: string;
  devise: string;
  montant: string;
  nom_complet: string;
  statut: string;
  error_message: string;
}

interface Transfer {
  transferId: string;
  to: { idType: string; idValue: string };
  payeeFsp: string;
  amountType: string;
  currency: string;
  transferAmount: { currency: string; amount: string };
  transactionType: string;
  ilpPacket: string;
  payee: { partyIdType: string; partyId: string };
  condition: string;
}

interface BatchState {
  processed: number;
  failed: number;
  succeeded: number;
  dataBuffer: Data[];
  writeStream: fs.WriteStream;
}

export async function processPaymentsBatch(
  jobId: string,
  uploadedFile: FormidableFile,
  ext: string
) {
  const reportFilePath = `public/reports/${jobId}.csv`;
  
  const writeStream = fs.createWriteStream(reportFilePath);
  
  // Write Headers
  writeStream.write(
    "type_id,valeur_id,devise,montant,nom_complet,statut,error_message\n"
  );

  const state: BatchState = {
    processed: 0,
    failed: 0,
    succeeded: 0,
    dataBuffer: [],
    writeStream: writeStream,
  };

  try {
    if (ext === ".csv") {
      await processCsvStream(uploadedFile.filepath, state);
    } else if (ext === ".xlsx") {
      await processXlsx(uploadedFile.filepath, state);
    }

    if (state.dataBuffer.length > 0) {
      await sendToMojaloop(state.dataBuffer);
      state.dataBuffer = [];
    }

  } catch (err) {
    console.error("Batch processing failed", err);
  } finally {
    state.writeStream.end();
    if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
      try {
        fs.unlinkSync(uploadedFile.filepath);
      } catch (e) {
        console.error("Could not delete temp file", e);
      }
    }
    console.log(`Job ${jobId} finished: ${state.processed} rows processed.`);
  }
}

function processCsvStream(filepath: string, state: BatchState): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
      .pipe(csvParser())
      .on("data", (row: CsvRow) => {
        handleSingleRow(row, state);
      })
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}


async function processXlsx(filepath: string, state: BatchState) {
  const workbook = xlsx.readFile(filepath);
  const sheet = workbook.SheetNames[0];
  const rows: CsvRow[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);

  for (const row of rows) {
    await handleSingleRow(row, state);
    
    if (state.processed % 500 === 0) {
        await new Promise(r => setImmediate(r)); 
    }
  }
}


async function handleSingleRow(row: CsvRow, state: BatchState) {
  const { validatedRow, errorMessage } = validateRow(row);

  if (!validatedRow) {
    state.failed++;
    state.processed++;
    state.writeStream.write(
      `${row.type_id || ""},${row.valeur_id || ""},${row.devise || ""},${
        row.montant || ""
      },${row.nom_complet || ""},ECHOUE,${errorMessage}\n`
    );
    return;
  }

  state.succeeded++;
  state.processed++;

  state.writeStream.write(
    `${row.type_id},${row.valeur_id},${row.devise},${row.montant},${
      row.nom_complet || ""
    },SUCCES,\n`
  );

  state.dataBuffer.push({
    type_id: row.type_id,
    valeur_id: row.valeur_id,
    devise: row.devise,
    montant: row.montant,
    nom_complet: row.nom_complet,
    statut: "SUCCES",
    error_message: "",
  });

  if (state.dataBuffer.length >= 100) {
    await sendToMojaloop(state.dataBuffer);
    state.dataBuffer = [];
  }
}

async function sendToMojaloop(data: Data[]) {
  const payload = buildPayload(data);
  // TODO: Call Mojaloop
}

function buildPayload(data: Data[]) {
    const individualTransfers: Transfer[] = data.map((item) => ({
      transferId: uuidv4(),
      to: {
        idType: item.type_id,
        idValue: item.valeur_id,
      },
      payeeFsp: "testingdfsp",
      amountType: "SEND",
      currency: item.devise,
      transferAmount: {
        currency: item.devise,
        amount: item.montant,
      },
      transactionType: "TRANSFER",
      ilpPacket: generateRandomString(2), 
      payee: { partyIdType: item.type_id, partyId: item.valeur_id },
      condition: generateRandomString(43), 
    }));
  
    const payload = {
      homeTransactionId: uuidv4(),
      bulkTransferId: uuidv4(),
      bulkQuoteId: uuidv4(),
      payeeFsp: "testingdfsp",
      payerFsp: "itk-load-test-dfsp",
      from: {
        displayName: "John Doe",
        idType: "PHONE",
        idValue: "22912345677",
      },
      individualTransfers: individualTransfers,
      expiration: "2025-12-31T23:59:59.000Z",
    };
  
    return payload;
  }

function validateRow(row: CsvRow) {
    const validTypeIds = ["PERSONAL_ID", "MSISDN"];
    const validDevises = ["XOF"];
  
    const errors: string[] = [];
  
    // Type Validation
    if (!row.type_id || typeof row.type_id !== "string") {
      errors.push("Le type est invalide");
    } else if (!validTypeIds.includes(row.type_id)) {
      errors.push("Le type est invalide");
    }
  
    // Value Verification
    if (!row.valeur_id) {
      errors.push("La valeur est invalide");
    } else {
      const valeurIdNumber = Number(row.valeur_id);
      if (isNaN(valeurIdNumber)) {
        errors.push("La valeur doit être un nombre");
      }
    }
  
    // If type_id is PERSONAL_ID, valeur_id must be 10 digits
    if (row.type_id === "PERSONAL_ID" && row.valeur_id) {
      const valeurIdStr = row.valeur_id.toString();
      if (valeurIdStr.length !== 10 || !/^\d{10}$/.test(valeurIdStr)) {
        errors.push("La valeur doit comporter 10 chiffres");
      }
    }
  
    // Devise Verification
    if (!row.devise || typeof row.devise !== "string") {
      errors.push("La devise est invalide");
    } else if (!validDevises.includes(row.devise)) {
      errors.push("La devise n'est pas autorisée");
    }
  
    // Amount Verification
    if (!row.montant) {
      errors.push("Le montant est invalide");
    } else {
      const montantNumber = parseFloat(row.montant);
      if (isNaN(montantNumber) || montantNumber <= 0) {
        errors.push("Le montant doit être un nombre positif");
      }
    }
  
    if (errors.length > 0) {
      const message = formatErrors(errors);
      return {
        validatedRow: false,
        errorMessage: message,
      };
    }
  
    return { validatedRow: true, errorMessage: "" };
  }
  
  function formatErrors(errors: string[]): string {
      if (errors.length === 1) {
        return errors[0];
      }
      const allButLast = errors.slice(0, -1).join("; ");
      const last = errors[errors.length - 1];
      return `${allButLast} et ${last}`;
    }
  
  function generateRandomString(length: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }