import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import subject from "./subjectModel.js";
import university from "./universityModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'questionPaperBlueprint',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subject,
                key: 'subject_id'
            }
        },
        blueprint: {
            type: DataTypes.JSON,
            allowNull: false,
            field: 'blueprint'
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
    },
    {
        tableName: 'question_paper_blueprint',
        timestamps: true,
        paranoid: false
    }
);
