import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import employee from "./employeeModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";

const teacherSubstituteModel = sequelize.define(
    "teacher_substitute",
    {
        teacherSubstituteId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "teacher_substitute_id",
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "employee_id",
            references: {
                model: employee,
                key: "employee_id",
            },
        },
        substituteEmployeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "substitute_employee_id",
            references: {
                model: employee,
                key: "employee_id",
            },
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "user_id",
            references: {
                model: users,
                key: "user_id",
            },
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "university_id",
            references: {
                model: university,
                key: "university_id",
            },
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "institute_id",
            references: {
                model: institute,
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
        tableName: "teacher_substitute",
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ["employee_id", "substitute_employee_id"],
                name: "uq_teacher_substitute_employee_substitute",
            },
        ],
    }
);

teacherSubstituteModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default teacherSubstituteModel;
