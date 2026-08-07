import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import examinationSessionModel from "./examinationSessionModel.js";
import classSectionTermModel from "./classSectionTermModel.js";

const examinationSessionTermModel = sequelize.define(
    'examination_session_term',
    {
        examinationSessionTermId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            field: 'examination_session_term_id'
        },
        examinationSessionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'examination_session_id',
            references: {
                model: examinationSessionModel,
                key: 'examination_session_id'
            }
        },
        classSectionTermId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'class_section_term_id',
            references: {
                model: classSectionTermModel,
                key: 'class_section_term_id'
            }
        },
        includeElectives: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'include_electives'
        },
        remarks: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'remarks'
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
        }
    },
    {
        tableName: 'examination_session_term',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['examination_session_id', 'class_section_term_id']
            }
        ]
    }
);

examinationSessionTermModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default examinationSessionTermModel;
