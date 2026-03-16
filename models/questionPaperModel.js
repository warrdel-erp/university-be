import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";

const questionPaperModel = sequelize.define(
    "question_paper",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "id",
        },

        questionPaper: {
            type: DataTypes.JSON,
            allowNull: false,
            field: "question_paper",
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
        tableName: "question_paper",
        timestamps: true,
    }
);

export default questionPaperModel;
