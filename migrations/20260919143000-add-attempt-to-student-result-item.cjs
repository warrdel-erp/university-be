'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('student_result_item');
      if (!tableInfo.attempt) {
        await queryInterface.addColumn(
          'student_result_item',
          'attempt',
          {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
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
      if (tableInfo.attempt) {
        await queryInterface.removeColumn('student_result_item', 'attempt', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
