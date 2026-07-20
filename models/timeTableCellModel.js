import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import users from './userModel.js';
import timeTableStructureModel from './timeTableStructureModel.js';
import timeTableRoutineModel from './timeTableRoutineModel.js';
import timeTableStructurePeriodsModel from './timeTableStructurePeriodsModel.js';
import teacherSubjectMappingModel from './teacherSubjectMappingModel.js';
import classRoomModel from './classRoomModel.js';
import electiveSubjectModel from './electiveSubjectModel.js';
import subjectModel from './subjectModel.js';

/**
 * Week-routine template cell (no teacher on this row).
 * PK: timeTableCellId / time_table_cell_id.
 */
const timeTableCellModel = sequelize.define(
  'time_table_cell',
  {
    timeTableCellId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'time_table_cell_id',
    },
    timeTableNameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'time_table_name_id',
      references: {
        model: timeTableStructureModel,
        key: 'time_table_name_id',
      },
    },
    timeTableRoutineId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'time_table_routine_id',
      references: {
        model: timeTableRoutineModel,
        key: 'time_table_routine_id',
      },
    },
    timeTableCreationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'time_table_creation_id',
      references: {
        model: timeTableStructurePeriodsModel,
        key: 'time_table_creation_id',
      },
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'subject_id',
      references: {
        model: subjectModel,
        key: 'subject_id',
      },
    },
    electiveSubjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'elective_subject_id',
      references: {
        model: electiveSubjectModel,
        key: 'elective_subject_id',
      },
    },
    teacherSubjectMappingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'teacher_subject_mapping_id',
      references: {
        model: teacherSubjectMappingModel,
        key: 'teacher_subject_mapping_id',
      },
    },
    classRoomSectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'class_room_section_id',
      references: {
        model: classRoomModel,
        key: 'class_room_section_id',
      },
    },
    day: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    period: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timeTableType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'normal',
      field: 'time_table_type',
    },
    isAttendence: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_Attendence',
      defaultValue: true,
    },
    isSameTeacher: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      field: 'is_same_teacher',
    },
    isOverridingSyblingElectives: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_overriding_sybling_electives',
    },
    combinedGroupId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'combined_group_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updated_at',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by',
      references: {
        model: users,
        key: 'user_id',
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'updated_by',
      references: {
        model: users,
        key: 'user_id',
      },
    },
  },
  {
    tableName: 'time_table_cell',
    timestamps: true,
    paranoid: false,
  },
);

timeTableCellModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default timeTableCellModel;
