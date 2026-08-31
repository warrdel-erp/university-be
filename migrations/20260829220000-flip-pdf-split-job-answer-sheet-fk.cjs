'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Step 1: Undo the previous one-to-one approach ─────────────────────────
    await queryInterface.sequelize.query(`
      ALTER TABLE exam_session_answer_sheets
      DROP FOREIGN KEY fk_exam_session_answer_sheets_pdf_split_job_id
    `);
    await queryInterface.removeIndex(
      'exam_session_answer_sheets',
      'idx_exam_session_answer_sheets_pdf_split_job_id'
    );
    await queryInterface.removeColumn('exam_session_answer_sheets', 'pdf_split_job_id');

    // ── Step 2: Add FK on the many side (pdf_split_jobs → answer sheet) ───────
    // exam_session_answer_sheets.id is INTEGER — no charset issue.
    await queryInterface.addColumn('pdf_split_jobs', 'exam_session_answer_sheet_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      after: 'id',
      references: { model: 'exam_session_answer_sheets', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex(
      'pdf_split_jobs',
      ['exam_session_answer_sheet_id'],
      { name: 'idx_pdf_split_jobs_exam_session_answer_sheet_id' }
    );
  },

  async down(queryInterface, Sequelize) {
    // Reverse step 2
    await queryInterface.removeIndex(
      'pdf_split_jobs',
      'idx_pdf_split_jobs_exam_session_answer_sheet_id'
    );
    await queryInterface.removeColumn('pdf_split_jobs', 'exam_session_answer_sheet_id');

    // Reverse step 1 — re-add old column (nullable, no FK for simplicity on rollback)
    await queryInterface.addColumn('exam_session_answer_sheets', 'pdf_split_job_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      defaultValue: null,
    });
  },
};
