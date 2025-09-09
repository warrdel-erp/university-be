import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import examStructureModel from "./examStructureModel.js";

export default sequelize.define(
    'exam_setup_type',
    {
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_setup_type_id'
        },
        examStructureId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_structure_id',
            references: {
                model: examStructureModel,
                key: 'exam_structure_id'
            }
        },
        examType: {
            type: DataTypes.STRING,
            field: 'exam_type',
            allowNull: true
        },
        maximumIteration:{
            type:DataTypes.INTEGER,
            allowNull:true,
            field:'maximum_Iteration'
        },
        jurySetup:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'jury_setup'
        },
        preparedBy:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'prepared_by'
        },
        evaluatedBy:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'evaluated_by'
        },
        weightage:{
            type:DataTypes.STRING,
            allowNull:true,
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
        tableName: 'exam_setup_type',
        timestamps: true,
        paranoid: true
    }
);