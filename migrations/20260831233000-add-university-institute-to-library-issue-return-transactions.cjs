'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: referenceModel
            ? {
                model: referenceModel,
                key: referenceKey,
              }
            : undefined,
        });
      }
    };

    await addColumnIfNotExists(
      'library_issue_book_transaction',
      'university_id',
      'university',
      'university_id',
    );
    await addColumnIfNotExists(
      'library_issue_book_transaction',
      'institute_id',
      'institute',
      'institute_id',
    );

    await addColumnIfNotExists(
      'library_return_book_transaction',
      'university_id',
      'university',
      'university_id',
    );
    await addColumnIfNotExists(
      'library_return_book_transaction',
      'institute_id',
      'institute',
      'institute_id',
    );

    // Backfill issue transactions from library_creation via inventory/book chain
    await queryInterface.sequelize
      .query(`
      UPDATE library_issue_book_transaction lbt
      JOIN library_book_issue_inventory_item bi
        ON lbt.library_issue_book_transaction_id = bi.library_issue_book_transaction_id
      JOIN library_book_inventory inv
        ON bi.inventory_id = inv.inventory_id
      JOIN library_book lb
        ON inv.library_book_id = lb.library_book_id
      JOIN library_creation lc
        ON lb.library_creation_id = lc.library_creation_id
      SET
        lbt.university_id = COALESCE(lbt.university_id, lc.university_id),
        lbt.institute_id = COALESCE(lbt.institute_id, lc.institute_id),
        lbt.campus_id = COALESCE(lbt.campus_id, lc.campus_id)
      WHERE
        lbt.university_id IS NULL
        OR lbt.institute_id IS NULL
        OR lbt.campus_id IS NULL;
    `)
      .catch(() => {});

    // Fallback: fill university from institute when institute is already known
    await queryInterface.sequelize
      .query(`
      UPDATE library_issue_book_transaction lbt
      JOIN institute i ON lbt.institute_id = i.institute_id
      SET lbt.university_id = COALESCE(lbt.university_id, i.university_id)
      WHERE lbt.university_id IS NULL;
    `)
      .catch(() => {});

    // Fallback from campus when book chain left institute empty
    await queryInterface.sequelize
      .query(`
      UPDATE library_issue_book_transaction lbt
      JOIN campus c ON lbt.campus_id = c.campus_id
      JOIN institute i ON i.campus_id = c.campus_id
      SET
        lbt.institute_id = COALESCE(lbt.institute_id, i.institute_id),
        lbt.university_id = COALESCE(lbt.university_id, i.university_id)
      WHERE
        (lbt.university_id IS NULL OR lbt.institute_id IS NULL)
        AND lbt.campus_id IS NOT NULL;
    `)
      .catch(() => {});

    // Backfill return transactions from library_creation via inventory/book chain
    await queryInterface.sequelize
      .query(`
      UPDATE library_return_book_transaction lrbt
      JOIN library_book_issue_inventory_item bi
        ON lrbt.library_return_book_transaction_id = bi.library_return_book_transaction_id
      JOIN library_book_inventory inv
        ON bi.inventory_id = inv.inventory_id
      JOIN library_book lb
        ON inv.library_book_id = lb.library_book_id
      JOIN library_creation lc
        ON lb.library_creation_id = lc.library_creation_id
      SET
        lrbt.university_id = COALESCE(lrbt.university_id, lc.university_id),
        lrbt.institute_id = COALESCE(lrbt.institute_id, lc.institute_id),
        lrbt.campus_id = COALESCE(lrbt.campus_id, lc.campus_id)
      WHERE
        lrbt.university_id IS NULL
        OR lrbt.institute_id IS NULL
        OR lrbt.campus_id IS NULL;
    `)
      .catch(() => {});

    await queryInterface.sequelize
      .query(`
      UPDATE library_return_book_transaction lrbt
      JOIN institute i ON lrbt.institute_id = i.institute_id
      SET lrbt.university_id = COALESCE(lrbt.university_id, i.university_id)
      WHERE lrbt.university_id IS NULL;
    `)
      .catch(() => {});

    await queryInterface.sequelize
      .query(`
      UPDATE library_return_book_transaction lrbt
      JOIN campus c ON lrbt.campus_id = c.campus_id
      JOIN institute i ON i.campus_id = c.campus_id
      SET
        lrbt.institute_id = COALESCE(lrbt.institute_id, i.institute_id),
        lrbt.university_id = COALESCE(lrbt.university_id, i.university_id)
      WHERE
        (lrbt.university_id IS NULL OR lrbt.institute_id IS NULL)
        AND lrbt.campus_id IS NOT NULL;
    `)
      .catch(() => {});
  },

  async down(queryInterface) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('library_issue_book_transaction', 'university_id');
    await removeColumnIfExists('library_issue_book_transaction', 'institute_id');
    await removeColumnIfExists('library_return_book_transaction', 'university_id');
    await removeColumnIfExists('library_return_book_transaction', 'institute_id');
  },
};
