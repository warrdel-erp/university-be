'use strict';

/** Unique mapping is (structure, course, session); session_id required. */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const indexes = await queryInterface.showIndex('time_table_structure_course');
      for (const index of indexes) {
        if (index.name === 'uniq_tts_course_structure_course') {
          await queryInterface.removeIndex(
            'time_table_structure_course',
            'uniq_tts_course_structure_course',
            { transaction },
          );
        }
      }

      await queryInterface.sequelize.query(
        `
        UPDATE time_table_structure_course m
        INNER JOIN time_table_structure s
          ON s.time_table_name_id = m.time_table_name_id
        SET m.session_id = s.session_id
        WHERE m.session_id IS NULL
          AND s.session_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.changeColumn(
        'time_table_structure_course',
        'session_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'session',
            key: 'session_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction },
      );

      const indexesAfter = await queryInterface.showIndex('time_table_structure_course');
      let hasNew = false;
      for (const index of indexesAfter) {
        if (index.name === 'uniq_tts_course_session') {
          hasNew = true;
        }
      }
      if (!hasNew) {
        await queryInterface.addIndex(
          'time_table_structure_course',
          ['time_table_name_id', 'course_id', 'session_id'],
          {
            unique: true,
            name: 'uniq_tts_course_session',
            transaction,
          },
        );
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
      await queryInterface.removeIndex(
        'time_table_structure_course',
        'uniq_tts_course_session',
        { transaction },
      );

      await queryInterface.changeColumn(
        'time_table_structure_course',
        'session_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addIndex(
        'time_table_structure_course',
        ['time_table_name_id', 'course_id'],
        {
          unique: true,
          name: 'uniq_tts_course_structure_course',
          transaction,
        },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
