'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('students');
    if (!tableInfo.admission_number) {
      await queryInterface.addColumn('students', 'admission_number', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'enroll_number',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('students');
    if (tableInfo.admission_number) {
      await queryInterface.removeColumn('students', 'admission_number');
    }
  }
};
