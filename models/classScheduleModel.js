import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import timeTableStructureModel from "./timeTableStructureModel.js";
import timeTableRoutineModel from "./timeTableRoutineModel.js";
import timeTableStructurePeriodsModel from "./timeTableStructurePeriodsModel.js";
import teacherSubjectMappingModel from "./teacherSubjectMappingModel.js";
import classRoomModel from "./classRoomModel.js";
import electiveSubjectModel from "./electiveSubjectModel.js";
import subjectModel from "./subjectModel.js";

const classScheduleModel = sequelize.define(
  "class_schedule_item",
  {
            universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        timeTableMappingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "time_table_mapping_id",
    },
    timeTableNameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "time_table_name_id",
      references: {
        model: timeTableStructureModel,
        key: "time_table_name_id",
      },
    },
    timeTableRoutineId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "time_table_routine_id",
      references: {
        model: timeTableRoutineModel,
        key: "time_table_routine_id",
      },
    },
    timeTableCreationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "time_table_creation_id",
      references: {
        model: timeTableStructurePeriodsModel,
        key: "time_table_creation_id",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: users,
        key: "user_id",
      },
    },
    electiveSubjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "elective_subject_id",
      references: {
        model: electiveSubjectModel,
        key: "elective_subject_id",
      },
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "subject_id",
      references: {
        model: subjectModel,
        key: "subject_id",
      },
    },
    teacherSubjectMappingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "teacher_subject_mapping_id",
      references: {
        model: teacherSubjectMappingModel,
        key: "teacher_subject_mapping_id",
      },
    },
    classRoomSectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "class_room_section_id",
      references: {
        model: classRoomModel,
        key: "class_room_section_id",
      },
    },
    isSameTeacher: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      field: "is_same_teacher",
    },
    day: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teacherType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "teacher_type",
      defaultValue: "Primary",
    },
    isAttendence: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: "is_Attendence",
      defaultValue: true,
    },
    period: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timeTableType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "normal",
      field: "time_table_type",
    },
    isOverridingSyblingElectives: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: "is_overriding_sybling_electives",
    },
    combinedGroupId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: "combined_group_id",
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },

  {
    tableName: "class_schedule_item",
    timestamps: true,
    paranoid: true,
  },
);

classScheduleModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default classScheduleModel;
