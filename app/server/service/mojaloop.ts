type CsvRow = Record<string, unknown>;
import fs from "fs";
import { emitPaymentProgress } from "../utils/paymentEvents";

export async function processPaymentsBatch(jobId: string, rows: CsvRow[]) {
    const file = `public/reports/${jobId}.csv`;
    const data = [];
    // Create a CSV file
    // put headers: type_id,valeur_id,devise,montant,nom_complet,statut,error_message
    const csvHeaders = "type_id,valeur_id,devise,montant,nom_complet,statut,error_message";
    await fs.writeFileSync(file, csvHeaders + "\n");

    console.log("FFT");
    await sleep(3000);

    let processed = 0;
    let failed = 0;
    let succeeded = 0;  

    // validate the rows
    for (const row of rows) {
        const {validatedRow, errorMessage} = validateRow(row);
        if (!validatedRow) {
            await fs.appendFileSync(file,row.type_id + "," + row.valeur_id + "," + row.devise + "," + row.montant + "," + (row.nom_complet || "") + ",ECHOUE," + errorMessage + "\n");
            
            data.push({
                row,
                status: 'ECHOUE',
                error: errorMessage
            });
            await sleep(3000);
            console.log("GTT");
            failed++;
            processed++;

            emitPaymentProgress(jobId, {
                type: 'payment_failed',
                error: errorMessage,
                data,
                progress: {
                    processed,
                    total: rows.length,
                    failed,
                    succeeded,
                    percentage: Math.round((processed / rows.length) * 100)
                }
            });
            
            continue;
        }

        try {
            // TODO: Appeler Mojaloop ici
            // const result = await mojaloopTransfer(validatedRow);

            await sleep(6000);

            console.log("wookey");
            
            await fs.appendFileSync(
                file,
                `${row.type_id},${row.valeur_id},${row.devise},${row.montant},${row.nom_complet || ""},SUCCES,\n`
            );

            data.push({
                row,
                status: 'SUCCES'
            });

            succeeded++;
            processed++;

            emitPaymentProgress(jobId, {
                type: 'payment_processed',
                payment: {
                    id: row.valeur_id,
                    type_id: row.type_id,
                    montant: row.montant,
                    devise: row.devise,
                    nom_complet: row.nom_complet,
                    status: 'SUCCES'
                },
                progress: {
                    processed,
                    total: rows.length,
                    failed,
                    succeeded,
                    percentage: Math.round((processed / rows.length) * 100)
                }
            });
        } catch (error) {
            failed++;
            processed++;
            
            await fs.appendFileSync(
                file,
                `${row.type_id},${row.valeur_id},${row.devise},${row.montant},${row.nom_complet || ""},ECHOUE,ERREUR\n`
            );

            data.push({
                row,
                status: 'ECHOUE',
                error: "error"
            });

            emitPaymentProgress(jobId, {
                type: 'payment_failed',
                error: "error",
                data,
                progress: {
                    processed,
                    total: rows.length,
                    failed,
                    succeeded,
                    percentage: Math.round((processed / rows.length) * 100)
                }
            });
        }
    }

    // ✅ CRITIQUE: Émettre l'événement de complétion
    emitPaymentProgress(jobId, {
        status: 'completed',
        data,
        summary: {
            total: rows.length,
            succeeded,
            failed,
            reportFile: `/reports/${jobId}.csv`
        }
    });

}

function validateRow(row: CsvRow) {
    const type_id = row.type_id as string;
    if (!type_id) {
        return {
            validatedRow: false,
            errorMessage: "Le type est invalide"
        };
    }
    if (!row.valeur_id) {
        return {
            validatedRow: false,
            errorMessage: "La valeur est invalide"
        };
    }
    if (!row.devise) {
        return {
            validatedRow: false,
            errorMessage: "La devise est invalide"
        };
    }
    if (!row.montant) {
        return {
            validatedRow: false,
            errorMessage: "Le montant est invalide"
        };
    }
    if (Number(row.montant) <= 0) {
        return {
            validatedRow: false,
            errorMessage: "Le montant est invalide"
        };
    }
    if(type_id !== "PERSONAL_ID" && type_id !== "MSISDN") {
        return {
            validatedRow: false,
            errorMessage: "Le type est invalide"
        };
    }
    return {
        validatedRow: true,
        errorMessage: ""
    };
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}