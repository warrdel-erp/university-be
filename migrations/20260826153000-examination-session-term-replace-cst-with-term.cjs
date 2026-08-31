"use strict";

/**
 * Replace examination_session_term.class_section_term_id with integer `term`.
 * Idempotent: safe to re-run after a partial failure.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = "examination_session_term";
    const sequelize = queryInterface.sequelize;

    const tableDesc = await queryInterface.describeTable(table);
    const hasTerm = Boolean(tableDesc.term);
    const hasClassSectionTermId = Boolean(tableDesc.class_section_term_id);

    if (!hasTerm) {
      await queryInterface.addColumn(table, "term", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (hasClassSectionTermId) {
      await sequelize.query(`
        UPDATE examination_session_term est
        INNER JOIN class_section_term cst
          ON cst.class_section_term_id = est.class_section_term_id
        SET est.term = cst.term
        WHERE est.term IS NULL
      `);
    }

    await sequelize.query(`
      DELETE est1 FROM examination_session_term est1
      INNER JOIN examination_session_term est2
        ON est1.examination_session_id = est2.examination_session_id
        AND est1.term = est2.term
        AND est1.examination_session_term_id > est2.examination_session_term_id
      WHERE est1.term IS NOT NULL
        AND est2.term IS NOT NULL
    `);

    await sequelize.query(`
      DELETE FROM examination_session_term WHERE term IS NULL
    `);

    const refreshed = await queryInterface.describeTable(table);
    if (refreshed.term && refreshed.term.allowNull) {
      await queryInterface.changeColumn(table, "term", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (hasClassSectionTermId) {
      // Composite unique (session_id, class_section_term_id) often backs the
      // examination_session_id FK. Add a dedicated session_id index first.
      const [sessionIdx] = await sequelize.query(`
        SELECT INDEX_NAME AS indexName
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'examination_session_term'
          AND INDEX_NAME = 'examination_session_term_session_id_idx'
        LIMIT 1
      `);
      if (!sessionIdx.length) {
        await sequelize.query(`
          ALTER TABLE examination_session_term
          ADD INDEX examination_session_term_session_id_idx (examination_session_id)
        `);
      }

      const [fkRows] = await sequelize.query(`
        SELECT CONSTRAINT_NAME AS constraintName
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'examination_session_term'
          AND COLUMN_NAME = 'class_section_term_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      for (const row of fkRows) {
        await queryInterface.removeConstraint(table, row.constraintName);
      }

      const [indexes] = await sequelize.query(`
        SELECT DISTINCT INDEX_NAME AS indexName
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'examination_session_term'
          AND COLUMN_NAME = 'class_section_term_id'
      `);

      for (const row of indexes) {
        if (row.indexName === "PRIMARY") continue;
        await sequelize.query(
          `ALTER TABLE examination_session_term DROP INDEX \`${row.indexName}\``,
        );
      }

      await queryInterface.removeColumn(table, "class_section_term_id");
    }

    const [existingUnique] = await sequelize.query(`
      SELECT INDEX_NAME AS indexName
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'examination_session_term'
        AND INDEX_NAME = 'unique_examination_session_term'
      LIMIT 1
    `);

    if (!existingUnique.length) {
      await queryInterface.addIndex(table, ["examination_session_id", "term"], {
        unique: true,
        name: "unique_examination_session_term",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = "examination_session_term";
    const sequelize = queryInterface.sequelize;
    const tableDesc = await queryInterface.describeTable(table);

    if (!tableDesc.class_section_term_id) {
      await queryInterface.addColumn(table, "class_section_term_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await sequelize.query(`
        UPDATE examination_session_term est
        INNER JOIN (
          SELECT cst.class_section_term_id, cst.term
          FROM class_section_term cst
          INNER JOIN (
            SELECT term, MIN(class_section_term_id) AS class_section_term_id
            FROM class_section_term
            GROUP BY term
          ) pick ON pick.class_section_term_id = cst.class_section_term_id
        ) mapped ON mapped.term = est.term
        SET est.class_section_term_id = mapped.class_section_term_id
        WHERE est.class_section_term_id IS NULL
      `);

      await queryInterface.changeColumn(table, "class_section_term_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "class_section_term",
          key: "class_section_term_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }

    const [uniqueTermIdx] = await sequelize.query(`
      SELECT INDEX_NAME AS indexName
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'examination_session_term'
        AND INDEX_NAME = 'unique_examination_session_term'
      LIMIT 1
    `);
    if (uniqueTermIdx.length) {
      await queryInterface.removeIndex(table, "unique_examination_session_term");
    }

    if (tableDesc.term) {
      await queryInterface.removeColumn(table, "term");
    }

    const [oldUnique] = await sequelize.query(`
      SELECT INDEX_NAME AS indexName
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'examination_session_term'
        AND INDEX_NAME = 'unique_examination_session_class_section_term'
      LIMIT 1
    `);
    if (!oldUnique.length) {
      await queryInterface.addIndex(
        table,
        ["examination_session_id", "class_section_term_id"],
        {
          unique: true,
          name: "unique_examination_session_class_section_term",
        },
      );
    }
  },
};
