/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
// server/utils/database.ts
import { Sequelize } from "sequelize";
import { useRuntimeConfig } from "#imports";

const config = useRuntimeConfig();

const sequelize = new Sequelize(
  config.dbName || "nuxt_db",
  config.dbUser || "root",
  config.dbPassword || "",
  {
    host: config.dbHost || "localhost",
    port: config.dbPort || 8889,
    dialect: "mysql",
    timezone: "+01:00",
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
      timestamps: true,
      underscored: true,
      paranoid: false,
    },
    logging: (sql: string, timing?: number) => {
      if (config.public.appEnv === "development") {
        console.log(`[Sequelize] ${sql} ${timing ? `- ${timing}ms` : ""}`);
      }
    },
  }
);

// Test de connexion
export async function initializeDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion MySQL établie avec succès");

    // Synchronisation en développement uniquement
    if (config.public.appEnv === "development") {
      await sequelize.sync({ alter: true });
    }
  } catch (error) {
    console.error("❌ Erreur de connexion MySQL:", error);
    throw error;
  }
}

export async function initializeDatabasee() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion MySQL établie");

    // ⚠️ En dev uniquement
    if (config.public.appEnv === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ Modèles synchronisés (dev)");
    }
  } catch (error) {
    console.error("❌ Erreur MySQL :", error);
    throw error;
  }
}

export default sequelize;
