import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";

const pdfSplitJobModel = sequelize.define(
  "pdf_split_job",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    bullmqJobId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "bullmq_job_id",
    },
    examSessionAnswerSheetId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "exam_session_answer_sheet_id",
    },
    s3Key: {
      type: DataTypes.STRING(512),
      allowNull: false,
      field: "s3_key",
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by",
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "DOWNLOADING",
        "SCANNING_QR",
        "VALIDATING_DB",
        "SPLITTING",
        "COMPLETED",
        "PARTIALLY_COMPLETED",
        "FAILED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    /** Ordered list of status transitions with timestamps — appended on every status change. */
    statusLog: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      field: "status_log",
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // ── Student counters ──────────────────────────────────────────────────────
    totalStudents: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_students",
    },
    processedStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "processed_students",
    },
    // ── Batch counters (fan-out architecture) ─────────────────────────────────
    totalBatches: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_batches",
    },
    completedBatches: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "completed_batches",
    },
    failedBatches: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "failed_batches",
    },
    /** Array of BullMQ batch job IDs — lets FE query per-batch status */
    batchJobIds: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "batch_job_ids",
    },
    // ── Result / error ────────────────────────────────────────────────────────
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "error_details",
    },
    resultSummary: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "result_summary",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    tableName: "pdf_split_jobs",
    timestamps: true,
  }
);

pdfSplitJobModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default pdfSplitJobModel;
