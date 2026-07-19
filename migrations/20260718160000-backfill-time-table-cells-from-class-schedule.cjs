'use strict';

/**
 * Backfill week cells + teachers from class_schedule_item.
 *
 * Idempotent: safe to re-run (skips existing cells / teachers).
 *
 * Grouping key for one cell:
 *   routine + creation + day + period + subject + elective + room + combined_group
 * Canonical mapping id = Primary (else lowest mapping id).
 * All user_id rows in the group become time_table_cell_teachers.
 *
 * Date-wise expansion is a separate migration:
 *   20260718170000-backfill-time-table-cell-date-wise-from-published.cjs
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((t) => {
    const name = typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0];
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
}

async function backfillCellsAndTeachers(queryInterface, transaction) {
  await queryInterface.sequelize.query(
    `
    INSERT INTO time_table_cell (
      time_table_mapping_id,
      time_table_name_id,
      time_table_routine_id,
      time_table_creation_id,
      subject_id,
      elective_subject_id,
      teacher_subject_mapping_id,
      class_room_section_id,
      day,
      period,
      time_table_type,
      \`is_Attendence\`,
      is_same_teacher,
      is_overriding_sybling_electives,
      combined_group_id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      deleted_at
    )
    SELECT
      ranked.cell_id,
      ranked.time_table_name_id,
      ranked.time_table_routine_id,
      ranked.time_table_creation_id,
      ranked.subject_id,
      ranked.elective_subject_id,
      ranked.teacher_subject_mapping_id,
      ranked.class_room_section_id,
      ranked.day,
      ranked.period,
      ranked.time_table_type,
      ranked.\`is_Attendence\`,
      ranked.is_same_teacher,
      ranked.is_overriding_sybling_electives,
      ranked.combined_group_id,
      ranked.created_at,
      ranked.updated_at,
      ranked.created_by,
      ranked.updated_by,
      NULL
    FROM (
      SELECT
        csi.*,
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
    ) ranked
    WHERE ranked.time_table_mapping_id = ranked.cell_id
      AND NOT EXISTS (
        SELECT 1
        FROM time_table_cell existing
        WHERE existing.time_table_mapping_id = ranked.cell_id
      )
    `,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `
    INSERT INTO time_table_cell_teachers (
      time_table_mapping_id,
      user_id,
      teacher_type,
      \`is_Attendence\`,
      created_at,
      updated_at,
      created_by,
      updated_by,
      deleted_at
    )
    SELECT
      ranked.cell_id,
      ranked.user_id,
      ranked.teacher_type,
      ranked.\`is_Attendence\`,
      ranked.created_at,
      ranked.updated_at,
      ranked.created_by,
      ranked.updated_by,
      NULL
    FROM (
      SELECT
        csi.*,
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
        AND csi.user_id IS NOT NULL
    ) ranked
    WHERE NOT EXISTS (
      SELECT 1
      FROM time_table_cell_teachers existing
      WHERE existing.time_table_mapping_id = ranked.cell_id
        AND existing.user_id = ranked.user_id
        AND existing.deleted_at IS NULL
    )
    `,
    { transaction },
  );
}

async function syncCellAutoIncrement(queryInterface) {
  const [[row]] = await queryInterface.sequelize.query(
    `SELECT IFNULL(MAX(time_table_mapping_id), 0) + 1 AS next_ai FROM time_table_cell`,
  );
  const nextAi = Number(row.next_ai) || 1;
  await queryInterface.sequelize.query(
    `ALTER TABLE time_table_cell AUTO_INCREMENT = ${nextAi}`,
  );
}

const CELL_ID_FROM_CLASS_SCHEDULE = `
  SELECT cell_id FROM (
    SELECT
      time_table_mapping_id,
      FIRST_VALUE(time_table_mapping_id) OVER (
        PARTITION BY
          time_table_routine_id,
          time_table_creation_id,
          day,
          period,
          COALESCE(subject_id, 0),
          COALESCE(elective_subject_id, 0),
          COALESCE(class_room_section_id, 0),
          COALESCE(combined_group_id, '')
        ORDER BY
          CASE WHEN teacher_type = 'Primary' THEN 0 ELSE 1 END,
          time_table_mapping_id
      ) AS cell_id
    FROM class_schedule_item
    WHERE deleted_at IS NULL
  ) ranked
  WHERE time_table_mapping_id = cell_id
`;

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'class_schedule_item'))) {
      return;
    }
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      throw new Error('time_table_cell missing — run create-time-table-cell-tables first');
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await backfillCellsAndTeachers(queryInterface, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // DDL — outside transaction (MySQL implicit commit)
    await syncCellAutoIncrement(queryInterface);
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `
        DELETE tw FROM time_table_cell_teachers tw
        INNER JOIN (
          ${CELL_ID_FROM_CLASS_SCHEDULE}
        ) src ON src.cell_id = tw.time_table_mapping_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        DELETE c FROM time_table_cell c
        INNER JOIN (
          ${CELL_ID_FROM_CLASS_SCHEDULE}
        ) src ON src.cell_id = c.time_table_mapping_id
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  backfillCellsAndTeachers,
  syncCellAutoIncrement,
};
