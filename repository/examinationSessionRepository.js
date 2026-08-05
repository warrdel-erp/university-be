import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createExaminationSession(sessionData, options = {}) {
  const { classSectionTerms, ...mainData } = sessionData;

  if (mainData.assessmentTypeId) {
    const existing = await scoped(model.examinationSessionModel).findOne({
      where: { assessmentTypeId: Number(mainData.assessmentTypeId) },
      transaction: options.transaction,
    });

    if (existing) {
      const error = new Error("An examination session for this assessment type already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  const record = await scoped(model.examinationSessionModel).create(mainData, options);

  if (Array.isArray(classSectionTerms) && classSectionTerms.length > 0) {
    const termIds = classSectionTerms.map((t) => Number(t.classSectionTermId)).filter(Boolean);
    if (termIds.length > 0) {
      const validTerms = await model.classSectionTermModel.findAll({
        where: { classSectionTermId: { [Op.in]: termIds } },
        attributes: ["classSectionTermId"],
        raw: true,
        transaction: options.transaction,
      });
      const validTermSet = new Set(validTerms.map((vt) => vt.classSectionTermId));
      const invalidTerm = termIds.find((id) => !validTermSet.has(id));
      if (invalidTerm !== undefined) {
        const error = new Error(`The selected class section term (ID: ${invalidTerm}) is invalid or does not exist.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const termsToCreate = classSectionTerms.map((term) => ({
      ...term,
      examinationSessionId: record.examinationSessionId,
    }));

    await Promise.all(
      termsToCreate.map((t) =>
        model.examinationSessionTermModel.create(t, { transaction: options.transaction })
      )
    );
  }

  return await getExaminationSessionById(record.examinationSessionId, options);
}

export async function getExaminationSessions({
  search,
  status,
  academicYearId,
  assessmentTypeId,
  universityId,
  instituteId,
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) where.status = status;
  if (academicYearId) where.academicYearId = Number(academicYearId);
  if (assessmentTypeId) where.assessmentTypeId = Number(assessmentTypeId);
  if (universityId) where.universityId = Number(universityId);
  if (instituteId) where.instituteId = Number(instituteId);

  if (search) {
    where.sessionName = { [Op.like]: `%${search}%` };
  }

  const { count, rows } = await scoped(model.examinationSessionModel).findAndCountAll({
    where,
    include: [
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.examSetupTypeModel,
        as: "assessmentType",
        attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
        required: false,
      },
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        include: [
          {
            model: model.classSectionTermModel,
            as: "classSectionTerm",
            attributes: ["classSectionTermId", "classSectionsId", "term"],
            required: false,
          },
        ],
        required: false,
      },
    ],
    distinct: true,
    order: [["examinationSessionId", "DESC"]],
    limit: limitNum,
    offset,
  });

  const formattedRows = await Promise.all(
    rows.map(async (row) => {
      const sessionPlain = row.get({ plain: true });

      // 1. Calculate courseCount, totalStudents, and subjectCount from mapped classSectionTerms
      let courseCount = 0;
      let totalStudents = 0;
      const termsList = sessionPlain.examinationSessionTerms || [];
      const cstIds = [...new Set(termsList.map((t) => t.classSectionTermId).filter(Boolean))];

      if (cstIds.length > 0) {
        const cstRecords = await model.classSectionTermModel.findAll({
          where: { classSectionTermId: { [Op.in]: cstIds } },
          attributes: ["classSectionsId", "term"],
          raw: true,
        });

        const csIds = [...new Set(cstRecords.map((cst) => cst.classSectionsId).filter(Boolean))];
        let courseIds = [];
        if (csIds.length > 0) {
          const csRecords = await model.classSectionModel.findAll({
            where: { classSectionsId: { [Op.in]: csIds } },
            attributes: ["courseId"],
            raw: true,
          });

          courseIds = [...new Set(csRecords.map((cs) => cs.courseId).filter(Boolean))];
          courseCount = courseIds.length;
        }

        const studentWhere = [];
        if (cstIds.length > 0) studentWhere.push({ classSectionTermId: { [Op.in]: cstIds } });
        if (csIds.length > 0) studentWhere.push({ classSectionsId: { [Op.in]: csIds } });

        totalStudents = await model.studentClassSectionsHistoryModel.count({
          where: { [Op.or]: studentWhere },
        });
      }

      return {
        ...sessionPlain,
        courseCount,
        totalStudents,
      };
    })
  );

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: formattedRows,
  };
}

export async function getExaminationSessionById(id, options = {}) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return null;

  const sessionRecord = await scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: parsedId },
    include: [
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.examSetupTypeModel,
        as: "assessmentType",
        attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
        required: false,
      },
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        include: [
          {
            model: model.classSectionTermModel,
            as: "classSectionTerm",
            attributes: ["classSectionTermId", "classSectionsId", "term"],
            required: false,
          },
        ],
        required: false,
      },
    ],
    transaction: options.transaction,
  });

  if (!sessionRecord) return null;

  const sessionPlain = sessionRecord.get({ plain: true });

  // 1. Calculate courseCount, totalStudents, and subjectCount from mapped classSectionTerms
  let courseCount = 0;
  let totalStudents = 0;
  const termsList = sessionPlain.examinationSessionTerms || [];
  const cstIds = [...new Set(termsList.map((t) => t.classSectionTermId).filter(Boolean))];

  if (cstIds.length > 0) {
    const cstRecords = await model.classSectionTermModel.findAll({
      where: { classSectionTermId: { [Op.in]: cstIds } },
      attributes: ["classSectionsId", "term"],
      raw: true,
      transaction: options.transaction,
    });

    const csIds = [...new Set(cstRecords.map((cst) => cst.classSectionsId).filter(Boolean))];
    let courseIds = [];
    if (csIds.length > 0) {
      const csRecords = await model.classSectionModel.findAll({
        where: { classSectionsId: { [Op.in]: csIds } },
        attributes: ["courseId"],
        raw: true,
        transaction: options.transaction,
      });

      courseIds = [...new Set(csRecords.map((cs) => cs.courseId).filter(Boolean))];
      courseCount = courseIds.length;
    }

    const studentWhere = [];
    if (cstIds.length > 0) studentWhere.push({ classSectionTermId: { [Op.in]: cstIds } });
    if (csIds.length > 0) studentWhere.push({ classSectionsId: { [Op.in]: csIds } });

    totalStudents = await model.studentClassSectionsHistoryModel.count({
      where: { [Op.or]: studentWhere },
      transaction: options.transaction,
    });

  }

  return {
    ...sessionPlain,
    courseCount,
    totalStudents,
  };
}

export async function updateExaminationSession(id, updateData = {}, options = {}) {
  const sessionId = Number(id);
  const { classSectionTerms, ...mainUpdateData } = updateData;

  if (mainUpdateData.assessmentTypeId) {
    const existing = await scoped(model.examinationSessionModel).findOne({
      where: {
        assessmentTypeId: Number(mainUpdateData.assessmentTypeId),
        examinationSessionId: { [Op.ne]: sessionId },
      },
      transaction: options.transaction,
    });

    if (existing) {
      const error = new Error("An examination session for this assessment type already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (Object.keys(mainUpdateData).length > 0) {
    await scoped(model.examinationSessionModel).update(mainUpdateData, {
      where: { examinationSessionId: sessionId },
      transaction: options.transaction,
    });
  }

  if (Array.isArray(classSectionTerms)) {
    await model.examinationSessionTermModel.destroy({
      where: { examinationSessionId: sessionId },
      transaction: options.transaction,
    });

    if (classSectionTerms.length > 0) {
      const termsToCreate = classSectionTerms.map((t) => ({
        ...t,
        examinationSessionId: sessionId,
      }));

      await model.examinationSessionTermModel.bulkCreate(termsToCreate, {
        transaction: options.transaction,
      });
    }
  }

  return await getExaminationSessionById(sessionId, options);
}

export async function deleteExaminationSession(id, options = {}) {
  const sessionId = Number(id);
  const existing = await scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: sessionId },
    transaction: options.transaction,
  });

  if (!existing) return null;

  await scoped(model.examinationSessionModel).destroy({
    where: { examinationSessionId: sessionId },
    transaction: options.transaction,
  });

  return { message: "Examination session deleted successfully" };
}

// examination_session_term specific CRUD operations

export async function createExaminationSessionTerm(termData, options = {}) {
  if (termData.classSectionTermId) {
    const termExists = await model.classSectionTermModel.findByPk(Number(termData.classSectionTermId), {
      transaction: options.transaction,
    });
    if (!termExists) {
      const error = new Error(`The selected class section term (ID: ${termData.classSectionTermId}) is invalid or does not exist.`);
      error.statusCode = 400;
      throw error;
    }
  }
  return await model.examinationSessionTermModel.create(termData, options);
}

export async function deleteExaminationSessionTerm(examinationSessionTermId, options = {}) {
  const existing = await model.examinationSessionTermModel.findOne({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    transaction: options.transaction,
  });

  if (!existing) return null;

  await model.examinationSessionTermModel.destroy({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    transaction: options.transaction,
  });

  return { message: "Examination session term mapping deleted successfully" };
}

export async function getClassSectionTermsBySetupType(examSetupTypeId, options = {}) {
  let setupTypeId = Number(examSetupTypeId);

  if (!setupTypeId && options.examinationSessionId) {
    const sessionRecord = await scoped(model.examinationSessionModel).findOne({
      where: { examinationSessionId: Number(options.examinationSessionId) },
      attributes: ["assessmentTypeId"],
      transaction: options.transaction,
    });
    if (sessionRecord && sessionRecord.assessmentTypeId) {
      setupTypeId = Number(sessionRecord.assessmentTypeId);
    }
  }

  if (!setupTypeId) {
    return [];
  }

  // 1. Fetch assessmentPlanIds from assessment_plan_component for examSetupTypeId
  const components = await scoped(model.assessmentPlanComponentModel).findAll({
    where: { examSetupTypeId: setupTypeId },
    attributes: ["assessmentPlanId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!components || components.length === 0) {
    return [];
  }

  const planIds = [...new Set(components.map((c) => c.assessmentPlanId).filter(Boolean))];
  if (planIds.length === 0) {
    return [];
  }

  // 2. Fetch subjectIds from assessment_plan_subject_mapping for these assessmentPlanIds
  const subjectMappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: { assessmentPlanId: { [Op.in]: planIds } },
    attributes: ["subjectId", "courseId", "sessionId", "academicYearId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!subjectMappings || subjectMappings.length === 0) {
    return [];
  }

  const subjectIds = [...new Set(subjectMappings.map((m) => m.subjectId).filter(Boolean))];
  if (subjectIds.length === 0) {
    return [];
  }

  // 3. Fetch subjects details
  const subjects = await scoped(model.subjectModel).findAll({
    where: { subjectId: { [Op.in]: subjectIds } },
    attributes: ["subjectId", "subjectName", "subjectCode", "courseId", "term"],
    raw: true,
    transaction: options.transaction,
  });

  const subjectMap = new Map(subjects.map((s) => [s.subjectId, s]));

  // 4. Create distinct groups for (courseId + sessionId)
  const courseSessionMap = new Map();

  for (const mapping of subjectMappings) {
    const cId = mapping.courseId;
    const sId = mapping.sessionId;
    if (!cId) continue;
    const sub = subjectMap.get(mapping.subjectId);
    if (!sub) continue;

    const key = `${cId}_${sId || 0}`;
    if (!courseSessionMap.has(key)) {
      courseSessionMap.set(key, {
        courseId: cId,
        sessionId: sId || null,
        academicYearId: mapping.academicYearId || null,
        subjectIds: new Set(),
        terms: new Set(),
      });
    }

    const group = courseSessionMap.get(key);
    group.subjectIds.add(mapping.subjectId);
    if (sub.term != null) {
      group.terms.add(sub.term);
    }
  }

  const groupKeys = [...courseSessionMap.keys()];
  if (groupKeys.length === 0) {
    return [];
  }

  // 5. Fetch course and session details
  const targetCourseIds = [...new Set([...courseSessionMap.values()].map((g) => g.courseId))];
  const targetSessionIds = [...new Set([...courseSessionMap.values()].map((g) => g.sessionId).filter(Boolean))];

  const [courses, sessions] = await Promise.all([
    scoped(model.courseModel).findAll({
      where: { courseId: { [Op.in]: targetCourseIds } },
      attributes: ["courseId", "courseName", "courseCode", "courseDuration", "termType", "totalTerms"],
      raw: true,
      transaction: options.transaction,
    }),
    targetSessionIds.length > 0
      ? scoped(model.sessionModel).findAll({
          where: { sessionId: { [Op.in]: targetSessionIds } },
          attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate"],
          raw: true,
          transaction: options.transaction,
        })
      : [],
  ]);

  const courseMap = new Map(courses.map((c) => [c.courseId, c]));
  const sessionMap = new Map(sessions.map((s) => [s.sessionId, s]));

  // 6. For each course and session group, fetch matching class_section_term entries and subjects
  const result = [];

  for (const key of groupKeys) {
    const group = courseSessionMap.get(key);
    const courseDetails = courseMap.get(group.courseId);
    if (!courseDetails) continue;

    const sessionDetails = group.sessionId ? sessionMap.get(group.sessionId) || null : null;
    const termsArray = [...group.terms].sort((a, b) => Number(a) - Number(b));
    const groupSubjectIds = [...group.subjectIds];

    const csWhere = { courseId: group.courseId };
    if (group.sessionId) {
      csWhere.sessionId = group.sessionId;
    }
    if (group.academicYearId) {
      csWhere.academicYearId = group.academicYearId;
    }

    const classSections = await scoped(model.classSectionModel).findAll({
      where: csWhere,
      attributes: ["classSectionsId"],
      raw: true,
      transaction: options.transaction,
    });

    const classSectionsIds = [...new Set(classSections.map((cs) => cs.classSectionsId).filter(Boolean))];

    let rawTermDetails = [];
    if (classSectionsIds.length > 0 && termsArray.length > 0) {
      rawTermDetails = await scoped(model.classSectionTermModel).findAll({
        where: {
          classSectionsId: { [Op.in]: classSectionsIds },
          term: { [Op.in]: termsArray },
        },
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        raw: true,
        transaction: options.transaction,
      });
    }

    const termDetails = await Promise.all(
      termsArray.map(async (t) => {
        const matchingItems = rawTermDetails.filter((item) => item.term === t);
        const firstItem = matchingItems[0] || {};

        const allCstIds = matchingItems.map((i) => i.classSectionTermId).filter(Boolean);
        const allCsIds = matchingItems.map((i) => i.classSectionsId).filter(Boolean);

        const studentWhere = [];
        if (allCstIds.length > 0) studentWhere.push({ classSectionTermId: { [Op.in]: allCstIds } });
        if (allCsIds.length > 0) studentWhere.push({ classSectionsId: { [Op.in]: allCsIds } });

        const [studentCount, termSubjects] = await Promise.all([
          studentWhere.length > 0
            ? model.studentClassSectionsHistoryModel.count({
                where: { [Op.or]: studentWhere },
                transaction: options.transaction,
              })
            : 0,
          scoped(model.subjectModel).findAll({
            where: {
              subjectId: { [Op.in]: groupSubjectIds },
              courseId: group.courseId,
              term: t,
            },
            attributes: ["subjectId", "subjectName", "subjectCode", "term", "courseId"],
            raw: true,
            transaction: options.transaction,
          }),
        ]);

        return {
          ...firstItem,
          term: t,
          studentCount,
          subjectCount: termSubjects.length,
          subjects: termSubjects,
        };
      })
    );

    result.push({
      course: courseDetails,
      session: sessionDetails,
      academicYearId: group.academicYearId,
      terms: termDetails,
    });
  }

  return result;
}

// export async function getExaminationStructure({ examinationSessionId, examSetupTypeId, academicYearId } = {}, options = {}) {
//   let setupTypeId = Number(examSetupTypeId);
//   let sessionRecord = null;

//   if (examinationSessionId) {
//     sessionRecord = await scoped(model.examinationSessionModel).findOne({
//       where: { examinationSessionId: Number(examinationSessionId) },
//       include: [
//         {
//           model: model.examinationSessionTermModel,
//           as: "examinationSessionTerms",
//           include: [
//             {
//               model: model.classSectionTermModel,
//               as: "classSectionTerm",
//               attributes: ["classSectionTermId", "classSectionsId", "term"],
//               required: false,
//             },
//           ],
//           required: false,
//         },
//       ],
//       transaction: options.transaction,
//     });

//     if (!sessionRecord) {
//       return [];
//     }

//     setupTypeId = Number(sessionRecord.assessmentTypeId);
//   }

//   if (!setupTypeId) {
//     return [];
//   }

//   // 1. Fetch assessmentPlanIds from assessmentPlanComponentModel for setupTypeId
//   const components = await scoped(model.assessmentPlanComponentModel).findAll({
//     where: { examSetupTypeId: setupTypeId },
//     attributes: ["assessmentPlanId"],
//     raw: true,
//     transaction: options.transaction,
//   });

//   if (!components || components.length === 0) {
//     return [];
//   }

//   const planIds = [...new Set(components.map((c) => c.assessmentPlanId).filter(Boolean))];
//   if (planIds.length === 0) {
//     return [];
//   }

//   // 2. Fetch subjectIds & mappings from assessmentPlanSubjectMappingModel
//   const subjectMappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
//     where: { assessmentPlanId: { [Op.in]: planIds } },
//     attributes: ["subjectId", "courseId", "sessionId", "academicYearId"],
//     raw: true,
//     transaction: options.transaction,
//   });

//   if (!subjectMappings || subjectMappings.length === 0) {
//     return [];
//   }

//   const subjectIds = [...new Set(subjectMappings.map((m) => m.subjectId).filter(Boolean))];
//   if (subjectIds.length === 0) {
//     return [];
//   }

//   // 3. Query subjects table for target subject details
//   const subjectWhere = {
//     subjectId: { [Op.in]: subjectIds },
//     isActive: true,
//   };
//   if (academicYearId) {
//     subjectWhere.academicYearId = Number(academicYearId);
//   }

//   const subjects = await scoped(model.subjectModel).findAll({
//     where: subjectWhere,
//     attributes: ["subjectId", "subjectName", "subjectCode", "courseId", "term", "academicYearId"],
//     raw: true,
//     transaction: options.transaction,
//   });

//   if (!subjects || subjects.length === 0) {
//     return [];
//   }

//   // 4. Fetch course details
//   const courseIds = [...new Set(subjects.map((s) => s.courseId).filter(Boolean))];
//   const courses = await scoped(model.courseModel).findAll({
//     where: { courseId: { [Op.in]: courseIds } },
//     attributes: ["courseId", "courseName", "courseCode", "termType", "totalTerms"],
//     raw: true,
//     transaction: options.transaction,
//   });
//   const courseMap = new Map(courses.map((c) => [c.courseId, c]));

//   // 5. Build session details map
//   const mappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
//     where: { subjectId: { [Op.in]: subjectIds } },
//     attributes: ["subjectId", "courseId", "sessionId"],
//     include: [
//       {
//         model: model.sessionModel,
//         as: "session",
//         attributes: ["sessionId", "sessionName"],
//         required: false,
//       },
//     ],
//     raw: true,
//     transaction: options.transaction,
//   });

//   const subjectSessionMap = new Map();
//   for (const m of mappings) {
//     subjectSessionMap.set(m.subjectId, {
//       sessionId: m.sessionId,
//       sessionName: m["session.sessionName"] || null,
//     });
//   }

//   // Extract mapped classSectionTerm details if examinationSessionId was passed
//   const mappedCstMap = new Map();
//   if (sessionRecord && sessionRecord.examinationSessionTerms) {
//     for (const est of sessionRecord.examinationSessionTerms) {
//       if (est.classSectionTerm) {
//         const cst = est.classSectionTerm;
//         if (cst.classSectionsId && cst.term != null) {
//           const cs = await scoped(model.classSectionModel).findOne({
//             where: { classSectionsId: cst.classSectionsId },
//             attributes: ["courseId"],
//             raw: true,
//             transaction: options.transaction,
//           });
//           if (cs && cs.courseId) {
//             mappedCstMap.set(`${cs.courseId}_${cst.term}`, cst.classSectionTermId);
//           }
//         }
//       }
//     }
//   }

//   // 6. Group subjects by (courseId + "_" + (sessionId || 0))
//   const courseSessionGroups = new Map();

//   for (const sub of subjects) {
//     const sessionInfo = subjectSessionMap.get(sub.subjectId) || {};
//     const sessionId = sessionInfo.sessionId || null;
//     const sessionName = sessionInfo.sessionName || null;
//     const groupKey = `${sub.courseId}_${sessionId || 0}`;

//     if (!courseSessionGroups.has(groupKey)) {
//       const courseDetails = courseMap.get(sub.courseId) || { courseId: sub.courseId };
//       courseSessionGroups.set(groupKey, {
//         courseId: sub.courseId,
//         courseName: courseDetails.courseName || `Course #${sub.courseId}`,
//         courseCode: courseDetails.courseCode || null,
//         termType: courseDetails.termType || "Semester",
//         sessionId,
//         sessionName,
//         academicYearId: sub.academicYearId,
//         termsMap: new Map(),
//       });
//     }

//     const group = courseSessionGroups.get(groupKey);
//     const termNum = sub.term != null ? Number(sub.term) : 0;

//     if (!group.termsMap.has(termNum)) {
//       group.termsMap.set(termNum, []);
//     }
//     group.termsMap.get(termNum).push({
//       subjectId: sub.subjectId,
//       subjectName: sub.subjectName,
//       subjectCode: sub.subjectCode,
//       term: termNum,
//       courseId: sub.courseId,
//       sessionId,
//     });
//   }

//   // 7. Format result array
//   const result = [];
//   for (const group of courseSessionGroups.values()) {
//     const termsArray = [];
//     let totalSubjectsInGroup = 0;

//     const sortedTermNums = [...group.termsMap.keys()].sort((a, b) => a - b);

//     for (const tNum of sortedTermNums) {
//       const termSubjs = group.termsMap.get(tNum);
//       totalSubjectsInGroup += termSubjs.length;

//       const termTypeLabel = group.termType === "Year" || group.termType === "Yearly" ? "Year" : "Semester";
//       const termTitle = tNum > 0 ? `${termTypeLabel} ${tNum}` : "Unassigned Term";
//       const classSectionTermId = mappedCstMap.get(`${group.courseId}_${tNum}`) || null;

//       termsArray.push({
//         term: tNum,
//         termTitle,
//         classSectionTermId,
//         subjectCount: termSubjs.length,
//         subjects: termSubjs,
//       });
//     }

//     result.push({
//       examinationSessionId: sessionRecord ? sessionRecord.examinationSessionId : null,
//       courseId: group.courseId,
//       courseName: group.courseName,
//       courseCode: group.courseCode,
//       sessionId: group.sessionId,
//       sessionName: group.sessionName,
//       academicYearId: group.academicYearId,
//       totalSubjects: totalSubjectsInGroup,
//       terms: termsArray,
//     });
//   }

//   return result;
// }

export async function getExaminationStructure(
  {
    examinationSessionId,
    examSetupTypeId,
    academicYearId,
    courseId,
    sessionId,
  } = {},
  options = {}
) {
  let setupTypeId = Number(examSetupTypeId);
  let sessionRecord = null;

  if (examinationSessionId) {
    sessionRecord = await scoped(model.examinationSessionModel).findOne({
      where: { examinationSessionId: Number(examinationSessionId) },
      include: [
        {
          model: model.examinationSessionTermModel,
          as: "examinationSessionTerms",
          include: [
            {
              model: model.classSectionTermModel,
              as: "classSectionTerm",
              attributes: ["classSectionTermId", "classSectionsId", "term"],
              required: false,
            },
          ],
          required: false,
        },
      ],
      transaction: options.transaction,
    });

    if (!sessionRecord) {
      return [];
    }

    setupTypeId = Number(sessionRecord.assessmentTypeId);
  }

  if (!setupTypeId) {
    return [];
  }

  // 1. Fetch assessmentPlanIds
  const components = await scoped(model.assessmentPlanComponentModel).findAll({
    where: { examSetupTypeId: setupTypeId },
    attributes: ["assessmentPlanId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!components.length) {
    return [];
  }

  const planIds = [...new Set(components.map((c) => c.assessmentPlanId).filter(Boolean))];

  // 2. Filter by courseId + sessionId
  const mappingWhere = {
    assessmentPlanId: { [Op.in]: planIds },
  };

  if (courseId) {
    mappingWhere.courseId = Number(courseId);
  }

  if (sessionId) {
    mappingWhere.sessionId = Number(sessionId);
  }

  const subjectMappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: mappingWhere,
    attributes: ["subjectId", "courseId", "sessionId", "academicYearId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!subjectMappings.length) {
    return [];
  }

  const subjectIds = [...new Set(subjectMappings.map((m) => m.subjectId))];

  // 3. Subjects
  const subjectWhere = {
    subjectId: { [Op.in]: subjectIds },
    isActive: true,
  };

  if (academicYearId) {
    subjectWhere.academicYearId = Number(academicYearId);
  }

  const subjects = await scoped(model.subjectModel).findAll({
    where: subjectWhere,
    attributes: [
      "subjectId",
      "subjectName",
      "subjectCode",
      "courseId",
      "term",
      "academicYearId",
    ],
    raw: true,
    transaction: options.transaction,
  });

  if (!subjects.length) {
    return [];
  }

  // 4. Course Details
  const courseIds = [...new Set(subjects.map((s) => s.courseId))];

  const courses = await scoped(model.courseModel).findAll({
    where: {
      courseId: {
        [Op.in]: courseIds,
      },
    },
    attributes: ["courseId", "courseName", "courseCode", "termType", "totalTerms"],
    raw: true,
    transaction: options.transaction,
  });

  const courseMap = new Map(courses.map((c) => [c.courseId, c]));

  // 5. Session Details (same filter)
  const mappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: {
      subjectId: { [Op.in]: subjectIds },
    },
    attributes: ["subjectId", "courseId", "sessionId"],
    include: [
      {
        model: model.sessionModel,
        as: "session",
        attributes: ["sessionId", "sessionName"],
        required: false,
      },
    ],
    raw: true,
    transaction: options.transaction,
  });

  const subjectSessionMap = new Map();

  for (const m of mappings) {
    subjectSessionMap.set(m.subjectId, {
      sessionId: m.sessionId,
      sessionName: m["session.sessionName"] || null,
    });
  }

  // 6. Existing mapped classSectionTerms
  const mappedCstMap = new Map();

  if (sessionRecord?.examinationSessionTerms) {
    for (const est of sessionRecord.examinationSessionTerms) {
      if (!est.classSectionTerm) continue;

      const cst = est.classSectionTerm;

      const cs = await scoped(model.classSectionModel).findOne({
        where: {
          classSectionsId: cst.classSectionsId,
        },
        attributes: ["courseId"],
        raw: true,
        transaction: options.transaction,
      });

      if (cs) {
        mappedCstMap.set(
          `${cs.courseId}_${cst.term}`,
          cst.classSectionTermId
        );
      }
    }
  }

  // 7. Group
  const courseSessionGroups = new Map();

  for (const sub of subjects) {
    const sessionInfo = subjectSessionMap.get(sub.subjectId) || {};

    const key = `${sub.courseId}_${sessionInfo.sessionId || 0}`;

    if (!courseSessionGroups.has(key)) {
      const course = courseMap.get(sub.courseId) || {};

      courseSessionGroups.set(key, {
        courseId: sub.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        termType: course.termType,
        sessionId: sessionInfo.sessionId,
        sessionName: sessionInfo.sessionName,
        academicYearId: sub.academicYearId,
        termsMap: new Map(),
      });
    }

    const group = courseSessionGroups.get(key);
    const term = Number(sub.term);

    if (!group.termsMap.has(term)) {
      group.termsMap.set(term, []);
    }

    group.termsMap.get(term).push({
      subjectId: sub.subjectId,
      subjectName: sub.subjectName,
      subjectCode: sub.subjectCode,
      term,
      courseId: sub.courseId,
      sessionId: sessionInfo.sessionId,
    });
  }

  // 8. Response
  const result = [];

  for (const group of courseSessionGroups.values()) {
    const terms = [];
    let totalSubjects = 0;

    for (const term of [...group.termsMap.keys()].sort((a, b) => a - b)) {
      const subjects = group.termsMap.get(term);

      totalSubjects += subjects.length;

      terms.push({
        term,
        termTitle: `${group.termType === "Year" ? "Year" : "Semester"} ${term}`,
        classSectionTermId:
          mappedCstMap.get(`${group.courseId}_${term}`) || null,
        subjectCount: subjects.length,
        subjects,
      });
    }

    result.push({
      examinationSessionId: sessionRecord?.examinationSessionId || null,
      courseId: group.courseId,
      courseName: group.courseName,
      courseCode: group.courseCode,
      sessionId: group.sessionId,
      sessionName: group.sessionName,
      academicYearId: group.academicYearId,
      totalSubjects,
      terms,
    });
  }

  return result;
}

export async function getMappedSubjectsBySessionAndTerm({ examinationSessionId, term, courseId, sessionId }, options = {}) {
  const parsedExaminationSessionId = Number(examinationSessionId);
  const targetTerm = term !== undefined && term !== null && term !== "" ? Number(term) : null;
  const targetCourseId = courseId !== undefined && courseId !== null && courseId !== "" ? Number(courseId) : null;
  const targetSessionId = sessionId !== undefined && sessionId !== null && sessionId !== "" ? Number(sessionId) : null;

  if (isNaN(parsedExaminationSessionId)) {
    return [];
  }

  // 1. Fetch examination session with mapped terms to get assessmentTypeId & mapped (courseId, term)
  const examinationSession = await scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: parsedExaminationSessionId },
    include: [
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        include: [
          {
            model: model.classSectionTermModel,
            as: "classSectionTerm",
            attributes: ["classSectionTermId", "classSectionsId", "term"],
            required: false,
          },
        ],
        required: false,
      },
    ],
    transaction: options.transaction,
  });

  if (!examinationSession || !examinationSession.assessmentTypeId) {
    return [];
  }

  const examSetupTypeId = Number(examinationSession.assessmentTypeId);

  // Extract mapped courseId and term combinations from examinationSessionTerms
  const mappedCourseTermsSet = new Set();
  const mappedCourseIdsSet = new Set();

  if (examinationSession.examinationSessionTerms && examinationSession.examinationSessionTerms.length > 0) {
    for (const sessionTerm of examinationSession.examinationSessionTerms) {
      if (sessionTerm.classSectionTerm && sessionTerm.classSectionTerm.classSectionsId) {
        const classSection = await scoped(model.classSectionModel).findOne({
          where: { classSectionsId: sessionTerm.classSectionTerm.classSectionsId },
          attributes: ["courseId"],
          raw: true,
          transaction: options.transaction,
        });
        if (classSection && classSection.courseId) {
          mappedCourseIdsSet.add(classSection.courseId);
          if (sessionTerm.classSectionTerm.term != null) {
            mappedCourseTermsSet.add(`${classSection.courseId}_${sessionTerm.classSectionTerm.term}`);
          }
        }
      }
    }
  }

  // 2. Fetch assessmentPlanIds from assessmentPlanComponentModel for examSetupTypeId
  const assessmentPlanComponents = await scoped(model.assessmentPlanComponentModel).findAll({
    where: { examSetupTypeId },
    attributes: ["assessmentPlanId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!assessmentPlanComponents || assessmentPlanComponents.length === 0) {
    return [];
  }

  const assessmentPlanIds = [...new Set(assessmentPlanComponents.map((component) => component.assessmentPlanId).filter(Boolean))];
  if (assessmentPlanIds.length === 0) {
    return [];
  }

  // 3. Fetch subjectIds from assessmentPlanSubjectMappingModel for these assessmentPlanIds
  const mappingWhereClause = { assessmentPlanId: { [Op.in]: assessmentPlanIds } };

  if (targetCourseId !== null && !isNaN(targetCourseId)) {
    mappingWhereClause.courseId = targetCourseId;
  } else if (mappedCourseIdsSet.size > 0) {
    mappingWhereClause.courseId = { [Op.in]: [...mappedCourseIdsSet] };
  }

  if (targetSessionId !== null && !isNaN(targetSessionId)) {
    mappingWhereClause.sessionId = targetSessionId;
  }

  const subjectMappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: mappingWhereClause,
    attributes: ["subjectId", "courseId", "sessionId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!subjectMappings || subjectMappings.length === 0) {
    return [];
  }

  const mappedSubjectIds = [...new Set(subjectMappings.map((mapping) => mapping.subjectId).filter(Boolean))];
  if (mappedSubjectIds.length === 0) {
    return [];
  }

  // 4. Query subjectModel for target mapped subjects
  const subjectWhereClause = {
    subjectId: { [Op.in]: mappedSubjectIds },
    isActive: true,
  };
  if (targetTerm !== null && !isNaN(targetTerm)) {
    subjectWhereClause.term = targetTerm;
  }
  if (targetCourseId !== null && !isNaN(targetCourseId)) {
    subjectWhereClause.courseId = targetCourseId;
  }

  const mappedSubjects = await scoped(model.subjectModel).findAll({
    where: subjectWhereClause,
    attributes: ["subjectId", "subjectName", "subjectCode", "subjectType", "subjectCategory", "term", "courseId"],
    raw: true,
    transaction: options.transaction,
  });

  // 5. If session terms are defined, strictly filter subjects matching mapped courseId + term
  if (mappedCourseTermsSet.size > 0) {
    return mappedSubjects.filter((subject) => mappedCourseTermsSet.has(`${subject.courseId}_${subject.term}`));
  }

  return mappedSubjects;
}

export async function getExamSchedulesBySession(examinationSessionId, options = {}) {
  const slots = await scoped(model.examinationSessionSlotModel).findAll({
    where: { examinationSessionId: Number(examinationSessionId) },
    attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
    order: [["slotNumber", "ASC"]],
    transaction: options.transaction,
    raw: true,
  });

  if (!slots || slots.length === 0) {
    return [];
  }

  const slotIds = slots.map((s) => s.examinationSessionSlotId);

  const schedules = await scoped(model.examScheduleModel).findAll({
    where: {
      examinationSessionSlotId: { [Op.in]: slotIds },
    },
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    include: [
      {
        model: model.subjectModel,
        as: "subjectSchedule",
        attributes: ["subjectId", "subjectName", "subjectCode"],
      },
      {
        model: model.examinationSessionSlotModel,
        as: "examinationSessionSlot",
        attributes: ["examinationSessionSlotId", "slotNumber", "startTime", "endTime", "durationMinutes"],
      },
      {
        model: model.examScheduleRoomCapacityModel,
        as: "roomCapacities",
        include: [
          {
            model: model.classRoomModel,
            as: "classRoom",
            attributes: ["classRoomSectionId", "roomNumber"],
          },
        ],
      },
    ],
    order: [
      ["examDate", "ASC"],
      [{ model: model.examinationSessionSlotModel, as: "examinationSessionSlot" }, "slotNumber", "ASC"],
      ["examTime", "ASC"],
    ],
    transaction: options.transaction,
  });

  const dateMap = new Map();

  for (const scheduleItem of schedules) {
    const plainSchedule = scheduleItem.get({ plain: true });
    const examDate = plainSchedule.examDate;
    const slotInfo = plainSchedule.examinationSessionSlot;

    if (!dateMap.has(examDate)) {
      dateMap.set(examDate, new Map());
    }

    const slotMap = dateMap.get(examDate);
    const slotKey = slotInfo?.examinationSessionSlotId ?? "unassigned";

    if (!slotMap.has(slotKey)) {
      slotMap.set(slotKey, {
        examinationSessionSlotId: slotInfo?.examinationSessionSlotId ?? null,
        slotNumber: slotInfo?.slotNumber ?? null,
        slotName: slotInfo?.slotName ?? null,
        startTime: slotInfo?.startTime ?? null,
        endTime: slotInfo?.endTime ?? null,
        durationMinutes: slotInfo?.durationMinutes ?? null,
        schedules: [],
      });
    }

    const { examinationSessionSlot, ...cleanSchedule } = plainSchedule;
    slotMap.get(slotKey).schedules.push(cleanSchedule);
  }

  const groupedResult = [];
  for (const [examDate, slotMap] of dateMap.entries()) {
    groupedResult.push({
      examDate,
      slots: Array.from(slotMap.values()),
    });
  }

  return groupedResult;
}
