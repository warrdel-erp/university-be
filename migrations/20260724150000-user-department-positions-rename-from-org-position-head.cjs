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

async function dropFksOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS constraintName
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName], transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function constraintExists(queryInterface, tableName, constraintName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    { replacements: [tableName, constraintName], transaction },
  );
  return constraints.length > 0;
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
      const sourceTables = ['org_position_head', 'user_department_positions'];

      for (const tableName of sourceTables) {
        if (!(await tableExists(queryInterface, tableName, transaction))) {
          continue;
        }
        if (await columnExists(queryInterface, tableName, 'org_position_id', transaction)) {
          await dropFksOnColumn(queryInterface, tableName, 'org_position_id', transaction);
        }
      }

      if (
        (await tableExists(queryInterface, 'org_position_head', transaction)) &&
        !(await tableExists(queryInterface, 'user_department_positions', transaction))
      ) {
        await queryInterface.renameTable('org_position_head', 'user_department_positions', { transaction });
      }

      if (await tableExists(queryInterface, 'user_department_positions', transaction)) {
        if (await columnExists(queryInterface, 'user_department_positions', 'org_position_head_id', transaction)) {
          await queryInterface.renameColumn(
            'user_department_positions',
            'org_position_head_id',
            'user_department_position_id',
            { transaction },
          );
        }

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

        if (await columnExists(queryInterface, 'user_department_positions', 'org_position_id', transaction)) {
          await queryInterface.renameColumn(
            'user_department_positions',
            'org_position_id',
            'department_position_id',
            { transaction },
          );
        }

        if (
          (await tableExists(queryInterface, 'department_positions', transaction)) &&
          (await columnExists(queryInterface, 'user_department_positions', 'department_position_id', transaction)) &&
          !(await constraintExists(
            queryInterface,
            'user_department_positions',
            'fk_user_department_positions_department_position_id',
            transaction,
          ))
        ) {
          await queryInterface.addConstraint('user_department_positions', {
            fields: ['department_position_id'],
            type: 'foreign key',
            name: 'fk_user_department_positions_department_position_id',
            references: {
              table: 'department_positions',
              field: 'department_position_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
            transaction,
          });
        }
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
        if (
          await constraintExists(
            queryInterface,
            'user_department_positions',
            'fk_user_department_positions_department_position_id',
            transaction,
          )
        ) {
          await queryInterface.removeConstraint(
            'user_department_positions',
            'fk_user_department_positions_department_position_id',
            { transaction },
          );
        }

        if (await columnExists(queryInterface, 'user_department_positions', 'department_position_id', transaction)) {
          await queryInterface.renameColumn(
            'user_department_positions',
            'department_position_id',
            'org_position_id',
            { transaction },
          );
        }

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

        if (await columnExists(queryInterface, 'user_department_positions', 'user_department_position_id', transaction)) {
          await queryInterface.renameColumn(
            'user_department_positions',
            'user_department_position_id',
            'org_position_head_id',
            { transaction },
          );
        }
      }

      if (
        (await tableExists(queryInterface, 'user_department_positions', transaction)) &&
        !(await tableExists(queryInterface, 'org_position_head', transaction))
      ) {
        await queryInterface.renameTable('user_department_positions', 'org_position_head', { transaction });
      }

      if (
        (await tableExists(queryInterface, 'org_position_head', transaction)) &&
        (await tableExists(queryInterface, 'org_position', transaction)) &&
        (await columnExists(queryInterface, 'org_position_head', 'org_position_id', transaction)) &&
        !(await constraintExists(queryInterface, 'org_position_head', 'fk_user_department_positions_org_position_id', transaction))
      ) {
        await queryInterface.addConstraint('org_position_head', {
          fields: ['org_position_id'],
          type: 'foreign key',
          name: 'fk_user_department_positions_org_position_id',
          references: {
            table: 'org_position',
            field: 'org_position_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
