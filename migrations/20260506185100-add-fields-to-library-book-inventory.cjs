'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('library_book_inventory', 'bill_no', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('library_book_inventory', 'bill_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('library_book_inventory', 'item_price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('library_book_inventory', 'net_price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('library_book_inventory', 'currency', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('library_book_inventory', 'currency');
    await queryInterface.removeColumn('library_book_inventory', 'net_price');
    await queryInterface.removeColumn('library_book_inventory', 'item_price');
    await queryInterface.removeColumn('library_book_inventory', 'bill_date');
    await queryInterface.removeColumn('library_book_inventory', 'bill_no');
  },
};
