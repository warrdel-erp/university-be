'use strict';

/**
 * 3/3 — Structure is fully independent.
 * course_id + session_id live only on time_table_structure_course.
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const structure = await queryInterface.describeTable('time_table_structure');

      if (structure.session_id) {
        await queryInterface.removeColumn('time_table_structure', 'session_id', { transaction });
      }
      if (structure.course_id) {
        await queryInterface.removeColumn('time_table_structure', 'course_id', { transaction });
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
      const structure = await queryInterface.describeTable('time_table_structure');

      if (!structure.session_id) {
        await queryInterface.addColumn(
          'time_table_structure',
          'session_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'session',
              key: 'session_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (!structure.course_id) {
        await queryInterface.addColumn(
          'time_table_structure',
          'course_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'course',
              key: 'course_id',
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
};
