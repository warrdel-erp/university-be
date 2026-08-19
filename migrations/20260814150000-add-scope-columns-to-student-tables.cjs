'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('students');
    if (!desc['department_id']) {
      await queryInterface.addColumn('students', 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'department',
          key: 'department_id'
        }
      });
    }

    // BACKFILL DEPARTMENT_ID FROM COURSE
    await queryInterface.sequelize.query(`
      UPDATE students s
      JOIN course c ON s.course_id = c.course_id
      SET s.department_id = c.department_id
      WHERE s.department_id IS NULL AND c.department_id IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('students');
    if (desc['department_id']) {
      await queryInterface.removeColumn('students', 'department_id');
    }
  }
};
