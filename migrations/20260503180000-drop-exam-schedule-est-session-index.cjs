'use strict';

/** Drops legacy composite index on exam_schedule (duplicates allowed on those columns). Safe if index missing.
 * Also ensures index on student_hall_ticket.qr for GET /byQr lookups (idempotent if already added by 20260502140000). */
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

    await ensureStudentHallTicketQrIndex(queryInterface, qi, dialect);
  },

  async down(queryInterface) {
    await queryInterface.addIndex('exam_schedule', ['exam_setup_type_term_id', 'session_id'], {
      name: 'exam_schedule_est_session_idx',
    });
    // Do not drop student_hall_ticket_qr_idx here — it may be owned by 20260502140000-add-hall-ticket-exam-schedule-indexes.cjs
  },
};

/** @param {import('sequelize').Sequelize} sequelize */
async function ensureStudentHallTicketQrIndex(queryInterface, sequelize, dialect) {
  const indexName = 'student_hall_ticket_qr_idx';

  if (dialect === 'mysql' || dialect === 'mariadb') {
    const [rows] = await sequelize.query(
      `SHOW INDEX FROM student_hall_ticket WHERE Key_name = '${indexName}'`
    );
    if (rows?.length) return;
    await queryInterface.addIndex(
      'student_hall_ticket',
      [{ name: 'qr', length: 255 }],
      { name: indexName }
    );
    return;
  }

  if (dialect === 'postgres') {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE tablename = 'student_hall_ticket' AND indexname = '${indexName}'`
    );
    if (rows?.length) return;
    await queryInterface.addIndex('student_hall_ticket', ['qr'], { name: indexName });
    return;
  }

  if (dialect === 'sqlite') {
    const [rows] = await sequelize.query(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name = '${indexName}'`
    );
    if (rows?.length) return;
    await queryInterface.addIndex('student_hall_ticket', ['qr'], { name: indexName });
    return;
  }

  try {
    await queryInterface.addIndex('student_hall_ticket', ['qr'], { name: indexName });
  } catch {
    // ignore duplicate / unsupported
  }
}
