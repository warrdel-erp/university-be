"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add barcode to library_book
     */
    await queryInterface.addColumn("library_book", "barcode", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    /**
     * Add excision_number to library_book_inventory
     */
    await queryInterface.addColumn("library_book_inventory", "excision_number", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    /**
     * Remove barcode from library_book_inventory
     */
    await queryInterface.removeColumn("library_book_inventory", "barcode");
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add barcode back to library_book_inventory
     */
    await queryInterface.addColumn("library_book_inventory", "barcode", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    /**
     * Remove excision_number from library_book_inventory
     */
    await queryInterface.removeColumn("library_book_inventory", "excision_number");

    /**
     * Remove barcode from library_book
     */
    await queryInterface.removeColumn("library_book", "barcode");
  },
};
