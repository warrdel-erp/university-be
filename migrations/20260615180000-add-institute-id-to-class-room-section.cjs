'use strict';

/** Add institute_id to class_room_section; backfill via floor → building → institute */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('class_room_section', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'institute',
        key: 'institute_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.sequelize.query(`
      UPDATE class_room_section crs
      INNER JOIN floor f ON f.floor_id = crs.floor_id
      INNER JOIN building b ON b.building_id = f.building_id
      INNER JOIN (
        SELECT campus_id, MIN(institute_id) AS institute_id
        FROM institute
        GROUP BY campus_id
      ) i ON i.campus_id = b.campus_id
      SET crs.institute_id = i.institute_id
      WHERE crs.institute_id IS NULL
    `);

    await queryInterface.changeColumn('class_room_section', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'institute',
        key: 'institute_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('class_room_section', 'institute_id');
  },
};
