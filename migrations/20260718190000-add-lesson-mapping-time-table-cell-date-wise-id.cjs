'use strict';

/**
 * lesson_mapping — single cutover migration (schema + data):
 * 1. Rename time_table_mapping_id → time_table_cell_id
 * 2. Add time_table_cell_date_wise_id
 * 3. Backfill from cell + date
 * 4. Normalize time_table_cell_id onto week-cell PKs
 * 5. Point time_table_cell_id FK at time_table_cell
 *
 * Prerequisites:
 *   20260718140000…143000 — cell tables
 *   20260718160000 — week cell backfill
 *   20260718170000 — date-wise backfill
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
    {
      replacements: { tableName, columnName },
    },
  );
  return rows;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'lesson_mapping'))) {
      return;
    }
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      throw new Error('time_table_cell_date_wise missing — run date-wise backfill first');
    }

    // 1) Rename dual-write column (legacy mapping id → week-cell id)
    {
      const table = await queryInterface.describeTable('lesson_mapping');
      if (table.time_table_mapping_id && !table.time_table_cell_id) {
        const mappingFks = await findForeignKeysOnColumn(
          queryInterface,
          'lesson_mapping',
          'time_table_mapping_id',
        );
        for (const fk of mappingFks) {
          await queryInterface.sequelize.query(
            `ALTER TABLE lesson_mapping DROP FOREIGN KEY \`${fk.constraintName}\``,
          );
        }
        await queryInterface.sequelize.query(
          'ALTER TABLE lesson_mapping CHANGE COLUMN `time_table_mapping_id` `time_table_cell_id` INTEGER NOT NULL',
        );
      }
    }

    const table = await queryInterface.describeTable('lesson_mapping');

    if (!table.time_table_cell_date_wise_id) {
      await queryInterface.addColumn('lesson_mapping', 'time_table_cell_date_wise_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'time_table_cell_date_wise',
          key: 'time_table_cell_date_wise_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });

      await queryInterface.addIndex('lesson_mapping', ['time_table_cell_date_wise_id'], {
        name: 'idx_lesson_mapping_time_table_cell_date_wise_id',
      });
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `
        UPDATE lesson_mapping lm
        INNER JOIN time_table_cell_date_wise dw
          ON dw.time_table_cell_id = lm.time_table_cell_id
          AND dw.date = DATE(lm.date)
          AND dw.deleted_at IS NULL
        SET lm.time_table_cell_date_wise_id = dw.time_table_cell_date_wise_id
        WHERE lm.time_table_cell_date_wise_id IS NULL
          AND lm.deleted_at IS NULL
          AND lm.date IS NOT NULL
        `,
        { transaction },
      );

      if (await tableExists(queryInterface, 'class_schedule_item')) {
        await queryInterface.sequelize.query(
          `
          UPDATE lesson_mapping lm
          INNER JOIN (
            SELECT
              csi.time_table_mapping_id AS old_mapping_id,
              FIRST_VALUE(csi.time_table_mapping_id) OVER (
                PARTITION BY
                  csi.time_table_routine_id,
                  csi.time_table_creation_id,
                  csi.day,
                  csi.period,
                  COALESCE(csi.subject_id, 0),
                  COALESCE(csi.elective_subject_id, 0),
                  COALESCE(csi.class_room_section_id, 0),
                  COALESCE(csi.combined_group_id, '')
                ORDER BY
                  CASE WHEN csi.teacher_type = 'Primary' THEN 0 ELSE 1 END,
                  csi.time_table_mapping_id
              ) AS cell_id
            FROM class_schedule_item csi
            WHERE csi.deleted_at IS NULL
          ) map ON map.old_mapping_id = lm.time_table_cell_id
          INNER JOIN time_table_cell_date_wise dw
            ON dw.time_table_cell_id = map.cell_id
            AND dw.date = DATE(lm.date)
            AND dw.deleted_at IS NULL
          SET
            lm.time_table_cell_date_wise_id = dw.time_table_cell_date_wise_id,
            lm.time_table_cell_id = map.cell_id
          WHERE lm.time_table_cell_date_wise_id IS NULL
            AND lm.deleted_at IS NULL
            AND lm.date IS NOT NULL
          `,
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      return;
    }

    const fks = await findForeignKeysOnColumn(
      queryInterface,
      'lesson_mapping',
      'time_table_cell_id',
    );

    for (const fk of fks) {
      await queryInterface.sequelize.query(
        `ALTER TABLE lesson_mapping DROP FOREIGN KEY \`${fk.constraintName}\``,
      );
    }

    const stillPointing = await findForeignKeysOnColumn(
      queryInterface,
      'lesson_mapping',
      'time_table_cell_id',
    );
    if (stillPointing.length === 0) {
      const [[orphan]] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS cnt
        FROM lesson_mapping lm
        LEFT JOIN time_table_cell c
          ON c.time_table_cell_id = lm.time_table_cell_id
        WHERE lm.deleted_at IS NULL
          AND c.time_table_cell_id IS NULL
        `,
      );
      if (Number(orphan.cnt) === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE lesson_mapping
          ADD CONSTRAINT fk_lesson_mapping_time_table_cell_id
          FOREIGN KEY (time_table_cell_id)
          REFERENCES time_table_cell (time_table_cell_id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
          `,
        );
      }
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'lesson_mapping'))) {
      return;
    }

    const [rows] = await queryInterface.sequelize.query(
      `
      SELECT CONSTRAINT_NAME AS constraintName
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'lesson_mapping'
        AND CONSTRAINT_NAME = 'fk_lesson_mapping_time_table_cell_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `,
    );

    for (const row of rows) {
      await queryInterface.sequelize.query(
        `ALTER TABLE lesson_mapping DROP FOREIGN KEY \`${row.constraintName}\``,
      );
    }

    const table = await queryInterface.describeTable('lesson_mapping');
    if (table.time_table_cell_date_wise_id) {
      await queryInterface.removeIndex(
        'lesson_mapping',
        'idx_lesson_mapping_time_table_cell_date_wise_id',
      );
      await queryInterface.removeColumn('lesson_mapping', 'time_table_cell_date_wise_id');
    }
  },
};
