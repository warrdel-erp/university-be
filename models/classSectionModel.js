import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import course from "./courseModel.js";
import specialization from "./specializationModel.js";
// import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js"

export default sequelize.define(
    'class_sections',
    {
        classSectionsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'class_sections_id'
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: course,
                key: 'course_id'
            }
        },
        specializationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'specialization_id',
            references: {
                model: specialization,
                key: 'specialization_id'
            }
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',

            references: {
                model: acedmicYearModel,
                
                key: 'acedmic_year_id'
            }
        },
        section: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        // updatedBy: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'updated_by',
        //     references: {
        //         model: users,
        //         key: 'user_id'
        //     }
        // },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'class_sections',
        timestamps: true,
        paranoid: true
    }
);