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

    // Add missing campus_id columns to dormitory tables
    await addColumnIfNotExists('add_dormitory', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('dormitory_list', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('room_type', 'campus_id', 'campus', 'campus_id');

    // BACKFILL QUERIES FROM INSTITUTE

    await queryInterface.sequelize.query(`
      UPDATE add_dormitory ad
      JOIN institute i ON ad.institute_id = i.institute_id
      SET ad.campus_id = i.campus_id
      WHERE ad.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE dormitory_list dl
      JOIN institute i ON dl.institute_id = i.institute_id
      SET dl.campus_id = i.campus_id
      WHERE dl.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE room_type rt
      JOIN institute i ON rt.institute_id = i.institute_id
      SET rt.campus_id = i.campus_id
      WHERE rt.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('add_dormitory', 'campus_id');
    await removeColumnIfExists('dormitory_list', 'campus_id');
    await removeColumnIfExists('room_type', 'campus_id');
  }
};
