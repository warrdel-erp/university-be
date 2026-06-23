'use strict';

/** Add university_id and institute_id to acedmic_year */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('acedmic_year', 'university_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'university',
        key: 'university_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addColumn('acedmic_year', 'institute_id', {
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
      UPDATE acedmic_year ay
      INNER JOIN users u ON u.user_id = ay.updated_by
      SET
        ay.university_id = u.university_id,
        ay.institute_id = u.default_institute_id
      WHERE ay.university_id IS NULL
        AND u.default_institute_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE acedmic_year ay
      SET
        ay.university_id = COALESCE(
          ay.university_id,
          (SELECT MIN(u.university_id) FROM users u)
        ),
        ay.institute_id = COALESCE(
          ay.institute_id,
          (SELECT MIN(i.institute_id) FROM institute i)
        )
      WHERE ay.university_id IS NULL OR ay.institute_id IS NULL
    `);

    const [[{ nullCount }]] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS nullCount
      FROM acedmic_year
      WHERE university_id IS NULL OR institute_id IS NULL
    `);

    if (Number(nullCount) > 0) {
      throw new Error(
        `Academic year backfill incomplete: ${nullCount} row(s) still have null university_id or institute_id`
      );
    }

    await queryInterface.changeColumn('acedmic_year', 'university_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'university',
        key: 'university_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('acedmic_year', 'institute_id', {
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
    await queryInterface.removeColumn('acedmic_year', 'institute_id');
    await queryInterface.removeColumn('acedmic_year', 'university_id');
  },
};
