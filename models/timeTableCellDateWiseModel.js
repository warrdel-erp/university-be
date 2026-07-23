import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import users from './userModel.js';
import timeTableCellModel from './timeTableCellModel.js';
import classRoomModel from './classRoomModel.js';

/**
 * Calendar-day instance of a week cell (links to timeTableCellId).
 * One period on a given date can have multiple rows when multiple week cells
 * share that slot — each row has its own timeTableCellDateWiseId.
 * Published edits use PATCH /dateWiseCells per row id (teacher via timeTableCellTeachersDateWiseId).
 * Teachers: time_table_cell_teachers_date_wise (not on this table).
 */
const timeTableCellDateWiseModel = sequelize.define(
  'time_table_cell_date_wise',
  {
    timeTableCellDateWiseId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'time_table_cell_date_wise_id',
    },
    timeTableCellId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'time_table_cell_id',
      references: {
        model: timeTableCellModel,
        key: 'time_table_cell_id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
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
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'subject_id',
    },
    electiveSubjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'elective_subject_id',
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
    tableName: 'time_table_cell_date_wise',
    timestamps: true,
    paranoid: false,
  },
);

timeTableCellDateWiseModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default timeTableCellDateWiseModel;
