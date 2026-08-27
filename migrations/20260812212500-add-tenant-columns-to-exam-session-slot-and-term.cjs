'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add columns with allowNull: true first
    const tables = ['examination_session_slot', 'examination_session_term'];

    for (const table of tables) {
      await queryInterface.addColumn(table, 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'university',
          key: 'university_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      await queryInterface.addColumn(table, 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'institute',
          key: 'institute_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      await queryInterface.addColumn(table, 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    // 2. Backfill data from examination_session table
    await queryInterface.sequelize.query(`
      UPDATE examination_session_slot ess
      INNER JOIN examination_session es ON es.examination_session_id = ess.examination_session_id
      SET ess.university_id = es.university_id,
          ess.institute_id = es.institute_id,
          ess.acedmic_year_id = es.acedmic_year_id;
    `);

    await queryInterface.sequelize.query(`
      UPDATE examination_session_term est
      INNER JOIN examination_session es ON es.examination_session_id = est.examination_session_id
      SET est.university_id = es.university_id,
          est.institute_id = es.institute_id,
          est.acedmic_year_id = es.acedmic_year_id;
    `);

    // 3. Change columns to allowNull: false
    for (const table of tables) {
      await queryInterface.changeColumn(table, 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'university',
          key: 'university_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      await queryInterface.changeColumn(table, 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      await queryInterface.changeColumn(table, 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  },

  down: async (queryInterface) => {
    const tables = ['examination_session_term', 'examination_session_slot'];
    for (const table of tables) {
      await queryInterface.removeColumn(table, 'acedmic_year_id');
      await queryInterface.removeColumn(table, 'institute_id');
      await queryInterface.removeColumn(table, 'university_id');
    }
  },
};
