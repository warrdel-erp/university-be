import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import examSetupTypeTermModel from "./examSetupTypeTermModel.js";
import sessionModel from "./sessionModel.js";
import studentModel from "./studentModel.js";
import instituteModel from "./instituteModel.js";
import universityModel from "./universityModel.js";

export default sequelize.define(
    "student_hall_ticket",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "id"
        },
        qr: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: "qr"
        },
        examSetupTypeTermId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "exam_setup_type_term_id",
            references: {
                model: examSetupTypeTermModel,
                key: "exam_setup_type_term_id"
            }
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "session_id",
            references: {
                model: sessionModel,
                key: "session_id"
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "student_id",
            references: {
                model: studentModel,
                key: "student_id"
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "institute_id",
            references: {
                model: instituteModel,
                key: "institute_id"
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "university_id",
            references: {
                model: universityModel,
                key: "university_id"
            }
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "created_at"
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "updated_at"
        }
    },
    {
        tableName: "student_hall_ticket",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["exam_setup_type_term_id", "session_id", "student_id"]
            }
        ]
    }
);
