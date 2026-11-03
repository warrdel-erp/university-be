import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feePolicyModel from "./feePolicyModel.js";
import studentModel from "./studentModel.js";

const feePolicyStudentsModel = sequelize.define(
  "fee_policy_students",
  {
    feePolicyStudentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_policy_student_id",
    },
    feePolicyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_policy_id",
      references: {
        model: feePolicyModel,
        key: "fee_policy_id",
      },
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_id",
      references: {
        model: studentModel,
        key: "student_id",
      },
    },
    effect: {
      type: DataTypes.ENUM("reduce_fee", "add_charge", "refund"),
      allowNull: false,
      defaultValue: "reduce_fee",
      field: "effect",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
    },
  },
  {
    tableName: "fee_policy_students",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ["fee_policy_id", "student_id", "effect"],
        name: "uq_fee_policy_student_effect",
      },
      {
        fields: ["student_id"],
        name: "idx_fee_policy_students_student_id",
      },
    ],
  }
);

feePolicyStudentsModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePolicyStudentsModel;
