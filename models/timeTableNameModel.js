import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import users from "./userModel.js";

export default sequelize.define(
  'time_table_name',
  {
    timeTableNameId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'time_table_name_id'
    },
    name :{
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'created_at',
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'updated_at',
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
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
},  
{
    tableName: 'time_table_name',
    timestamps: true,
    paranoid:true
},
);