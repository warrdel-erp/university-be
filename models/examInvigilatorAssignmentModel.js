import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import examinationSessionSlotModel from "./examinationSessionSlotModel.js";
import classRoomModel from "./classRoomModel.js";
import userModel from "./userModel.js";

const examInvigilatorAssignmentModel = sequelize.define(
    'exam_invigilator_assignment',
    {
        examInvigilatorAssignmentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_invigilator_assignment_id'
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        examinationSessionSlotId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'examination_session_slot_id',
            references: {
                model: examinationSessionSlotModel,
                key: 'examination_session_slot_id'
            }
        },
        examDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'exam_date'
        },
        classRoomSectionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_room_section_id',
            references: {
                model: classRoomModel,
                key: 'class_room_section_id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        role: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'role'
        },
        assignedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'assigned_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: userModel,
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
        }
    },
    {
        tableName: 'exam_invigilator_assignment',
        timestamps: true,
        paranoid: false
    }
);

examInvigilatorAssignmentModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default examInvigilatorAssignmentModel;
