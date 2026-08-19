'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Temporarily disable foreign key constraints for bulk truncation
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });

      // Truncate dependent child tables
      await queryInterface.sequelize.query('TRUNCATE TABLE student_exam_seat;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE exam_schedule_room_capacity;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE answer_sheet_qr;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE teacher_exam_assignment;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE exam_schedule;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE student_hall_ticket;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE examination_session_eligibility;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE examination_session_term;', { transaction });
      await queryInterface.sequelize.query('TRUNCATE TABLE examination_session_slot;', { transaction });

      // Truncate main examination session table
      await queryInterface.sequelize.query('TRUNCATE TABLE examination_session;', { transaction });

      // Re-enable foreign key constraints
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });

      await transaction.commit();
    } catch (error) {
      // Make sure we re-enable foreign key checks if error occurs
      try {
        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });
      } catch (err) {
        console.error('Failed to restore FOREIGN_KEY_CHECKS:', err);
      }
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Truncating tables is a destructive operation that cannot be reverted
  }
};
