'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Drop foreign keys on academic_regulation_course_mapping for course_id and session_id
      const [mappingFks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'academic_regulation_course_mapping'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME IN ('course_id', 'session_id')
           AND REFERENCED_TABLE_NAME IS NOT NULL;`,
        { transaction }
      );

      for (const fk of mappingFks) {
        try {
          await queryInterface.removeConstraint('academic_regulation_course_mapping', fk.CONSTRAINT_NAME, { transaction });
          console.log(`Dropped FK constraint: ${fk.CONSTRAINT_NAME}`);
        } catch (err) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }

      // 2. Drop indexes that include course_id or session_id
      const [mappingIndexes] = await queryInterface.sequelize.query(
        `SHOW INDEXES FROM academic_regulation_course_mapping WHERE Key_name NOT IN ('PRIMARY');`,
        { transaction }
      );

      const indexNamesToDrop = new Set();
      for (const idx of mappingIndexes) {
        if (['course_id', 'session_id'].includes(idx.Column_name)) {
          indexNamesToDrop.add(idx.Key_name);
        }
      }

      for (const indexName of indexNamesToDrop) {
        try {
          await queryInterface.removeIndex('academic_regulation_course_mapping', indexName, { transaction });
          console.log(`Dropped index: ${indexName}`);
        } catch (err) {
          console.log(`Could not drop index ${indexName}:`, err.message);
        }
      }

      // 3. Drop course_id and session_id columns from academic_regulation_course_mapping
      const mappingTableDesc = await queryInterface.describeTable('academic_regulation_course_mapping', { transaction }).catch(() => ({}));

      if (mappingTableDesc.course_id) {
        await queryInterface.removeColumn('academic_regulation_course_mapping', 'course_id', { transaction });
        console.log('Dropped column course_id from academic_regulation_course_mapping');
      }

      if (mappingTableDesc.session_id) {
        await queryInterface.removeColumn('academic_regulation_course_mapping', 'session_id', { transaction });
        console.log('Dropped column session_id from academic_regulation_course_mapping');
      }

      // 4. Ensure unique composite index on (academic_regulation_id, batch_id) to prevent duplicate pairs
      try {
        await queryInterface.addIndex(
          'academic_regulation_course_mapping',
          ['academic_regulation_id', 'batch_id'],
          {
            unique: true,
            name: 'unique_regulation_batch',
            transaction,
          }
        );
        console.log('Added unique index unique_regulation_batch');
      } catch (err) {
        console.log('Unique index note:', err.message);
      }

      // 5. Drop acedmic_year_id from academic_regulation
      const [regFks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'academic_regulation'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME = 'acedmic_year_id'
           AND REFERENCED_TABLE_NAME IS NOT NULL;`,
        { transaction }
      );

      for (const fk of regFks) {
        try {
          await queryInterface.removeConstraint('academic_regulation', fk.CONSTRAINT_NAME, { transaction });
          console.log(`Dropped FK constraint on academic_regulation: ${fk.CONSTRAINT_NAME}`);
        } catch (err) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }

      const regTableDesc = await queryInterface.describeTable('academic_regulation', { transaction }).catch(() => ({}));
      if (regTableDesc.acedmic_year_id) {
        await queryInterface.removeColumn('academic_regulation', 'acedmic_year_id', { transaction });
        console.log('Dropped column acedmic_year_id from academic_regulation');
      }

      await transaction.commit();
      console.log('Removal migration completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const mappingTableDesc = await queryInterface.describeTable('academic_regulation_course_mapping', { transaction }).catch(() => ({}));

      if (!mappingTableDesc.course_id) {
        await queryInterface.addColumn('academic_regulation_course_mapping', 'course_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      if (!mappingTableDesc.session_id) {
        await queryInterface.addColumn('academic_regulation_course_mapping', 'session_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      const regTableDesc = await queryInterface.describeTable('academic_regulation', { transaction }).catch(() => ({}));
      if (!regTableDesc.acedmic_year_id) {
        await queryInterface.addColumn('academic_regulation', 'acedmic_year_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
