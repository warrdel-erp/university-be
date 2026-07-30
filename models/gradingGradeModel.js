import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import gradingModel from "./gradingModel.js";

const gradingGradeModel = sequelize.define(
    "grading_grade",
    {
        gradingGradeId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            field: "grading_grade_id",
        },
        gradingId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "grading_id",
            references: {
                model: gradingModel,
                key: "grading_id",
            },
        },
        grade: {
            type: DataTypes.STRING(10),
            allowNull: false,
            field: "grade",
        },
        minPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            field: "min_percentage",
        },
        maxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            field: "max_percentage",
        },
        gradePoint: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: false,
            field: "grade_point",
        },
        resultLabel: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "result_label",
        },
        remarks: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "remarks",
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "sort_order",
        },
        isPass: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: "is_pass",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: "is_active",
        },
    },
    {
        tableName: "grading_grade",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

gradingGradeModel.scopeConfig = {
    university: false,
    institute: false,
    academicYear: false,
};

export default gradingGradeModel;
