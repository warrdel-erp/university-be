'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex(
      'library_book_category_mappings',
      ['library_book_id', 'library_category_id'],
      {
        unique: true,
        name: 'uq_library_book_category',
      },
    );

    await queryInterface.addIndex(
      'library_book_subject_mappings',
      ['library_book_id', 'library_subject_id'],
      {
        unique: true,
        name: 'uq_library_book_subject',
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      'library_book_category_mappings',
      'uq_library_book_category',
    );
    await queryInterface.removeIndex(
      'library_book_subject_mappings',
      'uq_library_book_subject',
    );
  },
};
