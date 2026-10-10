'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Find all soft-deleted session_ids
      const [sessions] = await queryInterface.sequelize.query(
        "SELECT session_id FROM session WHERE deleted_at IS NOT NULL",
        { transaction }
      );

      if (!sessions || sessions.length === 0) {
        console.log("No soft-deleted sessions found to delete.");
        await transaction.commit();
        return;
      }

      const sessionIds = sessions.map(s => s.session_id);
      const sessionIdsList = sessionIds.join(',');
      console.log(`Found soft-deleted sessions: ${sessionIdsList}`);

      // 2. Find batches related to these sessions
      const [batches] = await queryInterface.sequelize.query(
        `SELECT batch_id FROM batch WHERE session_id IN (${sessionIdsList})`,
        { transaction }
      );
      
      const batchIds = batches.map(b => b.batch_id);
      const batchIdsList = batchIds.length ? batchIds.join(',') : null;

      let studentIdsList = null;

      if (batchIdsList) {
          // 3. Find students related to these batches
          const [students] = await queryInterface.sequelize.query(
            `SELECT student_id FROM students WHERE batch_id IN (${batchIdsList})`,
            { transaction }
          );
          const studentIds = students.map(s => s.student_id);
          studentIdsList = studentIds.length ? studentIds.join(',') : null;
      }

      // Disable foreign key checks to allow deleting without ordering issues
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });

      // Dynamically find all tables referencing session_id
      const [sessionFks] = await queryInterface.sequelize.query(`
        SELECT TABLE_NAME, COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME = 'session'
          AND REFERENCED_COLUMN_NAME = 'session_id';
      `, { transaction });

      for (const fk of sessionFks) {
        const { TABLE_NAME, COLUMN_NAME } = fk;
        console.log(`Deleting from ${TABLE_NAME} where ${COLUMN_NAME} in soft-deleted sessions`);
        await queryInterface.sequelize.query(
          `DELETE FROM \`${TABLE_NAME}\` WHERE \`${COLUMN_NAME}\` IN (${sessionIdsList});`,
          { transaction }
        );
      }

      // Dynamically find all tables referencing batch_id
      if (batchIdsList) {
        const [batchFks] = await queryInterface.sequelize.query(`
          SELECT TABLE_NAME, COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = 'batch'
            AND REFERENCED_COLUMN_NAME = 'batch_id';
        `, { transaction });

        for (const fk of batchFks) {
          const { TABLE_NAME, COLUMN_NAME } = fk;
          console.log(`Deleting from ${TABLE_NAME} where ${COLUMN_NAME} in related batches`);
          await queryInterface.sequelize.query(
            `DELETE FROM \`${TABLE_NAME}\` WHERE \`${COLUMN_NAME}\` IN (${batchIdsList});`,
            { transaction }
          );
        }
      }

      // Dynamically find all tables referencing student_id
      if (studentIdsList) {
        const [studentFks] = await queryInterface.sequelize.query(`
          SELECT TABLE_NAME, COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = 'students'
            AND REFERENCED_COLUMN_NAME = 'student_id';
        `, { transaction });

        for (const fk of studentFks) {
          const { TABLE_NAME, COLUMN_NAME } = fk;
          console.log(`Deleting from ${TABLE_NAME} where ${COLUMN_NAME} in related students`);
          await queryInterface.sequelize.query(
            `DELETE FROM \`${TABLE_NAME}\` WHERE \`${COLUMN_NAME}\` IN (${studentIdsList});`,
            { transaction }
          );
        }

        // Also delete the students themselves
        console.log(`Deleting students: ${studentIdsList}`);
        await queryInterface.sequelize.query(
          `DELETE FROM students WHERE student_id IN (${studentIdsList});`,
          { transaction }
        );
      }

      // Delete the batches
      if (batchIdsList) {
        console.log(`Deleting batches: ${batchIdsList}`);
        await queryInterface.sequelize.query(
          `DELETE FROM batch WHERE batch_id IN (${batchIdsList});`,
          { transaction }
        );
      }

      // Delete the sessions
      console.log(`Deleting sessions: ${sessionIdsList}`);
      await queryInterface.sequelize.query(
        `DELETE FROM session WHERE session_id IN (${sessionIdsList});`,
        { transaction }
      );

      // Re-enable foreign key checks
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });

      await transaction.commit();
      console.log("Successfully deleted soft-deleted sessions and related data.");
    } catch (error) {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;'); // Ensure FK checks are re-enabled on error
      await transaction.rollback();
      console.error("Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This is a destructive data migration, so it cannot be undone easily without backups.
    console.log("This migration is irreversible.");
  }
};
