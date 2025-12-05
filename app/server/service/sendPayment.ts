/* eslint-disable @stylistic/operator-linebreak */
/* eslint-disable @stylistic/member-delimiter-style */
/* eslint-disable @stylistic/quote-props */
/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

interface CsvUser {
  valeur_id?: string | number;
  devise?: string;
  montant?: string | number;
  nom_complet?: string;
  [key: string]: unknown;
}

interface PaymentPayload {
  from: {
    displayName: string;
    idType: string;
    idValue: string;
  };
  to: {
    idType: string;
    idValue: string | undefined;
  };
  amountType: string;
  currency: string | undefined;
  amount: string | undefined;
  transactionType: string;
  note: string;
  homeTransactionId: string;
}

interface PaymentError {
  error: true;
  user: CsvUser;
  details: unknown;
}

export async function sendPayment(user: CsvUser): Promise<unknown | PaymentError> {
  try {
    const payload: PaymentPayload = {
      from: {
        displayName: "Gouvernement Beninois",
        idType: "MSISDN",
        idValue: "123456789",
      },
      to: {
        idType: "MSISDN",
        idValue: user?.valeur_id ? user.valeur_id.toString() : undefined,
      },
      amountType: "SEND",
      currency: user?.devise ? user.devise.toString() : undefined,
      amount: user?.montant ? user.montant.toString() : undefined,
      transactionType: "TRANSFER",
      note: `Paiement de pension a ${user.valeur_id}`,
      homeTransactionId: uuidv4(),
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
      `Paiement réussi pour ${user?.nom_complet ? user.nom_complet : ""}`
    );
    return response?.data;
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    
    console.error(
      `Erreur paiement pour ${user?.nom_complet ? user.nom_complet : ""}`,
      error?.response?.data || error?.message || error
    );
    
    return {
      error: true,
      user: user,
      details: error?.response?.data || error?.message || error,
    };
  }
}
