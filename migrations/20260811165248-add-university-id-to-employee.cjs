'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('employee');

    if (!tableDesc.university_id) {
      await queryInterface.addColumn('employee', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'university',
          key: 'university_id'
        }
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE employee e
      JOIN institute i ON e.institute_id = i.institute_id
      SET e.university_id = i.university_id
    `);
  },

  async down (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('employee');
    
    if (tableDesc.university_id) {
      await queryInterface.removeColumn('employee', 'university_id');
    }
  }
};
