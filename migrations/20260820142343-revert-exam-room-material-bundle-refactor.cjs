"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable(
      "exam_room_material_bundle",
    );

    // 1. Remove unique index from the refactored columns if it exists (use raw SQL to
    //    avoid Sequelize introspecting column definitions for a potentially corrupt index)
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE `exam_room_material_bundle` DROP INDEX `uq_ermb_schedule_room`"
      );
    } catch (e) {}

    // 2. Remove FK constraints on refactored columns if they exist
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE `exam_room_material_bundle` DROP FOREIGN KEY `fk_ermb_exam_schedule_room_cap_id`"
      );
    } catch (e) {}
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE `exam_room_material_bundle` DROP FOREIGN KEY `fk_ermb_exam_schedule_id`"
      );
    } catch (e) {}

    // 3. Remove refactored columns if they exist
    if (tableDefinition.exam_schedule_room_capacity_id) {
      try {
        await queryInterface.removeColumn(
          "exam_room_material_bundle",
          "exam_schedule_room_capacity_id",
        );
      } catch (e) {}
    }
    if (tableDefinition.exam_schedule_id) {
      try {
        await queryInterface.removeColumn(
          "exam_room_material_bundle",
          "exam_schedule_id",
        );
      } catch (e) {}
    }

    // 4. Add back original columns if they do not exist
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
        },
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
        },
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
    const tableDefinition = await queryInterface.describeTable(
      "exam_room_material_bundle",
    );

    try {
      await queryInterface.removeIndex(
        "exam_room_material_bundle",
        "exam_room_material_bundle_unique_idx",
      );
    } catch (e) {}

    try {
      await queryInterface.removeConstraint(
        "exam_room_material_bundle",
        "fk_ermb_class_room_section_id",
      );
    } catch (e) {}

    try {
      await queryInterface.removeConstraint(
        "exam_room_material_bundle",
        "fk_ermb_session_slot_id",
      );
    } catch (e) {}

    if (tableDefinition.class_room_section_id) {
      await queryInterface.removeColumn(
        "exam_room_material_bundle",
        "class_room_section_id",
      );
    }
    if (tableDefinition.examination_session_slot_id) {
      await queryInterface.removeColumn(
        "exam_room_material_bundle",
        "examination_session_slot_id",
      );
    }
    if (tableDefinition.exam_date) {
      await queryInterface.removeColumn(
        "exam_room_material_bundle",
        "exam_date",
      );
    }

    if (!tableDefinition.exam_schedule_id) {
      await queryInterface.addColumn(
        "exam_room_material_bundle",
        "exam_schedule_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
      );
    }

    if (!tableDefinition.exam_schedule_room_capacity_id) {
      await queryInterface.addColumn(
        "exam_room_material_bundle",
        "exam_schedule_room_capacity_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
      );
    }

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

    try {
      await queryInterface.addIndex("exam_room_material_bundle", {
        fields: ["exam_schedule_id", "exam_schedule_room_capacity_id"],
        unique: true,
        name: "uq_ermb_schedule_room",
      });
    } catch (e) {}
  },
};
