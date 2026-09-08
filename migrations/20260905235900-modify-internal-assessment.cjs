"use strict";

/**
 * internal_assessment schema + internal_assessment_student_evaluation.
 * Idempotent: safe to re-run; skips work already applied.
 */

async function tableExists(queryInterface, tableName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1 AS ok
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
    LIMIT 1
    `,
    { replacements: { tableName }, transaction },
  );
  return rows.length > 0;
}

async function describeTable(queryInterface, tableName, transaction) {
  return queryInterface.describeTable(tableName, { transaction });
}

async function dropForeignKeysOnColumns(
  queryInterface,
  tableName,
  columns,
  transaction,
) {
  if (!columns.length) {
    return;
  }

  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT DISTINCT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME IN (:columns)
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columns }, transaction },
  );

  for (const row of rows) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function dropForeignKeysReferencingColumn(
  queryInterface,
  referencedTable,
  referencedColumn,
  transaction,
) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME = :referencedTable
      AND REFERENCED_COLUMN_NAME = :referencedColumn
    `,
    {
      replacements: { referencedTable, referencedColumn },
      transaction,
    },
  );

  for (const row of rows) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${row.tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

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

async function addColumnIfMissing(
  queryInterface,
  tableName,
  columnName,
  definition,
  transaction,
) {
  const description = await describeTable(
    queryInterface,
    tableName,
    transaction,
  );
  if (description[columnName]) {
    return;
  }
  await queryInterface.addColumn(tableName, columnName, definition, {
    transaction,
  });
}

async function migrateInternalAssessmentTable(queryInterface, Sequelize, transaction) {
  if (!(await tableExists(queryInterface, "internal_assessment", transaction))) {
    return;
  }

  await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0", {
    transaction,
  });

  try {
    await queryInterface.sequelize.query(
      "ALTER TABLE assessment_evalution DROP FOREIGN KEY fk_assessment_evalution_assessment",
      { transaction },
    );
  } catch (e) {
    // FK may already be gone
  }

  let description = await describeTable(
    queryInterface,
    "internal_assessment",
    transaction,
  );

  // Drop obsolete columns only (do not drop type/due_date — they are re-used)
  const obsoleteColumns = [
    "total_marks",
    "publish_date",
    "description",
    "file",
    "created_by",
    "updated_by",
    "deleted_at",
  ];
  const existingObsolete = obsoleteColumns.filter((col) => description[col]);

  if (existingObsolete.length > 0) {
    await dropForeignKeysOnColumns(
      queryInterface,
      "internal_assessment",
      existingObsolete,
      transaction,
    );

    for (const col of existingObsolete) {
      await queryInterface.removeColumn("internal_assessment", col, {
        transaction,
      });
    }

    description = await describeTable(
      queryInterface,
      "internal_assessment",
      transaction,
    );
  }

  // Rename / replace old PK exam_assessment_id → internal_assessment_id
  if (description.exam_assessment_id && !description.internal_assessment_id) {
    await dropForeignKeysOnColumns(
      queryInterface,
      "internal_assessment",
      ["exam_assessment_id"],
      transaction,
    );
    await dropForeignKeysReferencingColumn(
      queryInterface,
      "internal_assessment",
      "exam_assessment_id",
      transaction,
    );

    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE internal_assessment DROP PRIMARY KEY",
        { transaction },
      );
    } catch (e) {
      // may already be dropped
    }

    await queryInterface.removeColumn(
      "internal_assessment",
      "exam_assessment_id",
      { transaction },
    );

    await queryInterface.addColumn(
      "internal_assessment",
      "internal_assessment_id",
      {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      { transaction },
    );
  } else if (!description.internal_assessment_id) {
    await queryInterface.addColumn(
      "internal_assessment",
      "internal_assessment_id",
      {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      { transaction },
    );
  }

  // Add faculty IA columns (skip if already present)
  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "session_id",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "session", key: "session_id" },
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "class_section_term_id",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "class_section_term",
        key: "class_section_term_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "type",
    {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Subcategory like Assignment, Quiz",
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "maximum_marks",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "issue_date",
    {
      type: Sequelize.DATE,
      allowNull: true,
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "due_date",
    {
      type: Sequelize.DATE,
      allowNull: true,
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "document_url",
    {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "URL for the saved PDF document",
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "mode",
    {
      type: Sequelize.ENUM("online", "offline"),
      allowNull: true,
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "weightage_percentage",
    {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    },
    transaction,
  );

  await addColumnIfMissing(
    queryInterface,
    "internal_assessment",
    "normalized_max_marks",
    {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    },
    transaction,
  );

  await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1", {
    transaction,
  });
}

async function migrateStudentEvaluationTable(queryInterface, Sequelize, transaction) {
  const tableName = "internal_assessment_student_evaluation";

  if (!(await tableExists(queryInterface, tableName, transaction))) {
    await queryInterface.createTable(
      tableName,
      {
        internal_assessment_student_evaluation_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        student_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "students", key: "student_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        internal_assessment_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "internal_assessment",
            key: "internal_assessment_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        obtained_marks: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        document_url: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "university", key: "university_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "institute", key: "institute_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        acedmic_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "acedmic_year", key: "acedmic_year_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      { transaction },
    );
  }

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
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1) internal_assessment
      await migrateInternalAssessmentTable(
        queryInterface,
        Sequelize,
        transaction,
      );

      // 2) internal_assessment_student_evaluation
      await migrateStudentEvaluationTable(
        queryInterface,
        Sequelize,
        transaction,
      );

      await transaction.commit();
    } catch (error) {
      try {
        await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1", {
          transaction,
        });
      } catch (e) {
        // ignore
      }
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (
        await tableExists(
          queryInterface,
          "internal_assessment_student_evaluation",
          transaction,
        )
      ) {
        await queryInterface.dropTable(
          "internal_assessment_student_evaluation",
          { transaction },
        );
      }

      if (await tableExists(queryInterface, "internal_assessment", transaction)) {
        const columnsToRemove = [
          "session_id",
          "class_section_term_id",
          "type",
          "maximum_marks",
          "issue_date",
          "due_date",
          "document_url",
          "mode",
          "weightage_percentage",
          "normalized_max_marks",
        ];

        const description = await describeTable(
          queryInterface,
          "internal_assessment",
          transaction,
        );

        await dropForeignKeysOnColumns(
          queryInterface,
          "internal_assessment",
          columnsToRemove.filter((col) => description[col]),
          transaction,
        );

        for (const col of columnsToRemove) {
          if (description[col]) {
            await queryInterface.removeColumn("internal_assessment", col, {
              transaction,
            });
          }
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
