import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import assetModel from "./assetModel.js";
import classRoomModel from "./classRoomModel.js";

export default sequelize.define(
  "asset_location",
  {
    assetLocationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_location_id",
    },
    assetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_id",
      references: {
        model: assetModel,
        key: "asset_id",
      },
    },
    classRoomSectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "class_room_section_id",
      references: {
        model: classRoomModel,
        key: "class_room_section_id",
      },
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "count",
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
  },
  {
    tableName: "asset_locations",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);
