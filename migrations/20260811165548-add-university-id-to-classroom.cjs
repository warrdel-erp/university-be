'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('class_room_section');

    if (!tableDesc.university_id) {
      await queryInterface.addColumn('class_room_section', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'university',
          key: 'university_id'
        }
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE class_room_section c
      JOIN institute i ON c.institute_id = i.institute_id
      SET c.university_id = i.university_id
    `);
  },

  async down (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('class_room_section');
    
    if (tableDesc.university_id) {
      await queryInterface.removeColumn('class_room_section', 'university_id');
    }
  }
};
