"use strict";

/**
 * Reshape assessment_evalution to store final Internal Assessment marks.
 *
 * Core: student × subject × class_section_term
 * Elective: student × elective_subject
 *
 * Removes: exam_assessment_id, comments, file
 * Adds: class_section_term_id, elective_subject_id, ia_maximum_marks, submitted_at
 * Changes: subject_id nullable; marks DECIMAL; status ENUM
 */

async function dropForeignKeysOnColumn(
  queryInterface,
  tableName,
  columnName,
  transaction,
) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    {
      replacements: { tableName, columnName },
      transaction,
    },
  );

  for (const row of rows) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
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
    {
      replacements: { tableName, indexName },
      transaction,
    },
  );
  return rows.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    const tableName = "assessment_evalution";

    try {
      const description = await queryInterface.describeTable(tableName, {
        transaction,
      });

      if (description.exam_assessment_id) {
        await dropForeignKeysOnColumn(
          queryInterface,
          tableName,
          "exam_assessment_id",
          transaction,
        );
        await queryInterface.removeColumn(tableName, "exam_assessment_id", {
          transaction,
        });
      }

      if (description.comments) {
        await queryInterface.removeColumn(tableName, "comments", {
          transaction,
        });
      }

      if (description.file) {
        await queryInterface.removeColumn(tableName, "file", { transaction });
      }

      if (!description.class_section_term_id) {
        await queryInterface.addColumn(
          tableName,
          "class_section_term_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "class_section_term",
              key: "class_section_term_id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          { transaction },
        );
      }

      if (!description.elective_subject_id) {
        await queryInterface.addColumn(
          tableName,
          "elective_subject_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "elective_subject",
              key: "elective_subject_id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
            comment: "Elective subject; null when subject_id is set",
          },
          { transaction },
        );
      }

      // subject_id must be nullable (XOR with elective_subject_id)
      if (description.subject_id) {
        await dropForeignKeysOnColumn(
          queryInterface,
          tableName,
          "subject_id",
          transaction,
        );
        await queryInterface.changeColumn(
          tableName,
          "subject_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: "Core subject; null when elective_subject_id is set",
          },
          { transaction },
        );
        await queryInterface.addConstraint(tableName, {
          fields: ["subject_id"],
          type: "foreign key",
          name: "fk_assessment_evalution_subject_id",
          references: {
            table: "subject",
            field: "subject_id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
          transaction,
        });
      }

      if (!description.ia_maximum_marks) {
        await queryInterface.addColumn(
          tableName,
          "ia_maximum_marks",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
            comment: "IA scale max (e.g. 20)",
          },
          { transaction },
        );
      }

      if (!description.submitted_at) {
        await queryInterface.addColumn(
          tableName,
          "submitted_at",
          {
            type: Sequelize.DATE,
            allowNull: true,
          },
          { transaction },
        );
      }

      // marks: INTEGER → DECIMAL(5,2)
      if (description.marks) {
        await queryInterface.changeColumn(
          tableName,
          "marks",
          {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            comment: "Calculated final IA marks out of ia_maximum_marks",
          },
          { transaction },
        );
      }

      // status → ENUM pending|submitted
      if (description.status) {
        await queryInterface.sequelize.query(
          `
          UPDATE \`${tableName}\`
          SET status = 'pending'
          WHERE status IS NULL
             OR LOWER(status) NOT IN ('pending', 'submitted')
          `,
          { transaction },
        );

        await queryInterface.changeColumn(
          tableName,
          "status",
          {
            type: Sequelize.ENUM("pending", "submitted"),
            allowNull: false,
            defaultValue: "pending",
          },
          { transaction },
        );
      }

      if (description.created_by) {
        await queryInterface.changeColumn(
          tableName,
          "created_by",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (description.updated_by) {
        await queryInterface.changeColumn(
          tableName,
          "updated_by",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (
        !(await indexExists(
          queryInterface,
          tableName,
          "unique_student_subject_class_section_term_ia",
          transaction,
        ))
      ) {
        await queryInterface.addIndex(
          tableName,
          ["student_id", "subject_id", "class_section_term_id"],
          {
            unique: true,
            name: "unique_student_subject_class_section_term_ia",
            transaction,
          },
        );
      }

      if (
        !(await indexExists(
          queryInterface,
          tableName,
          "unique_student_elective_subject_ia",
          transaction,
        ))
      ) {
        await queryInterface.addIndex(
          tableName,
          ["student_id", "elective_subject_id"],
          {
            unique: true,
            name: "unique_student_elective_subject_ia",
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

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    const tableName = "assessment_evalution";

    try {
      const description = await queryInterface.describeTable(tableName, {
        transaction,
      });

      if (
        await indexExists(
          queryInterface,
          tableName,
          "unique_student_elective_subject_ia",
          transaction,
        )
      ) {
        await queryInterface.removeIndex(
          tableName,
          "unique_student_elective_subject_ia",
          { transaction },
        );
      }

      if (
        await indexExists(
          queryInterface,
          tableName,
          "unique_student_subject_class_section_term_ia",
          transaction,
        )
      ) {
        await queryInterface.removeIndex(
          tableName,
          "unique_student_subject_class_section_term_ia",
          { transaction },
        );
      }

      if (description.submitted_at) {
        await queryInterface.removeColumn(tableName, "submitted_at", {
          transaction,
        });
      }

      if (description.ia_maximum_marks) {
        await queryInterface.removeColumn(tableName, "ia_maximum_marks", {
          transaction,
        });
      }

      if (description.elective_subject_id) {
        await dropForeignKeysOnColumn(
          queryInterface,
          tableName,
          "elective_subject_id",
          transaction,
        );
        await queryInterface.removeColumn(tableName, "elective_subject_id", {
          transaction,
        });
      }

      if (description.class_section_term_id) {
        await dropForeignKeysOnColumn(
          queryInterface,
          tableName,
          "class_section_term_id",
          transaction,
        );
        await queryInterface.removeColumn(tableName, "class_section_term_id", {
          transaction,
        });
      }

      if (!description.exam_assessment_id) {
        await queryInterface.addColumn(
          tableName,
          "exam_assessment_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!description.comments) {
        await queryInterface.addColumn(
          tableName,
          "comments",
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!description.file) {
        await queryInterface.addColumn(
          tableName,
          "file",
          {
            type: Sequelize.JSON,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (description.marks) {
        await queryInterface.changeColumn(
          tableName,
          "marks",
          {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          { transaction },
        );
      }

      if (description.status) {
        await queryInterface.changeColumn(
          tableName,
          "status",
          {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "pending",
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
