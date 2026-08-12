'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('examination_session_eligibility', {
      examination_session_eligibility_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'university',
          key: 'university_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      acedmic_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'student_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      examination_session_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'examination_session',
          key: 'examination_session_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('READY', 'REVIEW', 'BLOCKED', 'APPROVED'),
        allowNull: false,
        defaultValue: 'REVIEW'
      },
      review_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      blocked_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      blocked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. Composite Unique Constraint
    await queryInterface.addIndex('examination_session_eligibility', {
      fields: ['student_id', 'examination_session_id'],
      unique: true,
      name: 'idx_unique_exam_session_student_eligibility'
    });

    // 3. Add Useful Indexes
    await queryInterface.addIndex('examination_session_eligibility', {
      fields: ['student_id'],
      name: 'idx_exam_eligibility_student_id'
    });

    await queryInterface.addIndex('examination_session_eligibility', {
      fields: ['examination_session_id'],
      name: 'idx_exam_eligibility_session_id'
    });

    await queryInterface.addIndex('examination_session_eligibility', {
      fields: ['status'],
      name: 'idx_exam_eligibility_status'
    });

    await queryInterface.addIndex('examination_session_eligibility', {
      fields: ['examination_session_id', 'status'],
      name: 'idx_exam_eligibility_session_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('examination_session_eligibility');
    
    // Cleanup MySQL ENUM type if necessary (Sequelize doesn't auto-drop ENUMs in some dialects, but dropTable usually handles it in MySQL unless it's Postgres)
  }
};
