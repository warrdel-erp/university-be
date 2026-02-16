'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subject', 'campus_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'campus',
        key: 'campus_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Populate existing data by joining with institute
    await queryInterface.sequelize.query(`
      UPDATE subject s 
      JOIN institute i ON s.institute_id = i.institute_id 
      SET s.campus_id = i.campus_id 
      WHERE s.campus_id IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('subject', 'campus_id');
  }
};
