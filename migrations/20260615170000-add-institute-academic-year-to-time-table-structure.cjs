'use strict';

/** Add institute_id and acedmic_year_id to time_table_structure */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('time_table_structure', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'institute',
        key: 'institute_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addColumn('time_table_structure', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'acedmic_year',
        key: 'acedmic_year_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.sequelize.query(`
      UPDATE time_table_structure tts
      INNER JOIN course c ON c.course_id = tts.course_id
      SET tts.institute_id = c.institute_id
      WHERE tts.institute_id IS NULL
        AND tts.course_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE time_table_structure tts
      INNER JOIN (
        SELECT time_table_name_id, MIN(acedmic_year_id) AS acedmic_year_id
        FROM time_table_routine
        GROUP BY time_table_name_id
      ) r ON r.time_table_name_id = tts.time_table_name_id
      SET tts.acedmic_year_id = r.acedmic_year_id
      WHERE tts.acedmic_year_id IS NULL
    `);

    await queryInterface.changeColumn('time_table_structure', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'institute',
        key: 'institute_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('time_table_structure', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'acedmic_year',
        key: 'acedmic_year_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('time_table_structure', 'acedmic_year_id');
    await queryInterface.removeColumn('time_table_structure', 'institute_id');
  },
};
