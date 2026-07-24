'use strict';

async function tableExists(queryInterface, tableName, transaction) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], transaction },
  );
  return tables.length > 0;
}

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const [columns] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction },
  );
  return columns.length > 0;
}

async function indexExists(queryInterface, tableName, indexName, transaction) {
  const indexes = await queryInterface.showIndex(tableName, { transaction });
  return indexes.some((idx) => idx.name === indexName);
}

async function renameIndexIfNeeded(queryInterface, tableName, oldName, newName, transaction) {
  if (!(await indexExists(queryInterface, tableName, oldName, transaction))) {
    return;
  }
  if (await indexExists(queryInterface, tableName, newName, transaction)) {
    return;
  }

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` RENAME INDEX \`${oldName}\` TO \`${newName}\``,
    { transaction },
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (
        (await tableExists(queryInterface, 'org_position', transaction)) &&
        !(await tableExists(queryInterface, 'department_positions', transaction))
      ) {
        await queryInterface.renameTable('org_position', 'department_positions', { transaction });
      }

      if (await tableExists(queryInterface, 'department_positions', transaction)) {
        if (await columnExists(queryInterface, 'department_positions', 'org_position_id', transaction)) {
          await queryInterface.renameColumn(
            'department_positions',
            'org_position_id',
            'department_position_id',
            { transaction },
          );
        }

        await renameIndexIfNeeded(
          queryInterface,
          'department_positions',
          'idx_org_position_sub_account',
          'idx_department_positions_department',
          transaction,
        );
        await renameIndexIfNeeded(
          queryInterface,
          'department_positions',
          'idx_org_position_tenant',
          'idx_department_positions_tenant',
          transaction,
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (
        (await tableExists(queryInterface, 'department_positions', transaction)) &&
        !(await tableExists(queryInterface, 'org_position', transaction))
      ) {
        await renameIndexIfNeeded(
          queryInterface,
          'department_positions',
          'idx_department_positions_department',
          'idx_org_position_sub_account',
          transaction,
        );
        await renameIndexIfNeeded(
          queryInterface,
          'department_positions',
          'idx_department_positions_tenant',
          'idx_org_position_tenant',
          transaction,
        );

        if (await columnExists(queryInterface, 'department_positions', 'department_position_id', transaction)) {
          await queryInterface.renameColumn(
            'department_positions',
            'department_position_id',
            'org_position_id',
            { transaction },
          );
        }

        await queryInterface.renameTable('department_positions', 'org_position', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
