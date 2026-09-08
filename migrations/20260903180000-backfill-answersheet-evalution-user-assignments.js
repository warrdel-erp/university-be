"use strict";

/**
 * Backfill answersheet_evalution_user_assignment for answer_sheet_qr rows
 * that already have assigned_to_user but no assignment_id.
 *
 * Groups by university_id + institute_id + assigned_to_user (one batch per evaluator).
 * academic_year_id: active year for institute, else latest year for institute.
 */

const BACKFILL_NOTES = "Migrated from existing answer sheet assignment";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const transaction = await sequelize.transaction();

  try {
    const [groups] = await sequelize.query(
      `
        SELECT
          university_id,
          institute_id,
          assigned_to_user,
          MIN(updated_at) AS assigned_at
        FROM answer_sheet_qr
        WHERE assigned_to_user IS NOT NULL
          AND assignment_id IS NULL
        GROUP BY university_id, institute_id, assigned_to_user
      `,
      { transaction },
    );

    for (const group of groups) {
      const universityId = Number(group.university_id);
      const instituteId = Number(group.institute_id);
      const assignedToUserId = Number(group.assigned_to_user);

      const [activeRows] = await sequelize.query(
        `
          SELECT acedmic_year_id
          FROM acedmic_year
          WHERE university_id = :universityId
            AND institute_id = :instituteId
            AND is_active = 1
            AND deleted_at IS NULL
          ORDER BY acedmic_year_id DESC
          LIMIT 1
        `,
        {
          replacements: { universityId, instituteId },
          transaction,
        },
      );

      let academicYearId = activeRows.length > 0
        ? Number(activeRows[0].acedmic_year_id)
        : null;

      if (!academicYearId) {
        const [latestRows] = await sequelize.query(
          `
            SELECT acedmic_year_id
            FROM acedmic_year
            WHERE university_id = :universityId
              AND institute_id = :instituteId
              AND deleted_at IS NULL
            ORDER BY acedmic_year_id DESC
            LIMIT 1
          `,
          {
            replacements: { universityId, instituteId },
            transaction,
          },
        );

        academicYearId = latestRows.length > 0
          ? Number(latestRows[0].acedmic_year_id)
          : null;
      }

      if (!academicYearId) {
        throw new Error(
          `No academic year found for university=${universityId} institute=${instituteId} user=${assignedToUserId}`,
        );
      }

      const assignedAt = group.assigned_at || new Date();

      const [insertResult] = await sequelize.query(
        `
          INSERT INTO answersheet_evalution_user_assignment (
            university_id,
            institute_id,
            acedmic_year_id,
            assigned_to_user_id,
            notes,
            timestamp,
            created_by,
            updated_by,
            created_at,
            updated_at
          ) VALUES (
            :universityId,
            :instituteId,
            :academicYearId,
            :assignedToUserId,
            :notes,
            :timestamp,
            :assignedToUserId,
            :assignedToUserId,
            :timestamp,
            :timestamp
          )
        `,
        {
          replacements: {
            universityId,
            instituteId,
            academicYearId,
            assignedToUserId,
            notes: BACKFILL_NOTES,
            timestamp: assignedAt,
          },
          transaction,
        },
      );

      const assignmentId = typeof insertResult === "number" ? insertResult : Number(insertResult.insertId || insertResult);
      if (!assignmentId) {
        throw new Error(
          `Failed to create backfill assignment for university=${universityId} institute=${instituteId} user=${assignedToUserId}`,
        );
      }

      await sequelize.query(
        `
          UPDATE answer_sheet_qr
          SET assignment_id = :assignmentId
          WHERE university_id = :universityId
            AND institute_id = :instituteId
            AND assigned_to_user = :assignedToUserId
            AND assignment_id IS NULL
        `,
        {
          replacements: {
            assignmentId,
            universityId,
            instituteId,
            assignedToUserId,
          },
          transaction,
        },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const transaction = await sequelize.transaction();

  try {
    await sequelize.query(
      `
        UPDATE answer_sheet_qr AS qr
        INNER JOIN answersheet_evalution_user_assignment AS a
          ON a.assignment_id = qr.assignment_id
        SET qr.assignment_id = NULL
        WHERE a.notes = :notes
      `,
      {
        replacements: { notes: BACKFILL_NOTES },
        transaction,
      },
    );

    await sequelize.query(
      `
        DELETE FROM answersheet_evalution_user_assignment
        WHERE notes = :notes
      `,
      {
        replacements: { notes: BACKFILL_NOTES },
        transaction,
      },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
