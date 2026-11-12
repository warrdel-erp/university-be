'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable(
        'curriculum_elective_assignment',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          curriculum_elective_requirement_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'curriculum_elective_requirement',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          student_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'students',
              key: 'student_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          subject_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'subject',
              key: 'subject_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          assignment_source: {
            type: Sequelize.ENUM('Direct', 'Selection Round'),
            allowNull: false,
            defaultValue: 'Direct',
          },
          status: {
            type: Sequelize.ENUM('Assigned', 'Awaiting', 'Dropped'),
            allowNull: false,
            defaultValue: 'Assigned',
          },
          university_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'university',
              key: 'university_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          institute_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'institute',
              key: 'institute_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          academic_year_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'acedmic_year',
              key: 'acedmic_year_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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

      // Unique constraint to prevent duplicate assignment of the same course to the same student under a requirement
      await queryInterface.addIndex(
        'curriculum_elective_assignment',
        ['curriculum_elective_requirement_id', 'student_id', 'subject_id'],
        {
          name: 'uq_cea_req_student_subject',
          unique: true,
          transaction: t,
        }
      );

      // Index for subject queries (e.g. course-wise count & seat occupancy)
      await queryInterface.addIndex(
        'curriculum_elective_assignment',
        ['curriculum_elective_requirement_id', 'subject_id'],
        {
          name: 'idx_cea_req_subject',
          transaction: t,
        }
      );

      // Index for student lookup
      await queryInterface.addIndex(
        'curriculum_elective_assignment',
        ['student_id'],
        {
          name: 'idx_cea_student',
          transaction: t,
        }
      );

      // Index for multi-tenant scoping
      await queryInterface.addIndex(
        'curriculum_elective_assignment',
        ['university_id', 'institute_id', 'academic_year_id'],
        {
          name: 'idx_cea_tenant',
          transaction: t,
        }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable('curriculum_elective_assignment');
  },
};

