module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create tables
      await queryInterface.createTable('curriculum', {
        curriculum_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        course_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'course', key: 'course_id' }
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'university', key: 'university_id' }
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' }
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'user_id' }
        }
      }, { transaction });

      await queryInterface.createTable('curriculum_subject_term_mapping', {
        curriculum_subject_term_mapping_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        curriculum_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'curriculum', key: 'curriculum_id' }
        },
        subject_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'subject', key: 'subject_id' }
        },
        term: {
          type: Sequelize.INTEGER,
          allowNull: false
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
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'user_id' }
        }
      }, { transaction });

      await queryInterface.createTable('curriculum_batch_mapping', {
        curriculum_batch_mapping_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        curriculum_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'curriculum', key: 'curriculum_id' }
        },
        batch: {
          type: Sequelize.INTEGER,
          allowNull: false
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
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'user_id' }
        }
      }, { transaction });

      // 2. Data Migration

      // 2.1 Get max active academic year info
      const [ayResults] = await queryInterface.sequelize.query(
        "SELECT acedmic_year_id, year_title FROM acedmic_year WHERE deleted_at IS NULL AND is_active = 1 ORDER BY acedmic_year_id DESC LIMIT 1",
        { transaction }
      );
      
      if (ayResults.length === 0) {
        throw new Error("Migration failed: No active academic year found.");
      }

      const activeAy = ayResults[0];
      const maxAcedmicYearId = activeAy.acedmic_year_id;
      
      // Parse year from year_title (e.g. '2026-2027' -> 2026)
      const titleMatch = activeAy.year_title ? activeAy.year_title.match(/^(\d{4})/) : null;
      if (!titleMatch) {
        throw new Error(`Migration failed: Could not parse starting year from year_title '${activeAy.year_title}'.`);
      }
      const maxYear = parseInt(titleMatch[1], 10);

      // 2.2 Find foreign key references to subject.subject_id dynamically
      const [fkResults] = await queryInterface.sequelize.query(
        `SELECT TABLE_NAME, COLUMN_NAME 
         FROM information_schema.KEY_COLUMN_USAGE 
         WHERE REFERENCED_TABLE_NAME = 'subject' 
           AND REFERENCED_COLUMN_NAME = 'subject_id' 
           AND TABLE_SCHEMA = DATABASE()`,
        { transaction }
      );

      // 2.3 Deduplicate subjects
      // Get all subjects
      const [subjects] = await queryInterface.sequelize.query(
        "SELECT * FROM subject WHERE deleted_at IS NULL",
        { transaction }
      );

      const groupedSubjects = {};
      for (const sub of subjects) {
        const key = `${sub.course_id}_${sub.subject_code}`;
        if (!groupedSubjects[key]) groupedSubjects[key] = [];
        groupedSubjects[key].push(sub);
      }

      for (const key in groupedSubjects) {
        const subs = groupedSubjects[key];
        if (subs.length > 1) {
          // Find the one with max acedmic_year_id
          subs.sort((a, b) => b.acedmic_year_id - a.acedmic_year_id);
          const master = subs[0];
          const duplicates = subs.slice(1);

          for (const dup of duplicates) {
            // Update foreign keys
            for (const fk of fkResults) {
              const tableName = fk.TABLE_NAME;
              const columnName = fk.COLUMN_NAME;
              // Avoid updating curriculum tables since they are just created and empty
              if (tableName.startsWith('curriculum')) continue;

              await queryInterface.sequelize.query(
                `UPDATE ${tableName} SET ${columnName} = ? WHERE ${columnName} = ?`,
                { replacements: [master.subject_id, dup.subject_id], transaction }
              );
            }
            // Delete duplicate subject
            await queryInterface.sequelize.query(
              `DELETE FROM subject WHERE subject_id = ?`,
              { replacements: [dup.subject_id], transaction }
            );
          }
        }
      }

      // 2.4 Create Curriculum and Mappings
      const [courses] = await queryInterface.sequelize.query(
        "SELECT * FROM course WHERE deleted_at IS NULL",
        { transaction }
      );

      // Get deduped subjects
      const [dedupedSubjects] = await queryInterface.sequelize.query(
        "SELECT * FROM subject WHERE deleted_at IS NULL",
        { transaction }
      );

      for (const course of courses) {
        // total years logic
        let termsPerYear = 2; // Default Semester
        if (course.term_type) {
          const tType = course.term_type.toLowerCase();
          if (tType.includes('quar')) termsPerYear = 4;
          else if (tType.includes('tri')) termsPerYear = 3;
          else if (tType.includes('annual')) termsPerYear = 1;
        }

        const totalYears = course.course_duration || 1;
        const totalTerms = course.total_terms || (totalYears * termsPerYear);

        const courseSubjects = dedupedSubjects.filter(s => s.course_id === course.course_id);

        for (let year = 1; year <= totalYears; year++) {
          const batch = maxYear - (year - 1);
          
          // terms for this year
          const yearTerms = [];
          for (let t = 1; t <= termsPerYear; t++) {
            const termNum = (year - 1) * termsPerYear + t;
            if (termNum <= totalTerms) {
              yearTerms.push(termNum);
            }
          }

          const subjectsForYear = courseSubjects.filter(s => yearTerms.includes(s.term));
          
          if (subjectsForYear.length > 0) {
            // Create Curriculum
            const currName = `Curriculum ${course.course_code || course.course_name} - Batch ${batch}`;
            const [curriculumIdResult] = await queryInterface.sequelize.query(
              `INSERT INTO curriculum (name, course_id, university_id, institute_id, created_at, updated_at) 
               VALUES (?, ?, ?, ?, NOW(), NOW())`,
              { 
                replacements: [currName, course.course_id, course.university_id, course.institute_id],
                transaction 
              }
            );
            const currId = curriculumIdResult;

            // Map Batch
            await queryInterface.sequelize.query(
              `INSERT INTO curriculum_batch_mapping (curriculum_id, batch, created_at, updated_at)
               VALUES (?, ?, NOW(), NOW())`,
              { replacements: [currId, batch], transaction }
            );

            // Map Subjects
            for (const sub of subjectsForYear) {
              await queryInterface.sequelize.query(
                `INSERT INTO curriculum_subject_term_mapping (curriculum_id, subject_id, term, created_at, updated_at)
                 VALUES (?, ?, ?, NOW(), NOW())`,
                { replacements: [currId, sub.subject_id, sub.term], transaction }
              );
            }
          }
        }
      }

      // 2.5 Remove academic_year from subject model
      // But wait, user said "at last remove academic year from remaining subjects".
      // Let's drop the column if it exists or set it to null if we don't want to drop it yet.
      // Dropping column:
      await queryInterface.removeColumn('subject', 'acedmic_year_id', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('curriculum_batch_mapping');
    await queryInterface.dropTable('curriculum_subject_term_mapping');
    await queryInterface.dropTable('curriculum');
    // Note: Reversing data migration and adding acedmic_year_id back is complex, 
    // down migration is typically destructive for the new tables.
    await queryInterface.addColumn('subject', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
