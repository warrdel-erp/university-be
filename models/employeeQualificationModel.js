import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";

export default sequelize.define(
    'employee_qualification',
    {
        employeeQualificationId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_qualification_id'
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: employee,
                key: 'employee_id'
            }
        },
        document: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        receivedDate:{
			type:DataTypes.DATE,
			allowNull:false,
            field:'received_date'
		},
        returnedDate:{
			type:DataTypes.DATE,
			allowNull:true,
            field:'returned_date'
		},
        attachment:{
			type:DataTypes.JSON,
			allowNull:true,
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
        tableName: 'employee_qualification',
        timestamps: true,
        paranoid: true
    }
);