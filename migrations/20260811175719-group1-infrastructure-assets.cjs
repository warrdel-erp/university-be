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
          references: {
            model: referenceModel,
            key: referenceKey
          }
        });
      }
    };

    // 1. building
    await addColumnIfNotExists('building', 'university_id', 'university', 'university_id');
    // 2. floor
    await addColumnIfNotExists('floor', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('floor', 'institute_id', 'institute', 'institute_id');
    // 3. asset_categories
    await addColumnIfNotExists('asset_categories', 'university_id', 'university', 'university_id');
    // 4. asset
    await addColumnIfNotExists('asset', 'university_id', 'university', 'university_id');
    // 5. asset_inventory_item
    await addColumnIfNotExists('asset_inventory_item', 'university_id', 'university', 'university_id');
    // 6. asset_issue_transaction
    await addColumnIfNotExists('asset_issue_transaction', 'university_id', 'university', 'university_id');
    // 7. asset_issue_inventory_item
    await addColumnIfNotExists('asset_issue_inventory_item', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('asset_issue_inventory_item', 'institute_id', 'institute', 'institute_id');
    // 8. asset_return_transaction
    await addColumnIfNotExists('asset_return_transaction', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('asset_return_transaction', 'institute_id', 'institute', 'institute_id');
    // 9. add_dormitory
    await addColumnIfNotExists('add_dormitory', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('add_dormitory', 'institute_id', 'institute', 'institute_id');
    // 10. transport_vehicle
    await addColumnIfNotExists('transport_vehicle', 'university_id', 'university', 'university_id');
    // 11. assign_vehicle
    await addColumnIfNotExists('assign_vehicle', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('assign_vehicle', 'institute_id', 'institute', 'institute_id');


    // BACKFILL QUERIES

    // 1. building (from institute)
    await queryInterface.sequelize.query(`
      UPDATE building b
      JOIN institute i ON b.institute_id = i.institute_id
      SET b.university_id = i.university_id
    `);

    // 2. floor (from building, which now has university_id)
    await queryInterface.sequelize.query(`
      UPDATE floor f
      JOIN building b ON f.building_id = b.building_id
      SET f.institute_id = b.institute_id, f.university_id = b.university_id
    `);

    // 3. asset_categories (from institute)
    await queryInterface.sequelize.query(`
      UPDATE asset_categories a
      JOIN institute i ON a.institute_id = i.institute_id
      SET a.university_id = i.university_id
    `);

    // 4. asset (from institute)
    await queryInterface.sequelize.query(`
      UPDATE asset a
      JOIN institute i ON a.institute_id = i.institute_id
      SET a.university_id = i.university_id
    `);

    // 5. asset_inventory_item (from institute)
    await queryInterface.sequelize.query(`
      UPDATE asset_inventory_item a
      JOIN institute i ON a.institute_id = i.institute_id
      SET a.university_id = i.university_id
    `);

    // 6. asset_issue_transaction (from institute)
    await queryInterface.sequelize.query(`
      UPDATE asset_issue_transaction a
      JOIN institute i ON a.institute_id = i.institute_id
      SET a.university_id = i.university_id
    `);

    // 7. asset_issue_inventory_item (from asset_issue_transaction)
    await queryInterface.sequelize.query(`
      UPDATE asset_issue_inventory_item a
      JOIN asset_issue_transaction t ON a.asset_issue_transaction_id = t.asset_issue_transaction_id
      SET a.institute_id = t.institute_id, a.university_id = t.university_id
    `);

    // 8. asset_return_transaction (cannot backfill, no FKs)

    // 9. add_dormitory (from dormitory_list)
    await queryInterface.sequelize.query(`
      UPDATE add_dormitory d
      JOIN dormitory_list l ON d.dormitory = l.dormitory_list_id
      SET d.institute_id = l.institute_id, d.university_id = l.university_id
    `);

    // 10. transport_vehicle (from institute)
    await queryInterface.sequelize.query(`
      UPDATE transport_vehicle v
      JOIN institute i ON v.institute_id = i.institute_id
      SET v.university_id = i.university_id
    `);

    // 11. assign_vehicle (from transport_vehicle)
    await queryInterface.sequelize.query(`
      UPDATE assign_vehicle a
      JOIN transport_vehicle v ON a.vehicle_id = v.vehicle_id
      SET a.institute_id = v.institute_id, a.university_id = v.university_id
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('building', 'university_id');
    await removeColumnIfExists('floor', 'university_id');
    await removeColumnIfExists('floor', 'institute_id');
    await removeColumnIfExists('asset_categories', 'university_id');
    await removeColumnIfExists('asset', 'university_id');
    await removeColumnIfExists('asset_inventory_item', 'university_id');
    await removeColumnIfExists('asset_issue_transaction', 'university_id');
    await removeColumnIfExists('asset_issue_inventory_item', 'university_id');
    await removeColumnIfExists('asset_issue_inventory_item', 'institute_id');
    await removeColumnIfExists('asset_return_transaction', 'university_id');
    await removeColumnIfExists('asset_return_transaction', 'institute_id');
    await removeColumnIfExists('add_dormitory', 'university_id');
    await removeColumnIfExists('add_dormitory', 'institute_id');
    await removeColumnIfExists('transport_vehicle', 'university_id');
    await removeColumnIfExists('assign_vehicle', 'university_id');
    await removeColumnIfExists('assign_vehicle', 'institute_id');
  }
};
