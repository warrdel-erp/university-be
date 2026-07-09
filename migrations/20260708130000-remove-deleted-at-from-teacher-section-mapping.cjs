'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('teacher_section_mapping', {
      deleted_at: {
        [Sequelize.Op.ne]: null,
      },
    });

    await queryInterface.removeColumn('teacher_section_mapping', 'deleted_at');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teacher_section_mapping', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
