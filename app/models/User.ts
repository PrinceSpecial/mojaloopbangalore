/* eslint-disable @stylistic/comma-dangle */
/* eslint-disable @stylistic/semi */
/* eslint-disable @stylistic/quotes */
import type { DataTypes, Sequelize } from "sequelize";
import { Model } from "sequelize";

export default (
  sequelizeInstance: Sequelize,
  dataTypes: typeof DataTypes
) => {
  class User extends Model {
    id!: number;
    name!: string;
    email!: string;
    createdAt!: Date;
    updatedAt!: Date;
  }
  User.init(
    {
      id: {
        type: dataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: dataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: "users",
    }
  );

  return User;
};
