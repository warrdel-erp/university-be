'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.acedmic_year_id) {
      try {
        await queryInterface.removeColumn('academic_regulation', 'acedmic_year_id');
      } catch (e) {
        console.log("Error removing acedmic_year_id:", e.message);
      }
    }

    if (!tableInfo.academic_year_range) {
      await queryInterface.addColumn('academic_regulation', 'academic_year_range', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.academic_year_range) {
      await queryInterface.removeColumn('academic_regulation', 'academic_year_range');
    }

    if (!tableInfo.acedmic_year_id) {
      await queryInterface.addColumn('academic_regulation', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  }
};
