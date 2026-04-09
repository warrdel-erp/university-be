'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('exam_setup_type_term', {
      fields: ['exam_setup_type_id', 'term', 'course_id'],
      type: 'unique',
      name: 'unique_exam_setup_type_term_course'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('exam_setup_type_term', 'unique_exam_setup_type_term_course');
  }
};
