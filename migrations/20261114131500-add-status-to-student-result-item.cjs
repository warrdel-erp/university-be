'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('student_result_item', { transaction });

      if (!table.status) {
        await queryInterface.addColumn(
          'student_result_item',
          'status',
          {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'DRAFT',
            after: 'obtained_marks',
          },
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE student_result_item SET status = 'DRAFT' WHERE status IS NULL;`,
        { transaction }
      );

      await transaction.commit();
      console.log('Successfully added status column to student_result_item.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('student_result_item', { transaction });

      if (table.status) {
        await queryInterface.removeColumn('student_result_item', 'status', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

