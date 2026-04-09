'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('exam_setup_type', 'evaluated_by');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('exam_setup_type', 'evaluated_by', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
