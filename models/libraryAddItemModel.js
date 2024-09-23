import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import libraryCreationModel from "./libraryCreationModel.js";

export default sequelize.define(
    'library_add_item',
    {
        libraryAddItemId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'library_add_item_id'
        },
        libraryCreationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'library_creation_id',
            references: {
                model: libraryCreationModel,
                key: 'library_creation_id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        author: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        publisher: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        genre: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'genre',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        aisle: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field:'aisle',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        shelf: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field:'shelf',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
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
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id'
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'library_add_item',
        timestamps: true,
        paranoid: true
    }
);