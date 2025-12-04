/* eslint-disable @stylistic/quote-props */
/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export async function sendPayment(user) {
  try {
    const payload = {
      from: {
        displayName: "Gouvernement Beninois", // ou dynamiquement
        idType: "MSISDN",
        idValue: "123456789", // ton identifiant payer
      },
      to: {
        idType: "MSISDN",
        idValue: user?.valeur_id.toString(), // depuis ton CSV
      },
      amountType: "SEND",
      currency: user?.devise.toString(), // depuis CSV
      amount: user?.montant.toString(),
      transactionType: "TRANSFER",
      note: `Paiement de pension a ${user?.nom_complet}`,
      homeTransactionId: uuidv4(), // unique
    };

    // const payload = sanitize(pay);

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

    console.log(`Paiement réussi pour ${user?.nom_complet}`, response?.data);
    return response?.data;
  } catch (err) {
    console.error(
      `Erreur paiement pour ${user?.nom_complet}`,
      err.response?.data || err.message
    );
    return { error: true, user, details: err.response?.data || err.message };
  }
}
