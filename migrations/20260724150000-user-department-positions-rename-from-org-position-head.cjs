'use strict';

async function tableExists(queryInterface, tableName, transaction) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], transaction },
  );
  return tables.length > 0;
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
        (await tableExists(queryInterface, 'org_position_head', transaction)) &&
        !(await tableExists(queryInterface, 'user_department_positions', transaction))
      ) {
        await queryInterface.renameTable('org_position_head', 'user_department_positions', { transaction });
      }

      if (await tableExists(queryInterface, 'user_department_positions', transaction)) {
        await renameIndexIfNeeded(
          queryInterface,
          'user_department_positions',
          'idx_org_position_head_position_user',
          'idx_user_department_positions_position_user',
          transaction,
        );
        await renameIndexIfNeeded(
          queryInterface,
          'user_department_positions',
          'idx_org_position_head_tenant',
          'idx_user_department_positions_tenant',
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
      if (await tableExists(queryInterface, 'user_department_positions', transaction)) {
        await renameIndexIfNeeded(
          queryInterface,
          'user_department_positions',
          'idx_user_department_positions_position_user',
          'idx_org_position_head_position_user',
          transaction,
        );
        await renameIndexIfNeeded(
          queryInterface,
          'user_department_positions',
          'idx_user_department_positions_tenant',
          'idx_org_position_head_tenant',
          transaction,
        );
      }

      if (
        (await tableExists(queryInterface, 'user_department_positions', transaction)) &&
        !(await tableExists(queryInterface, 'org_position_head', transaction))
      ) {
        await queryInterface.renameTable('user_department_positions', 'org_position_head', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
