/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import db from "../../models";

/**
 * Charge et retourne les modèles Sequelize
 */
export function getModels() {
  return db;
}

/**
 * Raccourci pour accéder directement à un modèle
 * @param modelName - Nom du modèle (ex: 'User')
 */
export function getModel(modelName: string) {
  const models = getModels();
  return models[modelName];
}
