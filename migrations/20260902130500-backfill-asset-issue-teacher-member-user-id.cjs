'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize
      .query(`
      UPDATE asset_issue_transaction t
      JOIN employee e ON t.member_id = e.employee_id
      SET t.member_id = e.user_id
      WHERE t.member_type = 'TEACHER'
        AND e.user_id IS NOT NULL
        AND t.member_id <> e.user_id;
    `)
      .catch(() => {});

    await queryInterface.sequelize
      .query(`
      UPDATE student_fee_payment p
      JOIN payment_item pi ON p.student_fee_payment_id = pi.payment_id
      JOIN asset_issue_transaction t
        ON pi.reference_id = t.asset_issue_transaction_id
        AND pi.reference_type = 'ASSET_SECURITY'
      JOIN employee e ON p.payee_id = e.employee_id
      SET p.payee_id = e.user_id
      WHERE t.member_type = 'TEACHER'
        AND p.payee_type = 'OTHER'
        AND e.user_id IS NOT NULL
        AND p.payee_id <> e.user_id;
    `)
      .catch(() => {});
  },

  async down() {
    // member_id / payee_id cannot be reliably restored to employee_id
  },
};
