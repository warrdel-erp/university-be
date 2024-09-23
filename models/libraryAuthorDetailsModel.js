import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import libraryAddItemModel from "./libraryAddItemModel.js";

export default sequelize.define(
    'library_author_details',
    {
        libraryAuthorDetails: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'library_author_details_id'
        },
        libraryAddItemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'library_add_item_id',
            references: {
                model: libraryAddItemModel,
                key: 'library_add_item_id'
            }
        },
        authorFirst: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_first',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        authorSecond: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_second',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        authorThird: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_third',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        authorFourth: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_fourth',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        authorFifth: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_fifth',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        authorSix: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'author_six',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        editor:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'editor',
        },
        translator:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'translator',
        },
        compailer:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'compailer',
        },
        remarks:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'remarks',
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
        tableName: 'library_author_details',
        timestamps: true,
        paranoid: true
    }
);