'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('library_book_subject_mappings', {
      library_subject_mapping_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      library_subject_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subject',
          key: 'subject_id',
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

    if (bookTable.subject_id) {
      const [booksWithSubjects] = await queryInterface.sequelize.query(
        `SELECT lb.library_book_id, lb.subject_id, lc.institute_id
         FROM library_book lb
         INNER JOIN library_creation lc ON lc.library_creation_id = lb.library_creation_id
         WHERE lb.subject_id IS NOT NULL`,
      );

      for (const row of booksWithSubjects) {
        let subjectIds = [];
        try {
          const parsed = typeof row.subject_id === 'string'
            ? JSON.parse(row.subject_id)
            : row.subject_id;
          subjectIds = Array.isArray(parsed) ? parsed : parsed != null ? [parsed] : [];
        } catch {
          subjectIds = [];
        }

        const uniqueIds = [...new Set(subjectIds.map(Number).filter((id) => !Number.isNaN(id) && id > 0))];
        for (const librarySubjectId of uniqueIds) {
          await queryInterface.bulkInsert('library_book_subject_mappings', [{
            library_subject_id: librarySubjectId,
            library_book_id: row.library_book_id,
            institute_id: row.institute_id,
          }]);
        }
      }

      await queryInterface.removeColumn('library_book', 'subject_id');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const bookTable = await queryInterface.describeTable('library_book');

    if (!bookTable.subject_id) {
      await queryInterface.addColumn('library_book', 'subject_id', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    await queryInterface.dropTable('library_book_subject_mappings');
  },
};
