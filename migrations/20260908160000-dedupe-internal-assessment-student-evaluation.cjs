"use strict";

/**
 * Duplicate rows: same student_id + internal_assessment_id (unique index missing
 * or upsert inserted instead of updating). Keep preferred row, then ensure unique index.
 */

async function indexExists(queryInterface, tableName, indexName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1 AS ok
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND INDEX_NAME = :indexName
    LIMIT 1
    `,
    { replacements: { tableName, indexName }, transaction },
  );
  return rows.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    const tableName = "internal_assessment_student_evaluation";

    try {
      await queryInterface.sequelize.query(
        `
        DELETE e
        FROM \`${tableName}\` e
        INNER JOIN (
          SELECT
            student_id,
            internal_assessment_id,
            COALESCE(
              MAX(
                CASE
                  WHEN obtained_marks IS NOT NULL
                  THEN internal_assessment_student_evaluation_id
                END
              ),
              MAX(internal_assessment_student_evaluation_id)
            ) AS keep_id
          FROM \`${tableName}\`
          GROUP BY student_id, internal_assessment_id
          HAVING COUNT(*) > 1
        ) d
          ON e.student_id = d.student_id
         AND e.internal_assessment_id = d.internal_assessment_id
        WHERE e.internal_assessment_student_evaluation_id <> d.keep_id
        `,
        { transaction },
      );

      if (
        !(await indexExists(
          queryInterface,
          tableName,
          "unique_student_internal_assessment",
          transaction,
        ))
      ) {
        await queryInterface.addIndex(
          tableName,
          ["student_id", "internal_assessment_id"],
          {
            unique: true,
            name: "unique_student_internal_assessment",
            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {
    // Keep unique index; do not recreate deleted duplicates.
  },
};
