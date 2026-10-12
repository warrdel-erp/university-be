import sequelize from "./database/sequelizeConfig.js";

async function run() {
  try {
    const query = `
      SELECT r.role_id, r.role, derived.valid_university_id
      FROM role r
      JOIN (
        SELECT rp.role_id, 
               MAX(COALESCE(u1.university_id, u2.university_id, u3.university_id)) as valid_university_id
        FROM role_permissions rp
        LEFT JOIN university u1 ON rp.scope = 'UNIVERSITY' AND u1.university_id = rp.resource_id
        LEFT JOIN institute i ON rp.scope = 'INSTITUTE' AND rp.resource_id = i.institute_id
        LEFT JOIN university u2 ON u2.university_id = i.university_id
        LEFT JOIN campus c ON rp.scope = 'CAMPUS' AND rp.resource_id = c.campus_id
        LEFT JOIN university u3 ON u3.university_id = c.university_id
        WHERE (u1.university_id IS NOT NULL OR u2.university_id IS NOT NULL OR u3.university_id IS NOT NULL)
          AND rp.permission = 'perm_access_inst'
        GROUP BY rp.role_id
      ) derived ON r.role_id = derived.role_id
      WHERE r.university_id IS NULL;
    `;
    const data = await sequelize.query(query);
    console.log("Derived properly:", data[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();
