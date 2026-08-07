'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('examination_session_term', ['examination_session_id', 'class_section_term_id'], {
      unique: true,
      name: 'unique_examination_session_class_section_term',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('examination_session_term', 'unique_examination_session_class_section_term');
  },
};
