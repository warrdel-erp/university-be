import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import student from "./studentModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import employeeCodeMaster from "./employeeCodeMasterModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'students_meta_data',
    {
        studentMetaDataId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'student_meta_data_id'
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id'
            }
        },
        types: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'types',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        codes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'codes',
            references: {
                model: employeeCodeMaster,
                key: 'employee_code_master_id'
            }
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
        tableName: 'students_meta_data',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['student_id','types', 'codes']
            }
        ]
    }
);