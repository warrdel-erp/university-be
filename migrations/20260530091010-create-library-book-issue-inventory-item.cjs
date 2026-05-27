'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('library_book_issue_inventory_item', {
      library_book_issue_inventory_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      library_issue_book_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'library_issue_book_transaction',
          key: 'library_issue_book_transaction_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      inventory_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'library_book_inventory',
          key: 'inventory_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      return_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'NULL = copy still issued; set when returned',
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

    await queryInterface.addIndex(
      'library_book_issue_inventory_item',
      ['inventory_id', 'return_date'],
      { name: 'idx_library_book_issue_inventory_item_inventory_return' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('library_book_issue_inventory_item');
  },
};

