"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("pdf_split_jobs", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    bullmq_job_id: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    s3_key: {
      type: Sequelize.STRING(512),
      allowNull: false,
    },
    institute_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    university_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM(
        "PENDING",
        "DOWNLOADING",
        "SCANNING_QR",
        "VALIDATING_DB",
        "SPLITTING",
        "COMPLETED",
        "FAILED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    progress: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_students: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    processed_students: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    error_message: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    error_details: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    result_summary: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addIndex("pdf_split_jobs", ["status"], {
    name: "idx_pdf_split_jobs_status",
  });
  await queryInterface.addIndex("pdf_split_jobs", ["institute_id", "university_id"], {
    name: "idx_pdf_split_jobs_institute_university",
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("pdf_split_jobs");
}
