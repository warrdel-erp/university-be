'use strict';

/** Self-reference for cloned timetable structure templates. */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const structure = await queryInterface.describeTable('time_table_structure');

      if (!structure.source_time_table_name_id) {
        await queryInterface.addColumn(
          'time_table_structure',
          'source_time_table_name_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'time_table_structure',
              key: 'time_table_name_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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
      const structure = await queryInterface.describeTable('time_table_structure');

      if (structure.source_time_table_name_id) {
        await queryInterface.removeColumn(
          'time_table_structure',
          'source_time_table_name_id',
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
