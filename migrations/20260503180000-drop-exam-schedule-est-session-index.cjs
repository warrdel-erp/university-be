'use strict';

/** Drops legacy composite index on exam_schedule (duplicates allowed on those columns). Safe if index missing. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;
    const dialect = qi.getDialect();

    if (dialect === 'mysql' || dialect === 'mariadb') {
      const [rows] = await qi.query(
        `SHOW INDEX FROM exam_schedule WHERE Key_name = 'exam_schedule_est_session_idx'`
      );
      if (rows?.length) {
        await queryInterface.removeIndex('exam_schedule', 'exam_schedule_est_session_idx');
      }
    } else {
      try {
        await queryInterface.removeIndex('exam_schedule', 'exam_schedule_est_session_idx');
      } catch {
        // ignore if not present
      }
    }

  },

  async down(queryInterface) {
    await queryInterface.addIndex('exam_schedule', ['exam_setup_type_term_id', 'session_id'], {
      name: 'exam_schedule_est_session_idx',
    });
  },
};
