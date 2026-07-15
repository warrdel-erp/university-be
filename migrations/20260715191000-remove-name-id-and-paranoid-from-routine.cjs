'use strict';

/** Drop routine.time_table_name_id and soft-delete (deleted_at / paranoid). */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('time_table_routine');

      if (table.deleted_at) {
        await queryInterface.sequelize.query(
          `DELETE FROM time_table_routine WHERE deleted_at IS NOT NULL`,
          { transaction },
        );
        await queryInterface.removeColumn('time_table_routine', 'deleted_at', { transaction });
      }

      if (table.time_table_name_id) {
        await queryInterface.removeColumn('time_table_routine', 'time_table_name_id', { transaction });
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
      await queryInterface.addColumn(
        'time_table_routine',
        'time_table_name_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'time_table_structure',
            key: 'time_table_name_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE time_table_routine r
        INNER JOIN time_table_structure_course m
          ON m.timetable_structure_course_mapper_id = r.timetable_structure_course_mapper_id
        SET r.time_table_name_id = m.time_table_name_id
        WHERE r.time_table_name_id IS NULL
        `,
        { transaction },
      );

      await queryInterface.addColumn(
        'time_table_routine',
        'deleted_at',
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
