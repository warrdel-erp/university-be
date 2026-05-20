import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import users from "./userModel.js";

export default sequelize.define(
  "library_category",
  {
    libraryCategoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "library_category_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "created_by",
      references: {
        model: users,
        key: "user_id",
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "updated_by",
      references: {
        model: users,
        key: "user_id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at",
    },
  },
  {
    tableName: "library_category",
    timestamps: true,
    paranoid: false,
    charset: "latin1",
    collate: "latin1_swedish_ci",
  }
);
