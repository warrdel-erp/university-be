'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('student_result_item');
      if (!tableInfo.credit_earned) {
        await queryInterface.addColumn(
          'student_result_item',
          'credit_earned',
          {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          { transaction },
        );
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('student_result_item');
      if (tableInfo.credit_earned) {
        await queryInterface.removeColumn('student_result_item', 'credit_earned', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
