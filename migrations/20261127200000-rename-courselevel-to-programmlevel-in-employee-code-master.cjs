'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE employee_code_master 
       SET code_master_type = 'ProgramLevel' 
       WHERE code_master_type = 'CourseLevel'`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE employee_code_master 
       SET code_master_type = 'CourseLevel' 
       WHERE code_master_type = 'ProgramLevel'`
    );
  }
};
