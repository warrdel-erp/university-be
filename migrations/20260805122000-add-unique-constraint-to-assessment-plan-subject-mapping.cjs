'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addIndex('assessment_plan_subject_mapping', ['subject_id', 'course_id', 'session_id', 'assessment_plan_id'], {
        unique: true,
        name: 'unique_subject_course_session_assessment_plan',
      });
    } catch (err) {
      console.log('Index unique_subject_course_session_assessment_plan already exists or cannot be created:', err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('assessment_plan_subject_mapping', 'unique_subject_course_session_assessment_plan');
    } catch (err) {
      console.log('Error removing index unique_subject_course_session_assessment_plan:', err.message);
    }
  }
};
