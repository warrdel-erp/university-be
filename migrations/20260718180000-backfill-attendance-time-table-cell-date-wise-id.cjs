'use strict';

/**
 * attendance — single cutover migration (schema + data):
 * 1. Add time_table_cell_date_wise_id (nullable, FK → date-wise)
 * 2. Rename time_table_mapping_id → time_table_cell_id
 * 3. Backfill date-wise id from cell + date
 * 4. Normalize time_table_cell_id onto week-cell PKs (Primary / lowest)
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
    if (!(await tableExists(queryInterface, 'attendance'))) {
      return;
    }
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      throw new Error('time_table_cell_date_wise missing — run create + date-wise backfill first');
    }

    // 1) Add date-wise period key
    {
      const table = await queryInterface.describeTable('attendance');
      if (!table.time_table_cell_date_wise_id) {
        await queryInterface.addColumn('attendance', 'time_table_cell_date_wise_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'time_table_cell_date_wise',
            key: 'time_table_cell_date_wise_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        });

        await queryInterface.addIndex('attendance', ['time_table_cell_date_wise_id'], {
          name: 'idx_attendance_time_table_cell_date_wise_id',
        });
      }
    }

    // 2) Rename dual-write column (legacy mapping id → week-cell id)
    {
      const table = await queryInterface.describeTable('attendance');
      if (table.time_table_mapping_id && !table.time_table_cell_id) {
        const mappingFks = await findForeignKeysOnColumn(
          queryInterface,
          'attendance',
          'time_table_mapping_id',
        );
        for (const fk of mappingFks) {
          await queryInterface.sequelize.query(
            `ALTER TABLE attendance DROP FOREIGN KEY \`${fk.constraintName}\``,
          );
        }
        await queryInterface.sequelize.query(
          'ALTER TABLE attendance CHANGE COLUMN `time_table_mapping_id` `time_table_cell_id` INTEGER NOT NULL',
        );
      }
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 3) Direct match: attendance cell id already equals week cell PK
      await queryInterface.sequelize.query(
        `
        UPDATE attendance a
        INNER JOIN time_table_cell_date_wise dw
          ON dw.time_table_cell_id = a.time_table_cell_id
          AND dw.date = DATE(a.date)
          AND dw.deleted_at IS NULL
        SET a.time_table_cell_date_wise_id = dw.time_table_cell_date_wise_id
        WHERE a.time_table_cell_date_wise_id IS NULL
          AND a.deleted_at IS NULL
          AND a.date IS NOT NULL
        `,
        { transaction },
      );

      // 4) Secondary / non-canonical class_schedule mapping → cell PK → date-wise
      if (await tableExists(queryInterface, 'class_schedule_item')) {
        await queryInterface.sequelize.query(
          `
          UPDATE attendance a
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
          ) map ON map.old_mapping_id = a.time_table_cell_id
          INNER JOIN time_table_cell_date_wise dw
            ON dw.time_table_cell_id = map.cell_id
            AND dw.date = DATE(a.date)
            AND dw.deleted_at IS NULL
          SET
            a.time_table_cell_date_wise_id = dw.time_table_cell_date_wise_id,
            a.time_table_cell_id = map.cell_id
          WHERE a.time_table_cell_date_wise_id IS NULL
            AND a.deleted_at IS NULL
            AND a.date IS NOT NULL
          `,
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // 5) Retarget FK to time_table_cell (DDL — outside transaction)
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      return;
    }

    const fks = await findForeignKeysOnColumn(
      queryInterface,
      'attendance',
      'time_table_cell_id',
    );

    for (const fk of fks) {
      await queryInterface.sequelize.query(
        `ALTER TABLE attendance DROP FOREIGN KEY \`${fk.constraintName}\``,
      );
    }

    const stillPointing = await findForeignKeysOnColumn(
      queryInterface,
      'attendance',
      'time_table_cell_id',
    );
    if (stillPointing.length === 0) {
      const [[orphan]] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS cnt
        FROM attendance a
        LEFT JOIN time_table_cell c
          ON c.time_table_cell_id = a.time_table_cell_id
        WHERE a.deleted_at IS NULL
          AND c.time_table_cell_id IS NULL
        `,
      );
      if (Number(orphan.cnt) === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE attendance
          ADD CONSTRAINT fk_attendance_time_table_cell_id
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
    if (!(await tableExists(queryInterface, 'attendance'))) {
      return;
    }

    const [rows] = await queryInterface.sequelize.query(
      `
      SELECT CONSTRAINT_NAME AS constraintName
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance'
        AND CONSTRAINT_NAME = 'fk_attendance_time_table_cell_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `,
    );

    for (const row of rows) {
      await queryInterface.sequelize.query(
        `ALTER TABLE attendance DROP FOREIGN KEY \`${row.constraintName}\``,
      );
    }

    const table = await queryInterface.describeTable('attendance');
    if (table.time_table_cell_date_wise_id) {
      await queryInterface.removeIndex(
        'attendance',
        'idx_attendance_time_table_cell_date_wise_id',
      );
      await queryInterface.removeColumn('attendance', 'time_table_cell_date_wise_id');
    }
  },
};
