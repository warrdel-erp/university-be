"use strict";

/** Renames deprecated class_student_mapper -> class_student_mapper_depricated. */

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) =>
      typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
    );

    if (
      normalized.includes("class_student_mapper") &&
      !normalized.includes("class_student_mapper_depricated")
    ) {
      await queryInterface.renameTable(
        "class_student_mapper",
        "class_student_mapper_depricated",
      );
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) =>
      typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
    );

    if (
      normalized.includes("class_student_mapper_depricated") &&
      !normalized.includes("class_student_mapper")
    ) {
      await queryInterface.renameTable(
        "class_student_mapper_depricated",
        "class_student_mapper",
      );
    }
  },
};
