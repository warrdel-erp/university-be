'use strict';

/** Adds index on student_hall_ticket.qr for fast /byQr lookups (idempotent). */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const indexName = 'student_hall_ticket_qr_idx';

    const [rows] = await sequelize.query(
      `SHOW INDEX FROM student_hall_ticket WHERE Key_name = '${indexName}'`
    );
    if (rows?.length) return;

    // MySQL TEXT index requires prefix length.
    await queryInterface.addIndex(
      'student_hall_ticket',
      [{ name: 'qr', length: 255 }],
      { name: indexName }
    );
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const indexName = 'student_hall_ticket_qr_idx';

    const [rows] = await sequelize.query(
      `SHOW INDEX FROM student_hall_ticket WHERE Key_name = '${indexName}'`
    );
    if (!rows?.length) return;

    await queryInterface.removeIndex('student_hall_ticket', indexName);
  },
};
