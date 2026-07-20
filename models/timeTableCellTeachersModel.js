import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import users from './userModel.js';
import timeTableCellModel from './timeTableCellModel.js';

/**
 * Teachers assigned to a week-routine cell.
 * Teacher key matches class_schedule_item: userId.
 */
const timeTableCellTeachersModel = sequelize.define(
  'time_table_cell_teachers',
  {
    timeTableCellTeacherId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'time_table_cell_teacher_id',
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: users,
        key: 'user_id',
      },
    },
    teacherType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'teacher_type',
      defaultValue: 'Primary',
    },
    isAttendence: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_Attendence',
      defaultValue: true,
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
    tableName: 'time_table_cell_teachers',
    timestamps: true,
    paranoid: false,
  },
);

timeTableCellTeachersModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default timeTableCellTeachersModel;
