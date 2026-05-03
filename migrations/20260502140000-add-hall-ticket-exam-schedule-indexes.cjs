'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(
      'student_hall_ticket',
      ['institute_id', 'university_id', 'exam_setup_type_term_id', 'session_id'],
      { name: 'student_hall_ticket_inst_univ_est_session_idx' }
    );

    // MySQL requires a prefix length when indexing TEXT columns
    await queryInterface.addIndex(
      'student_hall_ticket',
      [{ name: 'qr', length: 255 }],
      { name: 'student_hall_ticket_qr_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('student_hall_ticket', 'student_hall_ticket_qr_idx');
    await queryInterface.removeIndex(
      'student_hall_ticket',
      'student_hall_ticket_inst_univ_est_session_idx'
    );
  }
};
