'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('library_return_book_transaction', {
      library_return_book_transaction_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      return_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addColumn(
      'library_book_issue_inventory_item',
      'library_return_book_transaction_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
    );

    await queryInterface.addConstraint(
      'library_book_issue_inventory_item',
      {
        fields: ['library_return_book_transaction_id'],
        type: 'foreign key',
        name: 'fk_lib_issue_item_return_txn_id',
        references: {
          table: 'library_return_book_transaction',
          field: 'library_return_book_transaction_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'library_book_issue_inventory_item',
      'fk_lib_issue_item_return_txn_id',
    );
    await queryInterface.removeColumn(
      'library_book_issue_inventory_item',
      'library_return_book_transaction_id',
    );
    await queryInterface.dropTable('library_return_book_transaction');
  },
};
