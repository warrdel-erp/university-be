'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add columns to course table
    await queryInterface.addColumn('course', 'term_type', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'capacity'
    });
    await queryInterface.addColumn('course', 'total_semester', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'term_type'
    });

    // 2. Populate course table with data from semester table
    try {
      const [results] = await queryInterface.sequelize.query(`
        SELECT course_id, MAX(term_type) as term_type, MAX(total_semester) as total_semester 
        FROM semester 
        GROUP BY course_id
      `);

      for (const row of results) {
        await queryInterface.sequelize.query(`
          UPDATE course 
          SET term_type = ?, total_semester = ? 
          WHERE course_id = ?
        `, {
          replacements: [row.term_type, row.total_semester, row.course_id]
        });
      }
    } catch (error) {
      console.error('Error migrating data from semester to course:', error);
    }

    // 3. (REMOVED) Remove columns from semester table
    // await queryInterface.removeColumn('semester', 'term_type');
    // await queryInterface.removeColumn('semester', 'total_semester');
  },

  async down(queryInterface, Sequelize) {
    // Remove columns from course table
    await queryInterface.removeColumn('course', 'term_type');
    await queryInterface.removeColumn('course', 'total_semester');
  }
};
