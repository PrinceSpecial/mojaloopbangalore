/* eslint-disable @stylistic/quotes */
/* eslint-disable @stylistic/semi */
import { Sequelize, DataTypes } from "sequelize";
import configJson from "../config/config.json";

// Import all model factories
import UserFactory from "./User";
import ExempleFactory from "./Exemple";

const env = process.env.NODE_ENV || "development";
// @ts-ignore
const config = configJson[env];

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable] as string, config)
  : new Sequelize(config.database, config.username, config.password, config);

// db contiendra des modèles Sequelize
const db: Record<string, any> = {};

// Initialize all models
const modelFactories = [
  UserFactory,
  ExempleFactory,
];

modelFactories.forEach((factory) => {
  const model = factory(sequelize, DataTypes);
  db[model.name] = model;
});

// Exécuter les associations
Object.values(db).forEach((model: any) => {
  if (typeof model.associate === "function") {
    model.associate(db);
  }
});

// Ajouter sequelize dans db
(db as any).sequelize = sequelize;
(db as any).Sequelize = Sequelize;

export default db;
