'use strict';

/**
 * Bridge for DBs that already ran 20260718140000 / 160000 with the old PK name
 * `time_table_mapping_id` on week-cell tables.
 *
 * Renames:
 *   time_table_cell.time_table_mapping_id           → time_table_cell_id
 *   time_table_cell_teachers.time_table_mapping_id   → time_table_cell_id
 *   time_table_cell_date_wise.time_table_mapping_id  → time_table_cell_id
 *
 * Fresh installs that already created columns as time_table_cell_id: no-op.
 * Must run before 20260718170000 date-wise backfill.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((t) => {
    const name = typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0];
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
}

async function findForeignKeysOnColumn(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columnName } },
  );
  return rows;
}

async function findForeignKeysReferencing(
  queryInterface,
  referencedTable,
  referencedColumn,
) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT
      TABLE_NAME AS tableName,
      CONSTRAINT_NAME AS constraintName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME = :referencedTable
      AND REFERENCED_COLUMN_NAME = :referencedColumn
    `,
    { replacements: { referencedTable, referencedColumn } },
  );
  return rows;
}

async function dropForeignKeys(queryInterface, tableName, columnName) {
  const fks = await findForeignKeysOnColumn(queryInterface, tableName, columnName);
  for (const fk of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``,
    );
  }
}

async function renameColumnIfNeeded(queryInterface, tableName, fromCol, toCol, ddlType) {
  const table = await queryInterface.describeTable(tableName);
  if (table[fromCol] && !table[toCol]) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${fromCol}\` \`${toCol}\` ${ddlType}`,
    );
  }
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      return;
    }

    const cellTable = await queryInterface.describeTable('time_table_cell');
    if (!cellTable.time_table_mapping_id || cellTable.time_table_cell_id) {
      // Already on new name (fresh create migration) or nothing to do
      return;
    }

    // Drop every FK that points at the old PK name
    const referencing = await findForeignKeysReferencing(
      queryInterface,
      'time_table_cell',
      'time_table_mapping_id',
    );
    for (const fk of referencing) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${fk.tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``,
      );
    }

    await dropForeignKeys(queryInterface, 'time_table_cell_teachers', 'time_table_mapping_id');
    await dropForeignKeys(queryInterface, 'time_table_cell_date_wise', 'time_table_mapping_id');

    await renameColumnIfNeeded(
      queryInterface,
      'time_table_cell',
      'time_table_mapping_id',
      'time_table_cell_id',
      'INTEGER NOT NULL AUTO_INCREMENT',
    );

    if (await tableExists(queryInterface, 'time_table_cell_teachers')) {
      await renameColumnIfNeeded(
        queryInterface,
        'time_table_cell_teachers',
        'time_table_mapping_id',
        'time_table_cell_id',
        'INTEGER NOT NULL',
      );
      await queryInterface.sequelize.query(
        `
        ALTER TABLE time_table_cell_teachers
        ADD CONSTRAINT fk_time_table_cell_teachers_cell_id
        FOREIGN KEY (time_table_cell_id)
        REFERENCES time_table_cell (time_table_cell_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
        `,
      );
    }

    if (await tableExists(queryInterface, 'time_table_cell_date_wise')) {
      await renameColumnIfNeeded(
        queryInterface,
        'time_table_cell_date_wise',
        'time_table_mapping_id',
        'time_table_cell_id',
        'INTEGER NOT NULL',
      );
      await queryInterface.sequelize.query(
        `
        ALTER TABLE time_table_cell_date_wise
        ADD CONSTRAINT fk_time_table_cell_date_wise_cell_id
        FOREIGN KEY (time_table_cell_id)
        REFERENCES time_table_cell (time_table_cell_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
        `,
      );
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      return;
    }

    const cellTable = await queryInterface.describeTable('time_table_cell');
    if (!cellTable.time_table_cell_id || cellTable.time_table_mapping_id) {
      return;
    }

    const referencing = await findForeignKeysReferencing(
      queryInterface,
      'time_table_cell',
      'time_table_cell_id',
    );
    for (const fk of referencing) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${fk.tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``,
      );
    }

    await dropForeignKeys(queryInterface, 'time_table_cell_teachers', 'time_table_cell_id');
    await dropForeignKeys(queryInterface, 'time_table_cell_date_wise', 'time_table_cell_id');

    await renameColumnIfNeeded(
      queryInterface,
      'time_table_cell',
      'time_table_cell_id',
      'time_table_mapping_id',
      'INTEGER NOT NULL AUTO_INCREMENT',
    );

    if (await tableExists(queryInterface, 'time_table_cell_teachers')) {
      await renameColumnIfNeeded(
        queryInterface,
        'time_table_cell_teachers',
        'time_table_cell_id',
        'time_table_mapping_id',
        'INTEGER NOT NULL',
      );
      await queryInterface.sequelize.query(
        `
        ALTER TABLE time_table_cell_teachers
        ADD CONSTRAINT fk_time_table_cell_teachers_mapping_id
        FOREIGN KEY (time_table_mapping_id)
        REFERENCES time_table_cell (time_table_mapping_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
        `,
      );
    }

    if (await tableExists(queryInterface, 'time_table_cell_date_wise')) {
      await renameColumnIfNeeded(
        queryInterface,
        'time_table_cell_date_wise',
        'time_table_cell_id',
        'time_table_mapping_id',
        'INTEGER NOT NULL',
      );
      await queryInterface.sequelize.query(
        `
        ALTER TABLE time_table_cell_date_wise
        ADD CONSTRAINT fk_time_table_cell_date_wise_mapping_id
        FOREIGN KEY (time_table_mapping_id)
        REFERENCES time_table_cell (time_table_mapping_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
        `,
      );
    }
  },
};
