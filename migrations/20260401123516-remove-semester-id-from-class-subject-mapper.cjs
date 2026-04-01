'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('class_subject_mapper', 'semester_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('class_subject_mapper', 'semester_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'semester',
        key: 'semester_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};
