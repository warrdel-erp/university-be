'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1) Preserve old data: create return transaction rows from legacy return_date.
      await queryInterface.sequelize.query(
        `
        INSERT INTO library_return_book_transaction (
          return_date,
          created_at,
          updated_at
        )
        SELECT
          legacy.return_date,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM (
          SELECT DISTINCT return_date
          FROM library_book_issue_inventory_item
          WHERE return_date IS NOT NULL
        ) legacy
        LEFT JOIN library_return_book_transaction rt
          ON rt.return_date = legacy.return_date
        WHERE rt.library_return_book_transaction_id IS NULL
        `,
        { transaction },
      );

      // 2) Link any remaining old rows to the new return transaction id.
      await queryInterface.sequelize.query(
        `
        UPDATE library_book_issue_inventory_item item
        INNER JOIN library_return_book_transaction rt
          ON rt.return_date = item.return_date
        SET item.library_return_book_transaction_id = rt.library_return_book_transaction_id
        WHERE item.return_date IS NOT NULL
          AND item.library_return_book_transaction_id IS NULL
        `,
        { transaction },
      );

      // 3) Drop legacy column once data is preserved.
      await queryInterface.removeColumn(
        'library_book_issue_inventory_item',
        'return_date',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1) Recreate legacy column.
      await queryInterface.addColumn(
        'library_book_issue_inventory_item',
        'return_date',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction },
      );

      // 2) Restore return_date from linked return transaction.
      await queryInterface.sequelize.query(
        `
        UPDATE library_book_issue_inventory_item item
        LEFT JOIN library_return_book_transaction rt
          ON rt.library_return_book_transaction_id = item.library_return_book_transaction_id
        SET item.return_date = rt.return_date
        WHERE item.library_return_book_transaction_id IS NOT NULL
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
