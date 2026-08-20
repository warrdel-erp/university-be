"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add examScheduleId (plain column; FK added separately with a short name)
    await queryInterface.addColumn("exam_room_material_bundle", "exam_schedule_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 2. Add examScheduleRoomCapacityId
    await queryInterface.addColumn("exam_room_material_bundle", "exam_schedule_room_capacity_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 3. Add FK constraint for exam_schedule_id (explicit short name to stay within MySQL 64-char limit)
    await queryInterface.addConstraint("exam_room_material_bundle", {
      fields: ["exam_schedule_id"],
      type: "foreign key",
      name: "fk_ermb_exam_schedule_id",
      references: { table: "exam_schedule", field: "exam_schedule_id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    // 4. Add FK constraint for exam_schedule_room_capacity_id
    await queryInterface.addConstraint("exam_room_material_bundle", {
      fields: ["exam_schedule_room_capacity_id"],
      type: "foreign key",
      name: "fk_ermb_exam_schedule_room_cap_id",
      references: { table: "exam_schedule_room_capacity", field: "exam_schedule_room_capacity_id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    // 5. Add bundleCode
    await queryInterface.addColumn("exam_room_material_bundle", "bundle_code", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    // 6. Unique constraint: one bundle per exam-room mapping
    await queryInterface.addIndex("exam_room_material_bundle", {
      fields: ["exam_schedule_id", "exam_schedule_room_capacity_id"],
      unique: true,
      name: "uq_ermb_schedule_room",
    });

    // 7. Remove exam_date (derivable from examSchedule)
    await queryInterface.removeColumn("exam_room_material_bundle", "exam_date");

    // 8. Remove examination_session_slot_id (derivable from examSchedule)
    await queryInterface.removeColumn("exam_room_material_bundle", "examination_session_slot_id");

    // 9. Remove class_room_section_id (derivable from examScheduleRoomCapacity)
    await queryInterface.removeColumn("exam_room_material_bundle", "class_room_section_id");
  },

  async down(queryInterface, Sequelize) {
    // Remove unique index first
    await queryInterface.removeIndex("exam_room_material_bundle", "uq_ermb_schedule_room");

    // Remove FK constraints
    await queryInterface.removeConstraint("exam_room_material_bundle", "fk_ermb_exam_schedule_room_cap_id");
    await queryInterface.removeConstraint("exam_room_material_bundle", "fk_ermb_exam_schedule_id");

    // Remove added columns
    await queryInterface.removeColumn("exam_room_material_bundle", "bundle_code");
    await queryInterface.removeColumn("exam_room_material_bundle", "exam_schedule_room_capacity_id");
    await queryInterface.removeColumn("exam_room_material_bundle", "exam_schedule_id");

    // Restore removed columns
    await queryInterface.addColumn("exam_room_material_bundle", "exam_date", {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.addColumn("exam_room_material_bundle", "examination_session_slot_id", {
      type: Sequelize.BIGINT,
      allowNull: false,
    });
    await queryInterface.addColumn("exam_room_material_bundle", "class_room_section_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
