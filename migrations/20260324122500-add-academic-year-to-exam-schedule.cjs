'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add acedmic_year_id column to exam_schedule as nullable first
    await queryInterface.addColumn('exam_schedule', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'acedmic_year',
        key: 'acedmic_year_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Populate acedmic_year_id from subject table
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule es
      INNER JOIN subject s ON es.subject_id = s.subject_id
      SET es.acedmic_year_id = s.acedmic_year_id
      WHERE es.acedmic_year_id IS NULL;
    `);

    // 3. Make it NOT NULL
    await queryInterface.changeColumn('exam_schedule', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'acedmic_year',
        key: 'acedmic_year_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION' // Changed to NO ACTION since it's NOT NULL now
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('exam_schedule', 'acedmic_year_id');
  }
};
