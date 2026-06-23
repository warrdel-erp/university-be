'use strict';

/** Add institute_id and acedmic_year_id to holiday; backfill both from creator defaults */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('holiday', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'institute',
        key: 'institute_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addColumn('holiday', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'acedmic_year',
        key: 'acedmic_year_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Set both keys together from the user who created each holiday.
    await queryInterface.sequelize.query(`
      UPDATE holiday h
      INNER JOIN users u ON u.user_id = h.created_by
      SET
        h.institute_id = u.default_institute_id,
        h.acedmic_year_id = u.default_academic_year_id
      WHERE h.institute_id IS NULL
        AND u.default_institute_id IS NOT NULL
        AND u.default_academic_year_id IS NOT NULL
    `);

    // Match holiday date to academic year range; institute from creator default or first institute.
    await queryInterface.sequelize.query(`
      UPDATE holiday h
      INNER JOIN users u ON u.user_id = h.created_by
      INNER JOIN acedmic_year ay ON DATE(h.date) BETWEEN ay.starting_date AND ay.ending_date
      SET
        h.institute_id = COALESCE(h.institute_id, u.default_institute_id),
        h.acedmic_year_id = ay.acedmic_year_id
      WHERE h.institute_id IS NULL OR h.acedmic_year_id IS NULL
    `);

    // Remaining rows: active academic year + institute from creator default.
    await queryInterface.sequelize.query(`
      UPDATE holiday h
      INNER JOIN users u ON u.user_id = h.created_by
      SET
        h.institute_id = COALESCE(h.institute_id, u.default_institute_id),
        h.acedmic_year_id = COALESCE(
          h.acedmic_year_id,
          (SELECT ay.acedmic_year_id FROM acedmic_year ay WHERE ay.is_active = 1 ORDER BY ay.acedmic_year_id LIMIT 1)
        )
      WHERE h.institute_id IS NULL OR h.acedmic_year_id IS NULL
    `);

    // Final fallback: first institute + first academic year (both set in one statement).
    await queryInterface.sequelize.query(`
      UPDATE holiday h
      SET
        h.institute_id = COALESCE(
          h.institute_id,
          (SELECT MIN(i.institute_id) FROM institute i)
        ),
        h.acedmic_year_id = COALESCE(
          h.acedmic_year_id,
          (SELECT MIN(ay.acedmic_year_id) FROM acedmic_year ay)
        )
      WHERE h.institute_id IS NULL OR h.acedmic_year_id IS NULL
    `);

    const [[{ nullCount }]] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS nullCount
      FROM holiday
      WHERE institute_id IS NULL OR acedmic_year_id IS NULL
    `);

    if (Number(nullCount) > 0) {
      throw new Error(
        `Holiday backfill incomplete: ${nullCount} row(s) still have null institute_id or acedmic_year_id`
      );
    }

    await queryInterface.changeColumn('holiday', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'institute',
        key: 'institute_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('holiday', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'acedmic_year',
        key: 'acedmic_year_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('holiday', 'acedmic_year_id');
    await queryInterface.removeColumn('holiday', 'institute_id');
  },
};
