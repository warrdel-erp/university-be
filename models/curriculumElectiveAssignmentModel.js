import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import curriculumElectiveRequirementModel from "./curriculumElectiveRequirementModel.js";
import studentModel from "./studentModel.js";
import subjectModel from "./subjectModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";

const curriculumElectiveAssignmentModel = sequelize.define(
  'curriculum_elective_assignment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
    },
    curriculumElectiveRequirementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'curriculum_elective_requirement_id',
      references: {
        model: curriculumElectiveRequirementModel,
        key: 'id',
      },
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'student_id',
      references: {
        model: studentModel,
        key: 'student_id',
      },
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subject_id',
      references: {
        model: subjectModel,
        key: 'subject_id',
      },
    },
    assignmentSource: {
      type: DataTypes.ENUM('Direct', 'Selection Round'),
      allowNull: false,
      defaultValue: 'Direct',
      field: 'assignment_source',
    },
    status: {
      type: DataTypes.ENUM('Assigned', 'Awaiting', 'Dropped'),
      allowNull: false,
      defaultValue: 'Assigned',
      field: 'status',
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'university_id',
      references: {
        model: universityModel,
        key: 'university_id',
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'institute_id',
      references: {
        model: instituteModel,
        key: 'institute_id',
      },
    },
    academicYearId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'academic_year_id',
      references: {
        model: acedmicYearModel,
        key: 'acedmic_year_id',
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
      references: {
        model: users,
        key: 'user_id',
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: users,
        key: 'user_id',
      },
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    tableName: 'curriculum_elective_assignment',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

curriculumElectiveAssignmentModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default curriculumElectiveAssignmentModel;

