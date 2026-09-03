'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize
      .query(`
      UPDATE library_issue_book_transaction t
      JOIN students s ON t.member_id = s.user_id
      SET t.member_id = s.student_id
      WHERE t.member_type = 'STUDENT'
        AND s.student_id IS NOT NULL
        AND t.member_id <> s.student_id;
    `)
      .catch(() => {});
  },

  async down() {
    // member_id cannot be reliably restored to user_id
  },
};
