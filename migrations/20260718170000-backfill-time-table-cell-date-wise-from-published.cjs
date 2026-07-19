'use strict';

/**
 * Fill time_table_cell_date_wise + time_table_cell_teachers_date_wise
 * from published routines' week cells (same expansion rules as publish API).
 *
 * Prerequisites:
 *   - 20260718140000 create tables
 *   - 20260718160000 backfill time_table_cell + time_table_cell_teachers
 *
 * For each published routine with starting_date / ending_date:
 *   1. Walk each calendar date in [start, end]
 *   2. Skip structure week_off weekdays
 *   3. For each week cell whose day matches that weekday, insert one date-wise row
 *   4. Copy week teachers onto each date-wise row
 *
 * Idempotent: unique (time_table_cell_id, date) + INSERT IGNORE; teachers use NOT EXISTS.
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

function resolveActorId(routine, cells) {
  const fromRoutine = Number(routine.updatedBy || routine.createdBy);
  if (Number.isFinite(fromRoutine) && fromRoutine > 0) {
    return fromRoutine;
  }
  for (const cell of cells) {
    const fromCell = Number(cell.createdBy || cell.updatedBy);
    if (Number.isFinite(fromCell) && fromCell > 0) {
      return fromCell;
    }
  }
  return null;
}

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((t) => {
    const name = typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0];
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
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
    const routineId = Number(routine.timeTableRoutineId);

    const [cells] = await queryInterface.sequelize.query(
      `
      SELECT
        c.time_table_cell_id AS timeTableCellId,
        c.day AS day,
        c.class_room_section_id AS classRoomSectionId,
        c.created_by AS createdBy,
        c.updated_by AS updatedBy
      FROM time_table_cell c
      WHERE c.time_table_routine_id = :routineId
        AND c.deleted_at IS NULL
      `,
      {
        transaction,
        replacements: { routineId },
      },
    );

    if (!cells.length) {
      continue;
    }

    const actorId = resolveActorId(routine, cells);
    if (actorId == null) {
      throw new Error(
        `Cannot backfill date-wise for routine ${routineId}: missing created_by/updated_by`,
      );
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
      if (!slice.length) {
        continue;
      }

      const values = [];
      const replacements = {};

      for (let i = 0; i < slice.length; i += 1) {
        const item = slice[i];
        values.push(
          `(:cellId${i}, :date${i}, :roomId${i}, :createdBy${i}, :updatedBy${i})`,
        );
        replacements[`cellId${i}`] = Number(item.cell.timeTableCellId);
        replacements[`date${i}`] = item.date;
        replacements[`roomId${i}`] = item.cell.classRoomSectionId;
        replacements[`createdBy${i}`] = actorId;
        replacements[`updatedBy${i}`] = actorId;
      }

      await queryInterface.sequelize.query(
        `
        INSERT IGNORE INTO time_table_cell_date_wise (
          time_table_cell_id,
          date,
          class_room_section_id,
          created_by,
          updated_by
        ) VALUES ${values.join(', ')}
        `,
        { transaction, replacements },
      );
    }

    // Copy week teachers onto every date-wise row for this routine (idempotent)
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
        COALESCE(tw.created_by, :actorId),
        COALESCE(tw.updated_by, :actorId)
      FROM time_table_cell_date_wise dw
      INNER JOIN time_table_cell c
        ON c.time_table_cell_id = dw.time_table_cell_id
        AND c.deleted_at IS NULL
      INNER JOIN time_table_cell_teachers tw
        ON tw.time_table_cell_id = c.time_table_cell_id
        AND tw.deleted_at IS NULL
      WHERE c.time_table_routine_id = :routineId
        AND dw.deleted_at IS NULL
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
        replacements: { routineId, actorId },
      },
    );
  }
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      throw new Error('time_table_cell missing — run 20260718140000 / 20260718160000 first');
    }
    if (!(await tableExists(queryInterface, 'time_table_cell_teachers'))) {
      throw new Error('time_table_cell_teachers missing — run 20260718160000 first');
    }
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      throw new Error('time_table_cell_date_wise missing — run 20260718140000 first');
    }
    if (!(await tableExists(queryInterface, 'time_table_cell_teachers_date_wise'))) {
      throw new Error('time_table_cell_teachers_date_wise missing — run 20260718140000 first');
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await backfillDateWiseForPublished(queryInterface, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Remove date-wise rows that belong to published routines' week cells
      await queryInterface.sequelize.query(
        `
        DELETE dwt
        FROM time_table_cell_teachers_date_wise dwt
        INNER JOIN time_table_cell_date_wise dw
          ON dw.time_table_cell_date_wise_id = dwt.time_table_cell_date_wise_id
        INNER JOIN time_table_cell c
          ON c.time_table_cell_id = dw.time_table_cell_id
        INNER JOIN time_table_routine r
          ON r.time_table_routine_id = c.time_table_routine_id
        WHERE r.is_publish = 1
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        DELETE dw
        FROM time_table_cell_date_wise dw
        INNER JOIN time_table_cell c
          ON c.time_table_cell_id = dw.time_table_cell_id
        INNER JOIN time_table_routine r
          ON r.time_table_routine_id = c.time_table_routine_id
        WHERE r.is_publish = 1
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  backfillDateWiseForPublished,
};
