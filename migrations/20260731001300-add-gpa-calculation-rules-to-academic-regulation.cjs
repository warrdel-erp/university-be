'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.calculate_sgpa) {
      await queryInterface.addColumn('academic_regulation', 'calculate_sgpa', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.calculate_cgpa) {
      await queryInterface.addColumn('academic_regulation', 'calculate_cgpa', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.calculate_percentage) {
      await queryInterface.addColumn('academic_regulation', 'calculate_percentage', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    if (!tableInfo.generate_class) {
      await queryInterface.addColumn('academic_regulation', 'generate_class', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }

    if (!tableInfo.generate_rank) {
      await queryInterface.addColumn('academic_regulation', 'generate_rank', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    if (!tableInfo.tie_breaking_method) {
      await queryInterface.addColumn('academic_regulation', 'tie_breaking_method', {
        type: Sequelize.ENUM('HIGHER_CGPA', 'HIGHER_SGPA', 'HIGHER_INTERNAL_MARKS', 'HIGHER_EXTERNAL_MARKS', 'ALPHABETICAL', 'RANDOM'),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.tie_breaking_method) await queryInterface.removeColumn('academic_regulation', 'tie_breaking_method');
    if (tableInfo.generate_rank) await queryInterface.removeColumn('academic_regulation', 'generate_rank');
    if (tableInfo.generate_class) await queryInterface.removeColumn('academic_regulation', 'generate_class');
    if (tableInfo.calculate_percentage) await queryInterface.removeColumn('academic_regulation', 'calculate_percentage');
    if (tableInfo.calculate_cgpa) await queryInterface.removeColumn('academic_regulation', 'calculate_cgpa');
    if (tableInfo.calculate_sgpa) await queryInterface.removeColumn('academic_regulation', 'calculate_sgpa');
  }
};
