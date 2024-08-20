import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import university from "./universityModel.js"


export default sequelize.define(
  'users',
  {
    userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field:'user_id'
    },
    universityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'university_id',
        references: {
            model: university,
            key: 'university_id'
        }
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user_name'
    },
    uniqueId: {
        type: DataTypes.STRING,
        allowNull: false,
        field:'unique_id',
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'updated_at'
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'deleted_at'
    },
},  
{
    tableName: 'users',
    timestamps: true,
    paranoid: true
}
)