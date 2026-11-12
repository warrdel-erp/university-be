import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import departmentPositions from "./departmentPositionsModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import department from "./departmentModel.js";

const approvalRequestModel = sequelize.define(
  "approval_requests",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    approvalFor: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "approval_for",
      comment: "Entity type e.g., 'leave', 'question_bank', 'examination'",
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "resource_id",
      comment: "Primary key of target entity (e.g., leave_requests.request_id)",
    },
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "requested_by",
      references: {
        model: users,
        key: "user_id",
      },
    },
    assignedToPositionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "assigned_to_position_id",
      references: {
        model: departmentPositions,
        key: "department_position_id",
      },
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "level",
      comment: "Hierarchy or sequence step (e.g. 1 = HOD, 2 = Dean)",
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "skipped", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
      field: "status",
    },
    approvedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "approved_by_id",
      references: {
        model: users,
        key: "user_id",
      },
      comment: "User who approved or rejected this request",
    },
    skippedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "skipped_by_user_id",
      references: {
        model: users,
        key: "user_id",
      },
      comment: "User who bypassed/skipped this approval step",
    },
    actionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "action_at",
      comment: "Timestamp when approve/reject/skip action was taken",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description",
      comment: "Context, reason, or remarks for the request/approval action",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: university,
        key: "university_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
      references: {
        model: institute,
        key: "institute_id",
      },
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "campus_id",
      references: {
        model: "campus",
        key: "campus_id",
      },
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "department_id",
      references: {
        model: department,
        key: "department_id",
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
    tableName: "approval_requests",
    timestamps: true,
    paranoid: true,
  }
);

approvalRequestModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: false,
};

export default approvalRequestModel;

