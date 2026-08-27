'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: referenceModel ? {
            model: referenceModel,
            key: referenceKey
          } : undefined
        });
      }
    };

    // Add missing campus_id columns to fee tables
    await addColumnIfNotExists('fee_type_catalog', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('fee_plan_profile', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('student_fee_invoice', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('student_fee_payment', 'campus_id', 'campus', 'campus_id');

    // BACKFILL QUERIES FROM INSTITUTE

    await queryInterface.sequelize.query(`
      UPDATE fee_type_catalog f
      JOIN institute i ON f.institute_id = i.institute_id
      SET f.campus_id = i.campus_id
      WHERE f.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_plan_profile f
      JOIN institute i ON f.institute_id = i.institute_id
      SET f.campus_id = i.campus_id
      WHERE f.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE student_fee_invoice s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.campus_id = i.campus_id
      WHERE s.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE student_fee_payment s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.campus_id = i.campus_id
      WHERE s.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('fee_type_catalog', 'campus_id');
    await removeColumnIfExists('fee_plan_profile', 'campus_id');
    await removeColumnIfExists('student_fee_invoice', 'campus_id');
    await removeColumnIfExists('student_fee_payment', 'campus_id');
  }
};
