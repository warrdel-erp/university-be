import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import users from './userModel.js';
import timeTableCellDateWiseModel from './timeTableCellDateWiseModel.js';

/**
 * Teachers assigned to a date-wise class instance.
 * Teacher key: userId (same as week cell teachers / class_schedule_item).
 */
const timeTableCellTeachersDateWiseModel = sequelize.define(
  'time_table_cell_teachers_date_wise',
  {
    timeTableCellTeachersDateWiseId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'time_table_cell_teachers_date_wise_id',
    },
    timeTableCellDateWiseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'time_table_cell_date_wise_id',
      references: {
        model: timeTableCellDateWiseModel,
        key: 'time_table_cell_date_wise_id',
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    tableName: 'time_table_cell_teachers_date_wise',
    timestamps: true,
    paranoid: true,
  },
);

timeTableCellTeachersDateWiseModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default timeTableCellTeachersDateWiseModel;
