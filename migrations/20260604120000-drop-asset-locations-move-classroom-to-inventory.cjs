'use strict';

async function tableExists(queryInterface, tableName, transaction) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], transaction }
  );
  return tables.length > 0;
}

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const [columns] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction }
  );
  return columns.length > 0;
}

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName], transaction }
  );

  for (const { CONSTRAINT_NAME } of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }
}

async function dropTableIfExists(queryInterface, tableName, transaction) {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    { replacements: [tableName], transaction }
  );

  for (const { CONSTRAINT_NAME } of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }

  const [incoming] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = ?`,
    { replacements: [tableName], transaction }
  );

  for (const { TABLE_NAME, CONSTRAINT_NAME } of incoming) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE_NAME}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }

  await queryInterface.dropTable(tableName, { transaction });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!(await tableExists(queryInterface, 'asset_inventory_item', transaction))) {
        await transaction.commit();
        return;
      }

      if (!(await columnExists(queryInterface, 'asset_inventory_item', 'class_room_section_id', transaction))) {
        await queryInterface.addColumn(
          'asset_inventory_item',
          'class_room_section_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'class_room_section', key: 'class_room_section_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
      }

      if (
        (await columnExists(queryInterface, 'asset_inventory_item', 'location_id', transaction)) &&
        (await tableExists(queryInterface, 'asset_locations', transaction))
      ) {
        await queryInterface.sequelize.query(
          `UPDATE asset_inventory_item ai
           INNER JOIN asset_locations al ON ai.location_id = al.asset_location_id
           SET ai.class_room_section_id = al.class_room_section_id
           WHERE ai.location_id IS NOT NULL`,
          { transaction }
        );
      }

      if (await columnExists(queryInterface, 'asset_inventory_item', 'location_id', transaction)) {
        await dropForeignKeysOnColumn(queryInterface, 'asset_inventory_item', 'location_id', transaction);
        await queryInterface.removeColumn('asset_inventory_item', 'location_id', { transaction });
      }

      await dropTableIfExists(queryInterface, 'asset_locations', transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {},
};
