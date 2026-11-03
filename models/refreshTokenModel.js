import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import userModel from "./userModel.js";

const refreshTokenModel = sequelize.define(
  "refresh_tokens",
  {
    refreshTokenId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      field: "refresh_token_id",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: userModel,
        key: "user_id",
      },
    },
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      field: "token_hash",
    },
    familyId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "family_id",
    },
    deviceInfo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "device_info",
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "user_agent",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_revoked",
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
    revokedReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "revoked_reason",
    },
    replacedByTokenId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "replaced_by_token_id",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at",
    },
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
    paranoid: false,
  }
);

refreshTokenModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default refreshTokenModel;
