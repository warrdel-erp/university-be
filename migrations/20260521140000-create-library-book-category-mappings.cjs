'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('library_book_category_mappings', {
      library_category_mapping_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      library_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'library_category',
          key: 'library_category_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      library_book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'library_book',
          key: 'library_book_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    const bookTable = await queryInterface.describeTable('library_book');

    if (bookTable.category_id) {
      const [booksWithCategories] = await queryInterface.sequelize.query(
        `SELECT lb.library_book_id, lb.category_id, lc.institute_id
         FROM library_book lb
         INNER JOIN library_creation lc ON lc.library_creation_id = lb.library_creation_id
         WHERE lb.category_id IS NOT NULL`,
      );

      for (const row of booksWithCategories) {
        let categoryIds = [];
        try {
          const parsed = typeof row.category_id === 'string'
            ? JSON.parse(row.category_id)
            : row.category_id;
          categoryIds = Array.isArray(parsed) ? parsed : parsed != null ? [parsed] : [];
        } catch {
          categoryIds = [];
        }

        const uniqueIds = [...new Set(categoryIds.map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
        for (const libraryCategoryId of uniqueIds) {
          await queryInterface.bulkInsert('library_book_category_mappings', [{
            library_category_id: libraryCategoryId,
            library_book_id: row.library_book_id,
            institute_id: row.institute_id,
          }]);
        }
      }

      await queryInterface.removeColumn('library_book', 'category_id');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const bookTable = await queryInterface.describeTable('library_book');

    if (!bookTable.category_id) {
      await queryInterface.addColumn('library_book', 'category_id', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    await queryInterface.dropTable('library_book_category_mappings');
  },
};
