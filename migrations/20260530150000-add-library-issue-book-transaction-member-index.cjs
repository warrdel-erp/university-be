'use strict';

/**
 * member_id references students.student_id (STUDENT) or employee.employee_id (TEACHER).
 * Polymorphic — no single-column DB FK; validated in application layer.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(
      'library_issue_book_transaction',
      ['member_type', 'member_id'],
      { name: 'idx_library_issue_book_transaction_member' },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'library_issue_book_transaction',
      'idx_library_issue_book_transaction_member',
    );
  },
};
