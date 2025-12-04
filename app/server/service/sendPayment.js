/* eslint-disable @stylistic/operator-linebreak */
/* eslint-disable @stylistic/member-delimiter-style */
/* eslint-disable @stylistic/quote-props */
/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Suppression des types TypeScript, passage au JS pur

async function sendPayment(user) {
  try {
    const payload = {
      from: {
        displayName: "Gouvernement Beninois", // ou dynamiquement
        idType: "MSISDN",
        idValue: "123456789", // ton identifiant payer
      },
      to: {
        idType: "MSISDN",
        idValue: user && user.valeur_id ? user.valeur_id.toString() : undefined, // depuis ton CSV
      },
      amountType: "SEND",
      currency: user && user.devise ? user.devise.toString() : undefined, // depuis CSV
      amount: user && user.montant ? user.montant.toString() : undefined,
      transactionType: "TRANSFER",
      note: `Paiement de pension a ${
        user && user.nom_complet ? user.nom_complet : ""
      }`,
      homeTransactionId: uuidv4(), // unique
    };

    const response = await axios.post(
      "http://localhost:4001/transfers",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log(
      `Paiement réussi pour ${
        user && user.nom_complet ? user.nom_complet : ""
      }`,
      response && response.data
    );
    return response && response.data;
  } catch (err) {
    // Enlever la gestion de type Error/TypeScript, JS simple
    // Axios met ses infos d'erreur sur "err.response" quand c'est une erreur HTTP
    console.error(
      `Erreur paiement pour ${
        user && user.nom_complet ? user.nom_complet : ""
      }`,
      (err && err.response && err.response.data) || (err && err.message) || err
    );
    return {
      error: true,
      user: user,
      details:
        (err && err.response && err.response.data) ||
        (err && err.message) ||
        err,
    };
  }
}

export { sendPayment };
