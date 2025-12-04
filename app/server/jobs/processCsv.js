/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import { workerData } from "worker_threads";
import { sendPayment } from "../service/sendPayment.js";

(async () => {
  try {
    const { rows } = workerData;

    if (!rows.length) {
      console.log("Aucun utilisateur trouvé.");
      return;
    }
    console.log("Le########################", rows);

    const batchSize = 50; // Par exemple, envoyer 50 emails à la fois

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize); // Prends seulement les 50 éléments du lot
      const csvProcessPromise = batch.map((user) => {
        console.log("Do this for", user);
        return sendPayment(user); // ou ton traitement asynchrone
      });
      await Promise.all(csvProcessPromise); // Attend ce lot avant de passer au suivant
    }

    console.log("Toutes les pensions ont été envoyés.");
  } catch (error) {
    console.error("Erreur lors de l'envoie des pensions :", error);
  }
})();
