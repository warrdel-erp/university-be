'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('user_role_permission_scope');

    // 1. Add university_id column if not exists
    if (!tableDescription.university_id) {
      await queryInterface.addColumn(
        'user_role_permission_scope',
        'university_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'university',
            key: 'university_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }
      );

      await queryInterface.addIndex(
        'user_role_permission_scope',
        ['university_id'],
        {
          name: 'idx_urps_university_id',
        }
      );
    }

    // 2. Backfill university_id for existing rows from users table (without impacting existing data)
    await queryInterface.sequelize.query(`
      UPDATE user_role_permission_scope urps
      INNER JOIN users u ON urps.user_id = u.user_id
      SET urps.university_id = u.university_id
      WHERE urps.university_id IS NULL AND u.university_id IS NOT NULL;
    `);

    // 3. Make scope column nullable so permissions can exist without any scope assigned
    await queryInterface.changeColumn(
      'user_role_permission_scope',
      'scope',
      {
        type: Sequelize.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'),
        allowNull: true,
        defaultValue: null,
      }
    );

    // 4. Remove deleted_at column if present
    if (tableDescription.deleted_at) {
      await queryInterface.removeColumn(
        'user_role_permission_scope',
        'deleted_at'
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('user_role_permission_scope');

    // 1. Re-add deleted_at if missing
    if (!tableDescription.deleted_at) {
      await queryInterface.addColumn(
        'user_role_permission_scope',
        'deleted_at',
        {
          type: Sequelize.DATE,
          allowNull: true,
        }
      );
    }

    // 2. Revert scope nullability (backfill null scopes with INSTITUTE first to satisfy NOT NULL constraint)
    await queryInterface.bulkUpdate(
      'user_role_permission_scope',
      { scope: 'INSTITUTE' },
      { scope: null }
    );

    await queryInterface.changeColumn(
      'user_role_permission_scope',
      'scope',
      {
        type: Sequelize.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'),
        allowNull: false,
        defaultValue: 'INSTITUTE',
      }
    );

    // 3. Remove university_id column and foreign key / index if exists
    if (tableDescription.university_id) {
      const [fks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_role_permission_scope'
          AND COLUMN_NAME = 'university_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);

      for (const fk of fks) {
        try {
          await queryInterface.removeConstraint('user_role_permission_scope', fk.CONSTRAINT_NAME);
        } catch (err) {
          // Ignore if constraint already removed
        }
      }

      try {
        await queryInterface.removeIndex('user_role_permission_scope', 'idx_urps_university_id');
      } catch (err) {
        // Ignore if index already removed
      }

      await queryInterface.removeColumn('user_role_permission_scope', 'university_id');
    }
  },
};
