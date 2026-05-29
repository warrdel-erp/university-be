"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Add batch tracking columns
  await queryInterface.addColumn("pdf_split_jobs", "total_batches", {
    type: Sequelize.INTEGER,
    allowNull: true,
    after: "total_students",
  });

  await queryInterface.addColumn("pdf_split_jobs", "completed_batches", {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    after: "total_batches",
  });

  await queryInterface.addColumn("pdf_split_jobs", "failed_batches", {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    after: "completed_batches",
  });

  await queryInterface.addColumn("pdf_split_jobs", "batch_job_ids", {
    type: Sequelize.JSON,
    allowNull: true,
    comment: "Array of BullMQ batch job IDs for per-batch status tracking",
    after: "failed_batches",
  });

  // Extend ENUM to include PARTIALLY_COMPLETED
  await queryInterface.sequelize.query(`
    ALTER TABLE pdf_split_jobs
    MODIFY COLUMN status ENUM(
      'PENDING',
      'DOWNLOADING',
      'SCANNING_QR',
      'VALIDATING_DB',
      'SPLITTING',
      'COMPLETED',
      'PARTIALLY_COMPLETED',
      'FAILED'
    ) NOT NULL DEFAULT 'PENDING'
  `);
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("pdf_split_jobs", "total_batches");
  await queryInterface.removeColumn("pdf_split_jobs", "completed_batches");
  await queryInterface.removeColumn("pdf_split_jobs", "failed_batches");
  await queryInterface.removeColumn("pdf_split_jobs", "batch_job_ids");

  await queryInterface.sequelize.query(`
    ALTER TABLE pdf_split_jobs
    MODIFY COLUMN status ENUM(
      'PENDING',
      'DOWNLOADING',
      'SCANNING_QR',
      'VALIDATING_DB',
      'SPLITTING',
      'COMPLETED',
      'FAILED'
    ) NOT NULL DEFAULT 'PENDING'
  `);
}
