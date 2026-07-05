'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });

      // Step 1: Backfill — convert employee_id values to their corresponding user_id
      // class_schedule_item is the ONLY table that stores employee.employee_id instead of user_id
      await queryInterface.sequelize.query(
        `UPDATE class_schedule_item csi
         JOIN employee e ON csi.employee_id = e.employee_id
         SET csi.employee_id = e.user_id`,
        { transaction }
      );

      // Step 2: Rename the column from employee_id to user_id
      const columns = await queryInterface.describeTable('class_schedule_item');
      if ('employee_id' in columns) {
        await queryInterface.renameColumn('class_schedule_item', 'employee_id', 'user_id', { transaction });
      }

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });
      await transaction.commit();
    } catch (error) {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });

      const columns = await queryInterface.describeTable('class_schedule_item');
      if ('user_id' in columns && !('employee_id' in columns)) {
        await queryInterface.renameColumn('class_schedule_item', 'user_id', 'employee_id', { transaction });
      }

      // Reverse backfill: convert user_id values back to employee_id
      await queryInterface.sequelize.query(
        `UPDATE class_schedule_item csi
         JOIN employee e ON csi.employee_id = e.user_id
         SET csi.employee_id = e.employee_id`,
        { transaction }
      );

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });
      await transaction.commit();
    } catch (error) {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      await transaction.rollback();
      throw error;
    }
  }
};
