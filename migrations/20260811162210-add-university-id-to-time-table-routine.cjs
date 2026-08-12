'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('time_table_routine', 'university_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'university',
        key: 'university_id'
      }
    });

    await queryInterface.sequelize.query(`
      UPDATE time_table_routine 
      SET university_id = (
        SELECT university_id 
        FROM institute 
        WHERE institute.institute_id = time_table_routine.institute_id
      )
      WHERE institute_id IS NOT NULL;
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('time_table_routine', 'university_id');
  }
};
