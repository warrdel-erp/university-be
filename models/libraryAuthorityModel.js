import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import libraryCreationModel from "./libraryCreationModel.js";
import employeeModel from "./employeeModel.js";

export default sequelize.define(
    'library_authority',
    {
        libraryAuthorityId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'library_authority_id'
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
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: employeeModel,
                key: 'employee_id'
            }
        },
        userName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'user_name'
        },
        canWaiveOffFine: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'can_waive_off_fine'
        },
        defaultLibrary: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'default_library'
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
        tableName: 'library_authority',
        timestamps: true,
        paranoid: true
    }
);