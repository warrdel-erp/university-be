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

async function columnHasAutoIncrement(queryInterface, tableName, columnName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT EXTRA
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction },
  );
  if (!rows.length) {
    return false;
  }
  return String(rows[0].EXTRA).toLowerCase().includes('auto_increment');
}

async function dropFksReferencingColumn(queryInterface, referencedTable, referencedColumn, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = ?
       AND REFERENCED_COLUMN_NAME = ?`,
    { replacements: [referencedTable, referencedColumn], transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${row.tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function addUserDepartmentPositionFk(queryInterface, transaction) {
  if (!(await tableExists(queryInterface, 'user_department_positions', transaction))) {
    return;
  }
  if (!(await columnExists(queryInterface, 'user_department_positions', 'department_position_id', transaction))) {
    return;
  }

  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'user_department_positions'
       AND CONSTRAINT_NAME = 'fk_user_department_positions_department_position_id'`,
    { transaction },
  );
  if (constraints.length > 0) {
    return;
  }

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

async function ensurePrimaryKeyAutoIncrement(queryInterface, tableName, columnName, transaction) {
  if (!(await columnExists(queryInterface, tableName, columnName, transaction))) {
    return;
  }
  if (await columnHasAutoIncrement(queryInterface, tableName, columnName, transaction)) {
    return;
  }

  const [rows] = await queryInterface.sequelize.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction },
  );
  if (!rows.length) {
    return;
  }

  const row = rows[0];
  let definition = row.COLUMN_TYPE;
  if (row.IS_NULLABLE === 'NO') {
    definition += ' NOT NULL';
  }
  definition += ' AUTO_INCREMENT';

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` ${definition}`,
    { transaction },
  );

  const [maxRows] = await queryInterface.sequelize.query(
    `SELECT COALESCE(MAX(\`${columnName}\`), 0) AS maxId FROM \`${tableName}\``,
    { transaction },
  );
  const nextId = Number(maxRows[0].maxId) + 1;
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${nextId}`,
    { transaction },
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (await tableExists(queryInterface, 'department_positions', transaction)) {
        await dropFksReferencingColumn(
          queryInterface,
          'department_positions',
          'department_position_id',
          transaction,
        );

        await ensurePrimaryKeyAutoIncrement(
          queryInterface,
          'department_positions',
          'department_position_id',
          transaction,
        );

        await addUserDepartmentPositionFk(queryInterface, transaction);
      }

      if (await tableExists(queryInterface, 'user_department_positions', transaction)) {
        await ensurePrimaryKeyAutoIncrement(
          queryInterface,
          'user_department_positions',
          'user_department_position_id',
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
    // Restoring non-auto-increment PKs would break inserts; no down.
  },
};
