/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import { defineEventHandler } from "h3";
import { getModel } from "../db/models";

// Handler API pour récupérer les users
export default defineEventHandler(async (_event) => {
  try {
    const User = getModel("User");
    const Exemple = getModel("Exemple");

    if (!User) {
      return {
        error: "Modèle User non trouvé",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await (User as any).findAll();
    const exemples = await (Exemple as any).findAll();
    return { users, exemples };
  } catch (error: unknown) {
    console.error("Error in /api/users:", error);
    return {
      error: "Erreur lors de la récupération des utilisateurs",
      details: error instanceof Error ? error.message : String(error),
    };
  }
});
