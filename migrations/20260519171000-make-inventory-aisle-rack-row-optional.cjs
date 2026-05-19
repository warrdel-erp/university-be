'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make libraryAisleId, libraryRackId, libraryRowId optional (nullable)
    await queryInterface.changeColumn('library_book_inventory', 'library_aisle_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.changeColumn('library_book_inventory', 'library_rack_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.changeColumn('library_book_inventory', 'library_row_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    const tableDefinition = await queryInterface.describeTable('library_book_inventory');

    if (tableDefinition.excision_number) {
      // Rename excision_number to accession_number
      await queryInterface.renameColumn('library_book_inventory', 'excision_number', 'accession_number');
    }

    // Fill NULL values of accession_number before making it NOT NULL to avoid errors
    await queryInterface.sequelize.query(
      "UPDATE library_book_inventory SET accession_number = CONCAT('TEMP-', inventory_id) WHERE accession_number IS NULL OR accession_number = '';"
    );

    await queryInterface.changeColumn('library_book_inventory', 'accession_number', {
      type: Sequelize.STRING,
      allowNull: false
    });

    const inventoryAfter = await queryInterface.describeTable('library_book_inventory');
    if (!inventoryAfter.condition) {
      await queryInterface.addColumn('library_book_inventory', 'condition', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const inventoryTable = await queryInterface.describeTable('library_book_inventory');
    if (inventoryTable.condition) {
      await queryInterface.removeColumn('library_book_inventory', 'condition');
    }

    // Revert libraryAisleId, libraryRackId, libraryRowId to be mandatory
    await queryInterface.changeColumn('library_book_inventory', 'library_aisle_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await queryInterface.changeColumn('library_book_inventory', 'library_rack_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await queryInterface.changeColumn('library_book_inventory', 'library_row_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    // Revert accessionNumber to optional and rename back to excision_number
    await queryInterface.changeColumn('library_book_inventory', 'accession_number', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.renameColumn('library_book_inventory', 'accession_number', 'excision_number');
  }
};
