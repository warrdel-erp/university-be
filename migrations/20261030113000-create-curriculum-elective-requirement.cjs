'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable(
        'curriculum_elective_requirement',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          curriculum_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'curriculum',
              key: 'curriculum_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          term: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          requirement_code: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          requirement_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          curriculum_category_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'curriculum_category',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          course_count: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          courses_required: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          min_credits: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          elective_pool_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'elective_pool',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          updated_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      // Index on curriculum_id and term for fast listing
      await queryInterface.addIndex(
        'curriculum_elective_requirement',
        ['curriculum_id', 'term'],
        {
          name: 'idx_cer_curriculum_term',
          transaction: t,
        }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('curriculum_elective_requirement', { transaction: t });
    });
  },
};

