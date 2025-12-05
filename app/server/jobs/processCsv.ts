/* eslint-disable @stylistic/member-delimiter-style */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */

import { workerData } from "worker_threads";
import { generateCsvReport } from "../../shared/utils/sanitize";
import { sendPayment } from "../service/sendPayment";

type CsvRow = Record<string, unknown>;

interface WorkerData {
  accepted: CsvRow[];
  refused: CsvRow[];
}

interface ProcessedRow extends CsvRow {
  status: "SUCCESS" | "FAILED" | "REFUSED";
  message: string;
}

interface PaymentResult {
  error?: boolean;
  details?: unknown;
  [key: string]: unknown;
}

(async () => {
  try {
    const { accepted, refused: refusedRows } = workerData as WorkerData;

    if (!Array.isArray(accepted) || accepted.length === 0) {
      console.log("Aucun utilisateur à traiter.");
      
      // Générer rapport final avec seulement les lignes refusées
      if (refusedRows && refusedRows.length > 0) {
        const finalReport = generateCsvReport(
          refusedRows,
          `rapport_final_${Date.now()}.csv`
        );
        console.log("Rapport final généré:", finalReport);
      }
      return;
    }

    console.log("Traitement de", accepted.length, "paiements...");

    const batchSize = 50;
    const processedRows: ProcessedRow[] = [];

    // Traiter les paiements par batch
    for (let i = 0; i < accepted.length; i += batchSize) {
      const batch = accepted.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (user) => {
          console.log("Traitement du paiement pour:", user.valeur_id);
          const result = await sendPayment(user);
          return { user, result };
        })
      );

      // Analyser les résultats de chaque paiement
      for (const promiseResult of batchResults) {
        if (promiseResult.status === "fulfilled") {
          const { user, result } = promiseResult.value as { 
            user: CsvRow; 
            result: PaymentResult 
          };
          
          if (result && result.error) {
            // Paiement échoué
            processedRows.push({
              ...user,
              status: "FAILED",
              message: typeof result.details === "string" 
                ? result.details 
                : JSON.stringify(result.details),
            });
          } else {
            // Paiement réussi
            processedRows.push({
              ...user,
              status: "SUCCESS",
              message: "Paiement effectué avec succès",
            });
          }
        } else {
          // Promise rejetée (erreur inattendue)
          const userIndex = batchResults.indexOf(promiseResult);
          const user = batch[userIndex];
          processedRows.push({
            ...user,
            status: "FAILED",
            message: promiseResult.reason?.message || "Erreur inconnue",
          });
        }
      }
    }

    // Combiner toutes les lignes : refusées + traitées
    const allRows: ProcessedRow[] = [
      ...(refusedRows || []) as ProcessedRow[],
      ...processedRows,
    ];

    // Générer le rapport final
    const finalReport = generateCsvReport(
      allRows,
      `rapport_final_${Date.now()}.csv`
    );

    console.log("✅ Traitement terminé.");
    console.log("📊 Rapport final généré:", finalReport);
    console.log("📈 Statistiques:");
    console.log("  - Total lignes:", allRows.length);
    console.log("  - Refusées (validation):", (refusedRows || []).length);
    console.log("  - Succès:", processedRows.filter(r => r.status === "SUCCESS").length);
    console.log("  - Échecs:", processedRows.filter(r => r.status === "FAILED").length);

  } catch (error) {
    console.error("❌ Erreur lors du traitement des pensions:", error);
  }
})();
