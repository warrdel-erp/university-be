'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize
      .query(`
      UPDATE library_issue_book_transaction t
      JOIN employee e ON t.member_id = e.employee_id
      SET t.member_id = e.user_id
      WHERE t.member_type = 'TEACHER'
        AND e.user_id IS NOT NULL
        AND t.member_id <> e.user_id;
    `)
      .catch(() => {});
  },

  async down() {
    // member_id cannot be reliably restored to employee_id
  },
};
