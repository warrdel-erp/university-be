'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hard delete any soft-deleted records before removing the column
    await queryInterface.bulkDelete('exam_setup_type_term', {
      deleted_at: {
        [Sequelize.Op.ne]: null
      }
    });

    await queryInterface.removeColumn('exam_setup_type_term', 'deleted_at');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('exam_setup_type_term', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};
