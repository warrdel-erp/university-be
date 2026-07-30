import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";

const gradingModel = sequelize.define(
    "grading",
    {
        gradingId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            field: "grading_id",
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "university_id",
            references: {
                model: universityModel,
                key: "university_id",
            },
        },
        gradingName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "grading_name",
        },
        gradingCode: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: "grading_code",
        },
        gradingMethod: {
            type: DataTypes.ENUM("ABSOLUTE", "RELATIVE"),
            allowNull: false,
            field: "grading_method",
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: "description",
        },
        status: {
            type: DataTypes.ENUM("DRAFT", "PUBLISHED"),
            defaultValue: "DRAFT",
            allowNull: false,
            field: "status",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: "is_active",
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "created_by",
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "updated_by",
        },
    },
    {
        tableName: "grading",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

gradingModel.scopeConfig = {
    university: true,
    institute: false,
    academicYear: false,
};

export default gradingModel;
