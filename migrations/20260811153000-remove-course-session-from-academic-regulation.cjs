'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the foreign key constraints first if they exist
    // The constraint name might vary depending on how it was created.
    // If it was created automatically by Sequelize, it's usually table_name_column_name_fkey
    try {
      await queryInterface.removeConstraint('academic_regulation', 'academic_regulation_course_id_fkey');
    } catch (error) {
      console.log('Foreign key academic_regulation_course_id_fkey not found or already removed');
    }

    try {
      await queryInterface.removeConstraint('academic_regulation', 'academic_regulation_session_id_fkey');
    } catch (error) {
      console.log('Foreign key academic_regulation_session_id_fkey not found or already removed');
    }

    // Now remove the columns
    await queryInterface.removeColumn('academic_regulation', 'course_id');
    await queryInterface.removeColumn('academic_regulation', 'session_id');
  },

  async down(queryInterface, Sequelize) {
    // Add the columns back in case of rollback
    await queryInterface.addColumn('academic_regulation', 'course_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'course',
        key: 'course_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('academic_regulation', 'session_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'session',
        key: 'session_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};
