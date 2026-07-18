'use strict';

/**
 * Backfill week cells + teachers from class_schedule_item, then expand
 * published routines into date-wise instances (same rules as publish API).
 *
 * Idempotent: safe to re-run (skips existing cells / teachers / date rows).
 *
 * Grouping key for one cell:
 *   routine + creation + day + period + subject + elective + room + combined_group
 * Canonical mapping id = Primary (else lowest mapping id).
 * All user_id rows in the group become time_table_cell_teachers.
 */

const WEEKDAY_BY_JS_INDEX = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function toDateOnlyString(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseWeekOff(raw) {
  let list = raw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof list !== 'string') break;
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const day of list) {
    out.push(String(day).toLowerCase());
  }
  return out;
}

function weekdayNameFromDateOnly(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return WEEKDAY_BY_JS_INDEX[date.getDay()];
}

function eachDateInRange(startStr, endStr) {
  const dates = [];
  let current = startStr;
  while (current <= endStr) {
    dates.push(current);
    const next = new Date(`${current}T12:00:00`);
    next.setDate(next.getDate() + 1);
    current = toDateOnlyString(next);
  }
  return dates;
}

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

async function backfillDateWiseForPublished(queryInterface, transaction) {
  const [routines] = await queryInterface.sequelize.query(
    `
    SELECT
      r.time_table_routine_id AS timeTableRoutineId,
      r.starting_date AS startingDate,
      r.ending_date AS endingDate,
      r.created_by AS createdBy,
      r.updated_by AS updatedBy,
      s.week_off AS weekOff
    FROM time_table_routine r
    INNER JOIN time_table_structure_course m
      ON m.timetable_structure_course_mapper_id = r.timetable_structure_course_mapper_id
    INNER JOIN time_table_structure s
      ON s.time_table_name_id = m.time_table_name_id
    WHERE r.is_publish = 1
      AND r.starting_date IS NOT NULL
      AND r.ending_date IS NOT NULL
    `,
    { transaction },
  );

  for (const routine of routines) {
    const start = toDateOnlyString(routine.startingDate);
    const end = toDateOnlyString(routine.endingDate);
    if (!start || !end || start > end) {
      continue;
    }

    const weekOff = parseWeekOff(routine.weekOff);
    const actorId = Number(routine.updatedBy || routine.createdBy);

    const [cells] = await queryInterface.sequelize.query(
      `
      SELECT
        c.time_table_mapping_id AS timeTableMappingId,
        c.day AS day,
        c.class_room_section_id AS classRoomSectionId
      FROM time_table_cell c
      WHERE c.time_table_routine_id = :routineId
        AND c.deleted_at IS NULL
      `,
      {
        transaction,
        replacements: { routineId: Number(routine.timeTableRoutineId) },
      },
    );

    if (!cells.length) {
      continue;
    }

    const cellsByDay = new Map();
    for (const cell of cells) {
      const dayKey = String(cell.day).toLowerCase();
      if (!cellsByDay.has(dayKey)) {
        cellsByDay.set(dayKey, []);
      }
      cellsByDay.get(dayKey).push(cell);
    }

    const planned = [];
    for (const dateStr of eachDateInRange(start, end)) {
      const weekday = weekdayNameFromDateOnly(dateStr).toLowerCase();
      if (weekOff.includes(weekday)) {
        continue;
      }
      const dayCells = cellsByDay.get(weekday);
      if (!dayCells) {
        continue;
      }
      for (const cell of dayCells) {
        planned.push({ cell, date: dateStr });
      }
    }

    const BATCH = 500;
    for (let offset = 0; offset < planned.length; offset += BATCH) {
      const slice = planned.slice(offset, offset + BATCH);
      const values = [];
      const replacements = {};

      for (let i = 0; i < slice.length; i += 1) {
        const item = slice[i];
        values.push(
          `(:mappingId${i}, :date${i}, :roomId${i}, :createdBy${i}, :updatedBy${i})`,
        );
        replacements[`mappingId${i}`] = Number(item.cell.timeTableMappingId);
        replacements[`date${i}`] = item.date;
        replacements[`roomId${i}`] = item.cell.classRoomSectionId;
        replacements[`createdBy${i}`] = actorId;
        replacements[`updatedBy${i}`] = actorId;
      }

      await queryInterface.sequelize.query(
        `
        INSERT IGNORE INTO time_table_cell_date_wise (
          time_table_mapping_id,
          date,
          class_room_section_id,
          created_by,
          updated_by
        ) VALUES ${values.join(', ')}
        `,
        { transaction, replacements },
      );
    }

    // Attach teachers for date-wise rows that still have none
    await queryInterface.sequelize.query(
      `
      INSERT INTO time_table_cell_teachers_date_wise (
        time_table_cell_date_wise_id,
        user_id,
        teacher_type,
        \`is_Attendence\`,
        created_by,
        updated_by
      )
      SELECT
        dw.time_table_cell_date_wise_id,
        tw.user_id,
        tw.teacher_type,
        tw.\`is_Attendence\`,
        :actorId,
        :actorId
      FROM time_table_cell_date_wise dw
      INNER JOIN time_table_cell c
        ON c.time_table_mapping_id = dw.time_table_mapping_id
      INNER JOIN time_table_cell_teachers tw
        ON tw.time_table_mapping_id = c.time_table_mapping_id
        AND tw.deleted_at IS NULL
      WHERE c.time_table_routine_id = :routineId
        AND dw.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM time_table_cell_teachers_date_wise existing
          WHERE existing.time_table_cell_date_wise_id = dw.time_table_cell_date_wise_id
            AND existing.user_id = tw.user_id
            AND existing.deleted_at IS NULL
        )
      `,
      {
        transaction,
        replacements: {
          routineId: Number(routine.timeTableRoutineId),
          actorId,
        },
      },
    );
  }
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
      await backfillDateWiseForPublished(queryInterface, transaction);
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
        DELETE dwt FROM time_table_cell_teachers_date_wise dwt
        INNER JOIN time_table_cell_date_wise dw
          ON dw.time_table_cell_date_wise_id = dwt.time_table_cell_date_wise_id
        INNER JOIN (
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
        ) src ON src.cell_id = dw.time_table_mapping_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        DELETE dw FROM time_table_cell_date_wise dw
        INNER JOIN (
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
        ) src ON src.cell_id = dw.time_table_mapping_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        DELETE tw FROM time_table_cell_teachers tw
        INNER JOIN (
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
        ) src ON src.cell_id = tw.time_table_mapping_id
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        DELETE c FROM time_table_cell c
        INNER JOIN (
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
  backfillDateWiseForPublished,
  syncCellAutoIncrement,
};
