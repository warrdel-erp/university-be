'use strict';

/**
 * Migration:
 * 1. Recreate department triggers if broken definer exists.
 * 2. Ensure is_default column exists on department table.
 * 3. Fix legacy department_type for Admin departments if mislabeled.
 * 4. Ensure default departments ("Admin" and "Academic") exist for each institute with is_default = true.
 * 5. Backfill existing default departments to is_default = true.
 * 6. Backfill courses where department_id IS NULL or wrongly mapped to Admin.
 * 7. Backfill employees where department_id IS NULL by linking to the institute's default department (Teachers -> Academic, Admin -> Admin).
 * 8. Alter course.department_id to NOT NULL (handling fk_course_department_id constraint).
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) =>
    typeof t === 'string' ? t : t.tableName || t.name || String(t)
  );
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) return false;
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

async function fixDepartmentTriggersIfBroken(queryInterface) {
  try {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS \`trg_department_no_self_parent_insert\``);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`trg_department_no_self_parent_insert\`
      BEFORE INSERT ON department
      FOR EACH ROW
      BEGIN
        IF NEW.parent_department_id IS NOT NULL
           AND NEW.department_id IS NOT NULL
           AND NEW.parent_department_id = NEW.department_id THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Department cannot be its own parent';
        END IF;
      END
    `);

    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS \`trg_department_no_self_parent_update\``);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`trg_department_no_self_parent_update\`
      BEFORE UPDATE ON department
      FOR EACH ROW
      BEGIN
        IF NEW.parent_department_id IS NOT NULL
           AND NEW.parent_department_id = NEW.department_id THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Department cannot be its own parent';
        END IF;
      END
    `);
  } catch (err) {
    console.warn('Note on triggers recreation:', err.message);
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (
      !(await tableExists(queryInterface, 'department')) ||
      !(await tableExists(queryInterface, 'course')) ||
      !(await tableExists(queryInterface, 'institute'))
    ) {
      return;
    }

    // 0. Ensure triggers have valid definer so INSERT on department succeeds
    await fixDepartmentTriggersIfBroken(queryInterface);

    // 1. Ensure is_default column exists in department table
    const hasIsDefault = await columnExists(queryInterface, 'department', 'is_default');
    if (!hasIsDefault) {
      await queryInterface.addColumn('department', 'is_default', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // 2. Get default user for created_by / updated_by
    const [userRows] = await queryInterface.sequelize.query(
      `SELECT MIN(user_id) AS userId FROM users`
    );
    const defaultUserId = Number(userRows[0]?.userId) || 1;

    // 3. Fix legacy mislabeled Admin departments
    await queryInterface.sequelize.query(
      `UPDATE department SET department_type = 'Admin' WHERE department_name = 'Admin' AND department_type != 'Admin'`
    );

    // 4. Fetch all institutes
    const [institutes] = await queryInterface.sequelize.query(
      `SELECT institute_id, institute_name, university_id FROM institute WHERE deleted_at IS NULL`
    );

    // 5. For each institute, ensure "Admin" and "Academic" default departments exist with is_default = true
    for (const inst of institutes) {
      const instituteId = inst.institute_id;
      const universityId = inst.university_id;

      // Check Academic department
      const [academicDepts] = await queryInterface.sequelize.query(
        `
        SELECT department_id 
        FROM department 
        WHERE institute_id = :instituteId 
          AND department_name NOT LIKE '%Admin%'
          AND (department_type = 'Academic' OR department_name IN ('Academic', 'Academics'))
        ORDER BY (CASE WHEN department_name IN ('Academic', 'Academics') THEN 1 ELSE 2 END), department_id ASC
        LIMIT 1
        `,
        { replacements: { instituteId } }
      );

      if (academicDepts.length === 0) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO department (
            department_name, department_code, department_type, description, is_default,
            university_id, institute_id, created_by, updated_by, created_at, updated_at
          ) VALUES (
            'Academic', 'ACAD', 'Academic', 'Default Academic Department', true,
            :universityId, :instituteId, :userId, :userId, NOW(), NOW()
          )
          `,
          {
            replacements: {
              universityId,
              instituteId,
              userId: defaultUserId,
            },
          }
        );
      }

      // Check Admin department
      const [adminDepts] = await queryInterface.sequelize.query(
        `
        SELECT department_id 
        FROM department 
        WHERE institute_id = :instituteId 
          AND (department_type = 'Admin' OR department_name = 'Admin')
        LIMIT 1
        `,
        { replacements: { instituteId } }
      );

      if (adminDepts.length === 0) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO department (
            department_name, department_code, department_type, description, is_default,
            university_id, institute_id, created_by, updated_by, created_at, updated_at
          ) VALUES (
            'Admin', 'ADMIN', 'Admin', 'Default Administrative Department', true,
            :universityId, :instituteId, :userId, :userId, NOW(), NOW()
          )
          `,
          {
            replacements: {
              universityId,
              instituteId,
              userId: defaultUserId,
            },
          }
        );
      }
    }

    // 6. Backfill all default departments to have is_default = true
    await queryInterface.sequelize.query(`
      UPDATE \`department\`
      SET \`is_default\` = true
      WHERE \`department_name\` IN ('Admin', 'Academic', 'Academics')
         OR \`department_code\` IN ('ADMIN', 'ACAD')
    `);

    // 7. Backfill course.department_id for any course where department_id IS NULL or was mapped to an Admin dept
    await queryInterface.sequelize.query(`
      UPDATE course c
      INNER JOIN department d_old ON d_old.department_id = c.department_id
      INNER JOIN (
        SELECT institute_id, MIN(department_id) AS academic_dept_id
        FROM department
        WHERE department_name NOT LIKE '%Admin%'
          AND (department_type = 'Academic' OR department_name IN ('Academic', 'Academics'))
        GROUP BY institute_id
      ) d_new ON d_new.institute_id = c.institute_id
      SET c.department_id = d_new.academic_dept_id
      WHERE d_old.department_name = 'Admin' OR d_old.department_type = 'Admin'
    `);

    await queryInterface.sequelize.query(`
      UPDATE course c
      INNER JOIN (
        SELECT institute_id, MIN(department_id) AS academic_dept_id
        FROM department
        WHERE department_name NOT LIKE '%Admin%'
          AND (department_type = 'Academic' OR department_name IN ('Academic', 'Academics'))
        GROUP BY institute_id
      ) d ON d.institute_id = c.institute_id
      SET c.department_id = d.academic_dept_id
      WHERE c.department_id IS NULL
    `);

    // In case any course has institute_id without department, fallback to any available Academic department
    const [fallbackAcademic] = await queryInterface.sequelize.query(`
      SELECT MIN(department_id) AS fallbackId
      FROM department
      WHERE department_name NOT LIKE '%Admin%'
        AND (department_type = 'Academic' OR department_name IN ('Academic', 'Academics'))
    `);
    const fallbackAcademicId = fallbackAcademic[0]?.fallbackId;
    if (fallbackAcademicId) {
      await queryInterface.sequelize.query(
        `UPDATE course SET department_id = :fallbackAcademicId WHERE department_id IS NULL`,
        { replacements: { fallbackAcademicId } }
      );
    }

    // 8. Backfill employee.department_id where department_id IS NULL
    if (await tableExists(queryInterface, 'employee')) {
      // 8a. Teachers / Faculty -> map to institute's Academic department
      await queryInterface.sequelize.query(`
        UPDATE employee e
        LEFT JOIN role r ON e.role_id = r.role_id
        INNER JOIN (
          SELECT institute_id, MIN(department_id) AS academic_dept_id
          FROM department
          WHERE department_name NOT LIKE '%Admin%'
            AND (department_type = 'Academic' OR department_name IN ('Academic', 'Academics'))
          GROUP BY institute_id
        ) d ON d.institute_id = e.institute_id
        SET e.department_id = d.academic_dept_id
        WHERE e.department_id IS NULL
          AND (r.role LIKE '%Teacher%' OR r.role LIKE '%Faculty%' OR r.role LIKE '%Professor%')
      `);

      // 8b. Admin role -> map to institute's Admin department
      await queryInterface.sequelize.query(`
        UPDATE employee e
        LEFT JOIN role r ON e.role_id = r.role_id
        INNER JOIN (
          SELECT institute_id, MIN(department_id) AS admin_dept_id
          FROM department
          WHERE department_type = 'Admin' OR department_name = 'Admin'
          GROUP BY institute_id
        ) d ON d.institute_id = e.institute_id
        SET e.department_id = d.admin_dept_id
        WHERE e.department_id IS NULL
          AND r.role LIKE '%Admin%'
      `);

      // 8c. Any remaining employees with NULL department -> map to institute's Academic department
      await queryInterface.sequelize.query(`
        UPDATE employee e
        INNER JOIN (
          SELECT institute_id, MIN(department_id) AS default_dept_id
          FROM department
          WHERE department_name NOT LIKE '%Admin%'
            AND (department_type = 'Academic' OR department_name IN ('Academic', 'Academics'))
          GROUP BY institute_id
        ) d ON d.institute_id = e.institute_id
        SET e.department_id = d.default_dept_id
        WHERE e.department_id IS NULL
      `);
    }

    // 9. Verify and alter course.department_id to NOT NULL
    // In MySQL, if foreign key was created with 'ON DELETE SET NULL', MySQL forbids NOT NULL.
    // We update the foreign key constraint to 'ON UPDATE CASCADE ON DELETE RESTRICT'.
    const [[nullCheck]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS nullCount FROM course WHERE department_id IS NULL`
    );

    if (Number(nullCheck.nullCount) === 0) {
      // Check if fk_course_department_id exists
      const [fkRows] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'course'
          AND COLUMN_NAME = 'department_id'
          AND REFERENCED_TABLE_NAME = 'department'
      `);

      for (const fk of fkRows) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`course\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE \`course\` MODIFY COLUMN \`department_id\` INT NOT NULL`
      );

      await queryInterface.sequelize.query(`
        ALTER TABLE \`course\`
        ADD CONSTRAINT \`fk_course_department_id\`
        FOREIGN KEY (\`department_id\`) REFERENCES \`department\` (\`department_id\`)
        ON UPDATE CASCADE ON DELETE RESTRICT
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'course')) {
      const [fkRows] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'course'
          AND COLUMN_NAME = 'department_id'
          AND REFERENCED_TABLE_NAME = 'department'
      `);

      for (const fk of fkRows) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`course\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE \`course\` MODIFY COLUMN \`department_id\` INT NULL`
      );

      await queryInterface.sequelize.query(`
        ALTER TABLE \`course\`
        ADD CONSTRAINT \`fk_course_department_id\`
        FOREIGN KEY (\`department_id\`) REFERENCES \`department\` (\`department_id\`)
        ON UPDATE CASCADE ON DELETE SET NULL
      `);
    }

    if (await columnExists(queryInterface, 'department', 'is_default')) {
      await queryInterface.removeColumn('department', 'is_default');
    }
  },
};
