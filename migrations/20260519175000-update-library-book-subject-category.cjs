'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('library_book');

    if (tableDefinition.subject_id && tableDefinition.subject_id.type.includes('INT')) {
      await queryInterface.addColumn('library_book', 'subject_id_json', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        'UPDATE library_book SET subject_id_json = JSON_ARRAY(subject_id) WHERE subject_id IS NOT NULL',
      );
      await queryInterface.removeColumn('library_book', 'subject_id');
      await queryInterface.renameColumn('library_book', 'subject_id_json', 'subject_id');
    } else if (tableDefinition.subject_id) {
      await queryInterface.changeColumn('library_book', 'subject_id', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    } else {
      await queryInterface.addColumn('library_book', 'subject_id', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!tableDefinition.category_id) {
      await queryInterface.addColumn('library_book', 'category_id', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert category_id
    await queryInterface.removeColumn('library_book', 'category_id');

    // Revert subject_id to INTEGER
    await queryInterface.changeColumn('library_book', 'subject_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
