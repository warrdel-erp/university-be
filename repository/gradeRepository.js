import * as model from "../models/index.js";

/* =========================
   GRADE
========================= */

export async function addGrade(data, transaction) {
  try {
    return await model.gradeModel.create(data, { transaction });
  } catch (error) {
    console.error("Repository Error - addGrade:", error.message);
    throw new Error("Unable to create grade scheme");
  }
}

export async function updateGrade(gradeId, data, transaction) {
  try {
    return await model.gradeModel.update(
      data,
      { where: { gradeId }, transaction }
    );
  } catch (error) {
    console.error("Repository Error - updateGrade:", error.message);
    throw new Error("Unable to update grade scheme");
  }
}

export async function getAllGrades(universityId, instituteId, role) {
  try {
    return await model.gradeModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","updatedBy","createdBy"] },
      where: {
        ...(universityId && { universityId }),
        ...(role === "Head" && { instituteId })
      },

      include: [
       
        // {
        //   model: model.gradeScaleModel,
        //   as: "scales"
        // },
        {
          model: model.gradeCourseModel,
          as: "coursesGrade",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","updatedBy","createdBy"] },
          include: [
            // {
            //   model: model.gradePassFailModel,
            //   as: "passFail"
            // },

            {
              model: model.courseModel,
              as: "Allcourse",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","updatedBy","createdBy"] },
            },

            // {
            //   model: model.sessionModel,
            //   as: "sessions"
            // },

            // {
            //   model: model.acedmicYearModel,
            //   as: "academicYear"
            // }
          ]
        }
      ]
    });
  } catch (error) {
    console.error("Repository Error - getAllGrades:", error.message);
    throw new Error("Unable to fetch grade schemes");
  }
}


export async function getSingleGrade(gradeId) {
  try {
    return await model.gradeModel.findOne({
      where: { gradeId },

      include: [
        {
          model: model.gradeScaleModel,
          as: "scales"
        },

        {
          model: model.gradeCourseModel,
          as: "coursesGrade",
          include: [
            {
              model: model.gradePassFailModel,
              as: "passFail"
            },

            {
              model: model.courseModel,
              as: "Allcourse",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","updatedBy","createdBy"] },
            },

            {
              model: model.sessionModel,
              as: "sessions",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","updatedBy","createdBy"] },

            },

            {
              model: model.acedmicYearModel,
              as: "academicYear",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","updatedBy","createdBy"] },
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error("Repository Error - getSingleGradeScheme:", error.message);
    throw new Error("Unable to fetch grade scheme details");
  }
}


export async function deleteGrade(gradeId) {
  try {
    return await model.gradeModel.destroy({ where: { gradeId } });
  } catch (error) {
    throw new Error("Unable to delete grade scheme");
  }
}

/* =========================
   GRADE SCALE
========================= */

export async function deleteGradeScalesByGradeId(gradeId, transaction) {
  try {
    return await model.gradeScaleModel.destroy({
      where: { gradeId },
      transaction
    });
  } catch (error) {
    throw new Error("Unable to delete grade scales");
  }
}

export async function addGradeScales(data, transaction) {
  try {
    return await model.gradeScaleModel.bulkCreate(data, { transaction });
  } catch (error) {
    console.error("Repository Error - addGradeScales:", error.message);
    throw new Error("Unable to add grade scales");
  }
}

/* =========================
   GRADE COURSE
========================= */

export async function addGradeCourse(data, transaction) {
  try {
    return await model.gradeCourseModel.create(data, { transaction });
  } catch (error) {
    console.error("Repository Error - addGradeCourse:", error.message);
    throw new Error("Unable to add grade course");
  }
}

/* =========================
   GRADE PASS FAIL
========================= */

export async function addGradePassFail(data, transaction) {
  try {
    return await model.gradePassFailModel.bulkCreate(data, { transaction });
  } catch (error) {
    console.error("Repository Error - addGradePassFail:", error.message);
    throw new Error("Unable to add pass/fail rules");
  }
};