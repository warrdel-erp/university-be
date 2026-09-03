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
          references: referenceModel
            ? {
                model: referenceModel,
                key: referenceKey,
              }
            : undefined,
        });
      }
    };

    await addColumnIfNotExists('library_book', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('library_book', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('library_book', 'campus_id', 'campus', 'campus_id');

    await queryInterface.sequelize
      .query(`
      UPDATE library_book lb
      JOIN library_creation lc ON lb.library_creation_id = lc.library_creation_id
      SET
        lb.university_id = COALESCE(lb.university_id, lc.university_id),
        lb.institute_id = COALESCE(lb.institute_id, lc.institute_id),
        lb.campus_id = COALESCE(lb.campus_id, lc.campus_id)
      WHERE
        lb.university_id IS NULL
        OR lb.institute_id IS NULL
        OR lb.campus_id IS NULL;
    `)
      .catch(() => {});

    await queryInterface.sequelize
      .query(`
      UPDATE library_book lb
      JOIN institute i ON lb.institute_id = i.institute_id
      SET lb.university_id = COALESCE(lb.university_id, i.university_id)
      WHERE lb.university_id IS NULL;
    `)
      .catch(() => {});

    await queryInterface.sequelize
      .query(`
      UPDATE library_book lb
      JOIN campus c ON lb.campus_id = c.campus_id
      JOIN institute i ON i.campus_id = c.campus_id
      SET
        lb.institute_id = COALESCE(lb.institute_id, i.institute_id),
        lb.university_id = COALESCE(lb.university_id, i.university_id)
      WHERE
        (lb.university_id IS NULL OR lb.institute_id IS NULL)
        AND lb.campus_id IS NOT NULL;
    `)
      .catch(() => {});
  },

  async down(queryInterface) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('library_book', 'university_id');
    await removeColumnIfExists('library_book', 'institute_id');
  },
};
