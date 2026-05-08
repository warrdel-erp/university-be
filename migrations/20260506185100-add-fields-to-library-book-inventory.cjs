'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('library_book_inventory');

    if (!tableDefinition.bill_no) {
      await queryInterface.addColumn('library_book_inventory', 'bill_no', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDefinition.bill_date) {
      await queryInterface.addColumn('library_book_inventory', 'bill_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    if (!tableDefinition.item_price) {
      await queryInterface.addColumn('library_book_inventory', 'item_price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableDefinition.net_price) {
      await queryInterface.addColumn('library_book_inventory', 'net_price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableDefinition.currency) {
      await queryInterface.addColumn('library_book_inventory', 'currency', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('library_book_inventory');

    if (tableDefinition.currency) {
      await queryInterface.removeColumn('library_book_inventory', 'currency');
    }
    if (tableDefinition.net_price) {
      await queryInterface.removeColumn('library_book_inventory', 'net_price');
    }
    if (tableDefinition.item_price) {
      await queryInterface.removeColumn('library_book_inventory', 'item_price');
    }
    if (tableDefinition.bill_date) {
      await queryInterface.removeColumn('library_book_inventory', 'bill_date');
    }
    if (tableDefinition.bill_no) {
      await queryInterface.removeColumn('library_book_inventory', 'bill_no');
    }
  },
};
