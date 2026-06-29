'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('syllabus_unit', {
      deleted_at: {
        [Sequelize.Op.ne]: null,
      },
    });

    await queryInterface.removeColumn('syllabus_unit', 'deleted_at');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('syllabus_unit', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
