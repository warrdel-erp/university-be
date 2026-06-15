'use strict';

/** Add institute_id to elective_subject; backfill from course.institute_id */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('elective_subject', 'institute_id', {
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
      UPDATE elective_subject es
      INNER JOIN course c ON c.course_id = es.course_id
      SET es.institute_id = c.institute_id
      WHERE es.institute_id IS NULL
        AND es.course_id IS NOT NULL
    `);

    await queryInterface.changeColumn('elective_subject', 'institute_id', {
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
    await queryInterface.removeColumn('elective_subject', 'institute_id');
  },
};
