/* eslint-disable @stylistic/member-delimiter-style */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */

import { workerData } from "worker_threads";
import { sendPayment } from "../service/sendPayment.js";

// Enlever les types TypeScript, utiliser du JS pur

(async () => {
  try {
    const { rows } = workerData;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("Aucun utilisateur trouvé.");
      return;
    }
    console.log("Le########################", rows);

    const batchSize = 50; // Par exemple, envoyer 50 emails à la fois

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const csvProcessPromise = batch.map((user) => {
        console.log("Do this for", user);
        return sendPayment(user);
      });
      await Promise.all(csvProcessPromise);
    }

    console.log("Toutes les pensions ont été envoyées.");
  } catch (error) {
    console.error("Erreur lors de l'envoi des pensions :", error);
  }
})();
