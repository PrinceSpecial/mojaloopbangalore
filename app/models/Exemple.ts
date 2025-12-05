/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import type { DataTypes, Sequelize } from "sequelize";
import { Model } from "sequelize";

export default (
  sequelizeInstance: Sequelize,
  dataTypes: typeof DataTypes
) => {
  class Exemple extends Model {
    id!: number;
    email!: string;
    createdAt!: Date;
    updatedAt!: Date;
  }
  Exemple.init(
    {
      id: {
        type: dataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: dataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: "exemples",
    }
  );

  return Exemple;
};
