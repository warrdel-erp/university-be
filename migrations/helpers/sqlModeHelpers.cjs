'use strict';

/** Relax NO_ZERO_DATE for ALTER TABLE on legacy tables with invalid deleted_at defaults. */
async function withRelaxedSqlMode(sequelize, fn) {
  await sequelize.query('SET @OLD_SQL_MODE = @@SESSION.sql_mode;');
  await sequelize.query(
    "SET SESSION sql_mode = REPLACE(REPLACE(@@SESSION.sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', '');",
  );
  try {
    await fn();
  } finally {
    await sequelize.query('SET SESSION sql_mode = @OLD_SQL_MODE;');
  }
}

async function dropForeignKey(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columnName }, transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function removeColumnSafe(queryInterface, tableName, columnName, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  if (!table[columnName]) {
    return;
  }

  await withRelaxedSqlMode(queryInterface.sequelize, async () => {
    await dropForeignKey(queryInterface, tableName, columnName, transaction);
    await queryInterface.removeColumn(tableName, columnName, { transaction });
  });
}

async function normalizeParanoidDeletedAt(queryInterface, tableName, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  if (!table.deleted_at) {
    return;
  }

  await withRelaxedSqlMode(queryInterface.sequelize, async () => {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`deleted_at\` TIMESTAMP NULL DEFAULT NULL`,
      { transaction },
    );
  });
}

async function addColumnSafe(queryInterface, tableName, columnName, attributes, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  if (table[columnName]) {
    return;
  }

  await withRelaxedSqlMode(queryInterface.sequelize, async () => {
    await queryInterface.addColumn(tableName, columnName, attributes, { transaction });
  });
}

module.exports = {
  withRelaxedSqlMode,
  dropForeignKey,
  removeColumnSafe,
  addColumnSafe,
  normalizeParanoidDeletedAt,
};
