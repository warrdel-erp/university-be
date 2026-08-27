'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('student_hall_ticket', 'previous_eligibility_status', {
        type: Sequelize.STRING,
        allowNull: true
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'override_reason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'override_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'override_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'previous_eligibility_status');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'override_reason');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'override_by');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'override_at');
    } catch (e) {}
  }
};
