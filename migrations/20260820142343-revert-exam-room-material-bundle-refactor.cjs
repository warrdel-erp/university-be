"use strict";

async function dropForeignKeyConstraints(queryInterface, tableName, columnName) {
  try {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = '${columnName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of constraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
      );
    }
  } catch (err) {
    console.warn(`Warning dropping FK for ${tableName}.${columnName}:`, err.message);
  }
}

async function dropIndexesForColumnOrName(queryInterface, tableName, columnNames, indexNames = []) {
  try {
    const [indexes] = await queryInterface.sequelize.query(`
      SHOW INDEX FROM \`${tableName}\`
    `);
    const dropped = new Set();

    for (const index of indexes) {
      const idxName = index.Key_name;
      const colName = index.Column_name;
      if (idxName === "PRIMARY") continue;

      if (indexNames.includes(idxName) || columnNames.includes(colName)) {
        if (!dropped.has(idxName)) {
          try {
            await queryInterface.sequelize.query(
              `ALTER TABLE \`${tableName}\` DROP INDEX \`${idxName}\``
            );
            dropped.add(idxName);
          } catch (e) {
            console.warn(`Warning dropping index ${idxName} on ${tableName}:`, e.message);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Warning querying indexes on ${tableName}:`, err.message);
  }
}

async function dropColumnIfExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``
    );
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Drop foreign key constraints on the columns to be removed FIRST
    await dropForeignKeyConstraints(
      queryInterface,
      "exam_room_material_bundle",
      "exam_schedule_room_capacity_id"
    );
    await dropForeignKeyConstraints(
      queryInterface,
      "exam_room_material_bundle",
      "exam_schedule_id"
    );

    // 2. Drop unique index and any other indexes on those columns
    await dropIndexesForColumnOrName(
      queryInterface,
      "exam_room_material_bundle",
      ["exam_schedule_room_capacity_id", "exam_schedule_id"],
      [
        "uq_ermb_schedule_room",
        "fk_ermb_exam_schedule_room_cap_id",
        "fk_ermb_exam_schedule_id",
      ]
    );

    // 3. Remove refactored columns now that constraints and indexes are removed
    await dropColumnIfExists(
      queryInterface,
      "exam_room_material_bundle",
      "exam_schedule_room_capacity_id"
    );
    await dropColumnIfExists(
      queryInterface,
      "exam_room_material_bundle",
      "exam_schedule_id"
    );

    // 4. Add back original columns if they do not exist
    const tableDefinition = await queryInterface.describeTable(
      "exam_room_material_bundle"
    );

    if (!tableDefinition.exam_date) {
      await queryInterface.addColumn("exam_room_material_bundle", "exam_date", {
        type: Sequelize.DATEONLY,
        allowNull: false,
      });
    }

    if (!tableDefinition.examination_session_slot_id) {
      await queryInterface.addColumn(
        "exam_room_material_bundle",
        "examination_session_slot_id",
        {
          type: Sequelize.BIGINT,
          allowNull: false,
        }
      );

      // Add FK constraint with explicit short name to stay within MySQL 64-char limit
      await queryInterface.addConstraint("exam_room_material_bundle", {
        fields: ["examination_session_slot_id"],
        type: "foreign key",
        name: "fk_ermb_session_slot_id",
        references: {
          table: "examination_session_slot",
          field: "examination_session_slot_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }

    if (!tableDefinition.class_room_section_id) {
      await queryInterface.addColumn(
        "exam_room_material_bundle",
        "class_room_section_id",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        }
      );

      // Add FK constraint with explicit short name
      await queryInterface.addConstraint("exam_room_material_bundle", {
        fields: ["class_room_section_id"],
        type: "foreign key",
        name: "fk_ermb_class_room_section_id",
        references: {
          table: "class_room_section",
          field: "class_room_section_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }

    // 5. Add back unique index
    try {
      await queryInterface.addIndex("exam_room_material_bundle", {
        fields: [
          "exam_date",
          "examination_session_slot_id",
          "class_room_section_id",
        ],
        unique: true,
        name: "exam_room_material_bundle_unique_idx",
      });
    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    // 1. Drop foreign keys on original columns
    await dropForeignKeyConstraints(
      queryInterface,
      "exam_room_material_bundle",
      "examination_session_slot_id"
    );
    await dropForeignKeyConstraints(
      queryInterface,
      "exam_room_material_bundle",
      "class_room_section_id"
    );

    // 2. Drop unique index and related indexes
    await dropIndexesForColumnOrName(
      queryInterface,
      "exam_room_material_bundle",
      ["examination_session_slot_id", "class_room_section_id", "exam_date"],
      [
        "exam_room_material_bundle_unique_idx",
        "fk_ermb_session_slot_id",
        "fk_ermb_class_room_section_id",
      ]
    );

    // 3. Drop columns
    await dropColumnIfExists(
      queryInterface,
      "exam_room_material_bundle",
      "class_room_section_id"
    );
    await dropColumnIfExists(
      queryInterface,
      "exam_room_material_bundle",
      "examination_session_slot_id"
    );
    await dropColumnIfExists(
      queryInterface,
      "exam_room_material_bundle",
      "exam_date"
    );

    // 4. Restore refactored columns
    const tableDefinition = await queryInterface.describeTable(
      "exam_room_material_bundle"
    );

    if (!tableDefinition.exam_schedule_id) {
      await queryInterface.addColumn(
        "exam_room_material_bundle",
        "exam_schedule_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        }
      );

      try {
        await queryInterface.addConstraint("exam_room_material_bundle", {
          fields: ["exam_schedule_id"],
          type: "foreign key",
          name: "fk_ermb_exam_schedule_id",
          references: { table: "exam_schedule", field: "exam_schedule_id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        });
      } catch (e) {}
    }

    if (!tableDefinition.exam_schedule_room_capacity_id) {
      await queryInterface.addColumn(
        "exam_room_material_bundle",
        "exam_schedule_room_capacity_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        }
      );

      try {
        await queryInterface.addConstraint("exam_room_material_bundle", {
          fields: ["exam_schedule_room_capacity_id"],
          type: "foreign key",
          name: "fk_ermb_exam_schedule_room_cap_id",
          references: {
            table: "exam_schedule_room_capacity",
            field: "exam_schedule_room_capacity_id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        });
      } catch (e) {}
    }

    try {
      await queryInterface.addIndex("exam_room_material_bundle", {
        fields: ["exam_schedule_id", "exam_schedule_room_capacity_id"],
        unique: true,
        name: "uq_ermb_schedule_room",
      });
    } catch (e) {}
  },
};
