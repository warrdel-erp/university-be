import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';

export default sequelize.define(
  'settings',
  {
    settingId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'setting_id'
    },
    settingKey :{
        type: DataTypes.STRING,
        allowNull: false,
        unique:true,
        field: 'setting_key'
    },
    settingValue:{
        type: DataTypes.JSON,
        allowNull: false,
        field:'setting_value'
    },
    settingType :{
        type: DataTypes.STRING,
        allowNull: false,
        field: 'setting_type'
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
    }
},  
{
    tableName: 'settings',
    timestamps: true,
},
);