import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import examinationSessionSlotModel from "./examinationSessionSlotModel.js";
import classRoomSectionModel from "./classRoomModel.js";
import userModel from "./userModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";

const examRoomMaterialBundleModel = sequelize.define(
    "exam_room_material_bundle",
    {
        examRoomMaterialBundleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "exam_room_material_bundle_id",
        },
        examDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "exam_date",
        },
        examinationSessionSlotId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: examinationSessionSlotModel,
                key: "examination_session_slot_id",
            },
            field: "examination_session_slot_id",
        },
        classRoomSectionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: classRoomSectionModel,
                key: "class_room_section_id",
            },
            field: "class_room_section_id",
        },
        status: {
            type: DataTypes.ENUM("PREPARING", "READY", "ISSUED", "RECEIVED", "VERIFIED", "CLOSED"),
            allowNull: false,
            defaultValue: "PREPARING",
            field: "status",
        },
        issuedTo: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "issued_to",
        },
        issuedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "issued_by",
        },
        issuedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "issued_at",
        },
        receivedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "received_by",
        },
        receivedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "received_at",
        },
        verifiedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "verified_by",
        },
        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "verified_at",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "remarks",
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "university_id",
            references: {
                model: universityModel,
                key: "university_id",
            },
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
            field: 'academic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "created_by",
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "updated_by",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "updated_at",
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: "exam_room_material_bundle",
        timestamps: true,
        paranoid: true,
    }
);

examRoomMaterialBundleModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default examRoomMaterialBundleModel;
