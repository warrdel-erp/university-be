import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import examTypeModel from "./examTypeModel.js";
import courseModel from "./courseModel.js";
import employeeModel from "./employeeModel.js";
import classRoomModel from "./classRoomModel.js";

const examSetupModel = sequelize.define(
    "exam_setup",
    {
        examSetupId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "exam_setup_id",
        },
        examSystem: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "exam_system",
        },
        examTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "exam_type_id",
            references: {
                model: examTypeModel,
                key: "exam_type_id",
            },
        },
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "class_id",
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "subject_id",
            references: {
                model: subjectModel,
                key: "subject_id",
            },
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "course_id",
            references: {
                model: courseModel,
                key: "course_id",
            },
        },
        totalMarks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "total_marks",
        },
        markDistribution: {
            type: DataTypes.JSON,
            allowNull: true,
            field: "mark_distribution",
        },
        teacherId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "teacher_id",
            references: {
                model: employeeModel,
                key: "employee_id",
            },
        },
        examDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: "exam_date",
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: "start_time",
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: "end_time",
        },
        roomId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "room_id",
            references: {
                model: classRoomModel,
                key: "class_room_section_id",
            },
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "created_by",
            references: {
                model: users,
                key: "user_id",
            },
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "updated_by",
            references: {
                model: users,
                key: "user_id",
            },
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
            field: "deleted_at",
        },
    },
    {
        tableName: "exam_setup",
        timestamps: true,
        paranoid: true,
    }
);



export default examSetupModel;
