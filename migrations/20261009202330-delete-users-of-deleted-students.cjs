'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Find all user_ids associated with soft-deleted students
      const [students] = await queryInterface.sequelize.query(
        `SELECT student_id, user_id FROM students WHERE deleted_at IS NOT NULL AND user_id IS NOT NULL;`,
        { transaction }
      );

      const userIds = students.map(s => s.user_id);
      const studentIds = students.map(s => s.student_id);

      if (userIds.length > 0) {

        // 0. Permanently delete connected metadata first to satisfy FK constraints
        await queryInterface.bulkDelete('students_meta_data', {
          student_id: {
            [Sequelize.Op.in]: studentIds
          }
        }, { transaction });

        // 1. Permanently delete the connected soft-deleted students first
        await queryInterface.bulkDelete('students', {
          user_id: {
            [Sequelize.Op.in]: userIds
          }
        }, { transaction });

        // 2. Permanently delete the user records for these soft-deleted students.
        await queryInterface.bulkDelete('users', {
          user_id: {
            [Sequelize.Op.in]: userIds
          }
        }, { transaction });

      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Reverting this migration is not possible as the data is permanently deleted.");
  }
};
