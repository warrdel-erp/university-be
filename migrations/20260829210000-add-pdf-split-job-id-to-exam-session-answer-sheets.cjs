'use strict';

module.exports = {
  async up(queryInterface) {
    // Dynamically detect the charset/collation of pdf_split_jobs.id so this
    // migration works across all environments regardless of DB defaults.
    const [[col]] = await queryInterface.sequelize.query(
      `SELECT CHARACTER_SET_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'pdf_split_jobs'
         AND COLUMN_NAME  = 'id'`
    );

    const charset   = col.CHARACTER_SET_NAME;
    const collation = col.COLLATION_NAME;

    await queryInterface.sequelize.query(`
      ALTER TABLE exam_session_answer_sheets
      ADD COLUMN pdf_split_job_id CHAR(36)
        CHARACTER SET ${charset} COLLATE ${collation}
        NULL DEFAULT NULL,
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
    await queryInterface.sequelize.query(`
      ALTER TABLE exam_session_answer_sheets
      DROP FOREIGN KEY fk_exam_session_answer_sheets_pdf_split_job_id
    `);
    await queryInterface.removeIndex(
      'exam_session_answer_sheets',
      'idx_exam_session_answer_sheets_pdf_split_job_id'
    );
    await queryInterface.removeColumn('exam_session_answer_sheets', 'pdf_split_job_id');
  },
};
