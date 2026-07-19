'use strict';

/**
 * Ensure week-cell PK / dual-write columns use time_table_cell_id
 * (not legacy time_table_mapping_id), and wire FKs to time_table_cell.
 *
 * Idempotent — safe on DBs that already ran 20260718165000 / 180000 / 190000.
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

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName) {
  const fks = await findForeignKeysOnColumn(queryInterface, tableName, columnName);
  for (const fk of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``,
    );
  }
}

async function renameMappingColToCellId(queryInterface, tableName, ddlType) {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }
  const table = await queryInterface.describeTable(tableName);
  if (!table.time_table_mapping_id || table.time_table_cell_id) {
    return;
  }
  await dropForeignKeysOnColumn(queryInterface, tableName, 'time_table_mapping_id');
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`time_table_mapping_id\` \`time_table_cell_id\` ${ddlType}`,
  );
}

async function addCellFkIfMissing(queryInterface, tableName, constraintName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }
  if (!(await tableExists(queryInterface, 'time_table_cell'))) {
    return;
  }

  const table = await queryInterface.describeTable(tableName);
  if (!table.time_table_cell_id) {
    return;
  }

  const existing = await findForeignKeysOnColumn(queryInterface, tableName, 'time_table_cell_id');
  if (existing.length > 0) {
    return;
  }

  // Drop any leftover FK still pointing at class_schedule_item (legacy mapping id)
  await dropForeignKeysOnColumn(queryInterface, tableName, 'time_table_mapping_id');

  const [[orphan]] = await queryInterface.sequelize.query(
    `
    SELECT COUNT(*) AS cnt
    FROM \`${tableName}\` t
    LEFT JOIN time_table_cell c
      ON c.time_table_cell_id = t.time_table_cell_id
    WHERE c.time_table_cell_id IS NULL
    `,
  );
  if (Number(orphan.cnt) > 0) {
    return;
  }

  await queryInterface.sequelize.query(
    `
    ALTER TABLE \`${tableName}\`
    ADD CONSTRAINT \`${constraintName}\`
    FOREIGN KEY (time_table_cell_id)
    REFERENCES time_table_cell (time_table_cell_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
    `,
  );
}

module.exports = {
  async up(queryInterface) {
    // Week-cell tables (create migration / bridge may already have new names)
    await renameMappingColToCellId(
      queryInterface,
      'time_table_cell',
      'INTEGER NOT NULL AUTO_INCREMENT',
    );
    await renameMappingColToCellId(queryInterface, 'time_table_cell_teachers', 'INTEGER NOT NULL');
    await renameMappingColToCellId(queryInterface, 'time_table_cell_date_wise', 'INTEGER NOT NULL');

    // Dual-write columns on attendance / lesson_mapping
    await renameMappingColToCellId(queryInterface, 'attendance', 'INTEGER NOT NULL');
    await renameMappingColToCellId(queryInterface, 'lesson_mapping', 'INTEGER NOT NULL');

    // Ensure FKs target time_table_cell (not class_schedule_item)
    await addCellFkIfMissing(
      queryInterface,
      'attendance',
      'fk_attendance_time_table_cell_id',
    );
    await addCellFkIfMissing(
      queryInterface,
      'lesson_mapping',
      'fk_lesson_mapping_time_table_cell_id',
    );
  },

  async down() {
    // Non-reversible rename / FK ensure — no-op
  },
};
