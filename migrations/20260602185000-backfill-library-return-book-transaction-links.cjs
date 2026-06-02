'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Create one return transaction per distinct legacy return_date.
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

      // Link legacy returned rows to the new return transaction id.
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

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        UPDATE library_book_issue_inventory_item
        SET library_return_book_transaction_id = NULL
        WHERE return_date IS NOT NULL
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
