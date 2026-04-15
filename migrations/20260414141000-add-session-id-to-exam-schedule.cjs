'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('exam_schedule', 'session_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'session',
        key: 'session_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Populate session_id from session_course_mapping based on course_id in exam_setup_type_term
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule es
      JOIN exam_setup_type_term estt ON es.exam_setup_type_term_id = estt.exam_setup_type_term_id
      SET es.session_id = (
        SELECT MIN(scm.session_id)
        FROM session_course_mapping scm
        WHERE scm.course_id = estt.course_id
      )
      WHERE es.session_id IS NULL;
    `);

    // Fallback: If some still NULL (maybe no session_course_mapping), use the first available session
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule es
      SET es.session_id = (SELECT MIN(session_id) FROM session)
      WHERE es.session_id IS NULL;
    `);

    await queryInterface.changeColumn('exam_schedule', 'session_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'session',
        key: 'session_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('exam_schedule', 'session_id');
  }
};
