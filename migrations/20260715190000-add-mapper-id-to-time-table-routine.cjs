'use strict';

/** Link time_table_routine to time_table_structure_course via mapper PK. */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'time_table_routine',
        'timetable_structure_course_mapper_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'time_table_structure_course',
            key: 'timetable_structure_course_mapper_id',
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
          ON m.time_table_name_id = r.time_table_name_id
         AND m.course_id = r.course_id
        SET r.timetable_structure_course_mapper_id = m.timetable_structure_course_mapper_id
        WHERE r.timetable_structure_course_mapper_id IS NULL
        `,
        { transaction },
      );

      await queryInterface.changeColumn(
        'time_table_routine',
        'timetable_structure_course_mapper_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'time_table_structure_course',
            key: 'timetable_structure_course_mapper_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );

      await queryInterface.addIndex(
        'time_table_routine',
        ['timetable_structure_course_mapper_id'],
        {
          name: 'idx_routine_tts_course_mapper',
          transaction,
        },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex(
        'time_table_routine',
        'idx_routine_tts_course_mapper',
        { transaction },
      );
      await queryInterface.removeColumn(
        'time_table_routine',
        'timetable_structure_course_mapper_id',
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
