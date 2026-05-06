'use strict';

/** Drops legacy composite index on exam_schedule (duplicates allowed on those columns). Safe if index missing. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;
    const dialect = qi.getDialect();

    if (dialect === 'mysql' || dialect === 'mariadb') {
      // Ensure individual indexes exist for foreign key columns so MySQL doesn't block the drop.
      try {
        await queryInterface.addIndex('exam_schedule', ['exam_setup_type_term_id'], {
          name: 'exam_schedule_est_idx'
        });
      } catch (e) {
        // ignore if already exists
      }
      try {
        await queryInterface.addIndex('exam_schedule', ['session_id'], {
          name: 'exam_schedule_session_idx'
        });
      } catch (e) {
        // ignore if already exists
      }

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
