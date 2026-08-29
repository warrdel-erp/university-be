'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // pdf_split_jobs.id uses latin1_swedish_ci; the FK column must match.
    await queryInterface.sequelize.query(`
      ALTER TABLE exam_session_answer_sheets
      ADD COLUMN pdf_split_job_id CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NULL DEFAULT NULL,
      ADD CONSTRAINT fk_exam_session_answer_sheets_pdf_split_job_id
        FOREIGN KEY (pdf_split_job_id) REFERENCES pdf_split_jobs(id)
        ON UPDATE CASCADE ON DELETE SET NULL
    `);

    await queryInterface.addIndex(
      'exam_session_answer_sheets',
      ['pdf_split_job_id'],
      { name: 'idx_exam_session_answer_sheets_pdf_split_job_id' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'exam_session_answer_sheets',
      'idx_exam_session_answer_sheets_pdf_split_job_id'
    );
    await queryInterface.removeColumn('exam_session_answer_sheets', 'pdf_split_job_id');
  },
};
