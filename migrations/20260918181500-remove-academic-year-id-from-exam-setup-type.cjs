'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('exam_setup_type');

      if (tableInfo.acedmic_year_id) {
        await queryInterface.removeColumn('exam_setup_type', 'acedmic_year_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('exam_setup_type');

      if (!tableInfo.acedmic_year_id) {
        await queryInterface.addColumn(
          'exam_setup_type',
          'acedmic_year_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'acedmic_year',
              key: 'acedmic_year_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
