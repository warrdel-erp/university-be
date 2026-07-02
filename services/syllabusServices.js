import sequelize from '../database/sequelizeConfig.js';
import * as SyllabusCreationRepository from '../repository/syllabusRepository.js';
import { buildTermName } from '../utility/courseTerms.js';

export async function addSyllabus(syllabusData, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();
  try {
    const allSyllabusResults = [];

    const syllabus = await SyllabusCreationRepository.addSyllabus(
      {
        courseId: syllabusData.courseId,
        sessionId: syllabusData.sessionId,
        createdBy,
        updatedBy,
      },
      { transaction }
    );

    const syllabusDetailsData = [];

    syllabusData.subjects.forEach((subj) => {
      subj.term.forEach((termItem) => {
        syllabusDetailsData.push({
          syllabusId: syllabus.syllabusId,
          subjectId: subj.subjectId,
          subjectType: subj.subjectType,
          examSetupTypeId: termItem.examSetupTypeId,
          type: termItem.type,
          marks: termItem.marks,
          total: subj.total,
          createdBy,
          updatedBy,
        });
      });
    });

    await SyllabusCreationRepository.addSyllabusDetails(syllabusDetailsData, { transaction });
    allSyllabusResults.push(syllabus);

    await transaction.commit();
    return allSyllabusResults;
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating syllabus:', error);
    throw error;
  }
}

export async function getSyllabusDetails(academicYearId) {
  return await SyllabusCreationRepository.getSyllabusDetails(academicYearId);
}

export async function getSingleSyllabusDetails(SyllabusId) {
  return await SyllabusCreationRepository.getSingleSyllabusDetails(SyllabusId);
}

export async function deleteSyllabus(SyllabusId) {
  return await SyllabusCreationRepository.deleteSyllabus(SyllabusId);
}

export async function updateSyllabus(SyllabusId, syllabusData, updatedBy) {
  syllabusData.updatedBy = updatedBy;
  await SyllabusCreationRepository.updateSyllabus(SyllabusId, syllabusData);
}

export async function courseAllSubject(courseId, sessionId) {
  return await SyllabusCreationRepository.courseAllSubject(courseId, sessionId);
}

export async function addSyllabusUnit(data, createdBy, updatedBy) {
  const { academicYearId, term: inputTerm, subjectId, slab, sessionId } = data;

  await SyllabusCreationRepository.validateSubjectForSyllabusUnit({
    subjectId,
    academicYearId,
    sessionId,
  });

  await SyllabusCreationRepository.backfillSubjectCampusId(subjectId);

  const subject = await SyllabusCreationRepository.getSubjectForUnitResolution(subjectId);
  const subjectPlain = subject?.get ? subject.get({ plain: true }) : subject;
  const resolvedTerm = inputTerm ?? subjectPlain?.term ?? null;

  const syllabusUnits = slab.map((unit) => ({
    sessionId,
    academicYearId,
    subjectId,
    ...(resolvedTerm != null && { term: Number(resolvedTerm) }),
    unitNumber: unit.unitNumber,
    name: unit.name,
    description: unit.description,
    contactHours: unit.contactHours,
    createdBy,
    updatedBy,
  }));

  return await SyllabusCreationRepository.addSyllabusUnit(syllabusUnits);
}

function mapSyllabusUnit(unit) {
  return {
    syllabusUnitId: unit.syllabusUnitId,
    universityId: unit.universityId,
    instituteId: unit.instituteId,
    instituteName: unit.instituteUnit?.instituteName || null,
    instituteCode: unit.instituteUnit?.instituteCode || null,
    academicYearId: unit.academicYearId,
    acedmicYearTitle: unit.acedmicYearUnit?.yearTitle || null,
    acedmicYearStart: unit.acedmicYearUnit?.startingDate || null,
    acedmicYearEnd: unit.acedmicYearUnit?.endingDate || null,
    term: unit.term ?? unit.subjectUnit?.term ?? null,
    termName: unit.subjectUnit?.courseInfo?.termType && unit.term != null
      ? `${unit.subjectUnit.courseInfo.termType} ${unit.term}`
      : null,
    sessionId: unit.sessionId,
    sessionName: unit.sessionUnit?.sessionName || null,
    subjectId: unit.subjectId,
    subjectName: unit.subjectUnit?.subjectName || null,
    subjectCode: unit.subjectUnit?.subjectCode || null,
    campusId: unit.subjectUnit?.campusId ?? null,
    unitNumber: unit.unitNumber,
    name: unit.name,
    description: unit.description,
    contactHours: unit.contactHours,
  };
}

export async function syllabusUnitGet(subjectId) {
  const syllabusUnits = await SyllabusCreationRepository.syllabusUnitGet(subjectId);
  return syllabusUnits.map(mapSyllabusUnit);
}

export async function updateSyllabusUnit(syllabusUnitId, academicYearId, data, updatedBy) {
  const payload = {
    ...(data.unitNumber != null && { unitNumber: data.unitNumber }),
    ...(data.name != null && { name: data.name }),
    ...(data.description != null && { description: data.description }),
    ...(data.contactHours != null && { contactHours: data.contactHours }),
    updatedBy,
  };

  const updated = await SyllabusCreationRepository.updateSyllabusUnit(
    syllabusUnitId,
    academicYearId,
    payload
  );

  if (!updated) {
    return null;
  }

  return {
    syllabusUnitId: updated.syllabusUnitId,
    academicYearId: updated.academicYearId,
    subjectId: updated.subjectId,
    sessionId: updated.sessionId,
    term: updated.term,
    unitNumber: updated.unitNumber,
    name: updated.name,
    description: updated.description,
    contactHours: updated.contactHours,
  };
}

export async function deleteSyllabusUnit(syllabusUnitId) {
  return SyllabusCreationRepository.deleteSyllabusUnit(syllabusUnitId);
}

export async function termAllSubject(courseId, term) {
  try {
    const courseRow = await SyllabusCreationRepository.getCourseTermMetadata(courseId);
    if (!courseRow) {
      return { message: 'Course not found' };
    }

    const subjectRows = await SyllabusCreationRepository.findSubjectsWithSyllabusByTerm(courseId, term);
    if (!subjectRows.length) {
      return { message: 'Syllabus subject not found' };
    }

    const termNum = Number(term);
    const termType = courseRow.termType ?? 'Semester';

    const subjects = [];
    for (const row of subjectRows) {
      const subj = row.get({ plain: true });
      const syllabus = [];
      for (const syl of subj.syllabusSubject ?? []) {
        syllabus.push({
          syllabusDetailsId: syl.syllabusDetailsId,
          syllabusId: syl.syllabusId,
          assessmentType: syl.type,
          marks: syl.marks ? Number(syl.marks) : null,
          total: syl.total ? Number(syl.total) : null,
          examType: syl.examSetupTypeSyllabus?.examType ?? null,
          maxAssessment: syl.examSetupTypeSyllabus?.maximumAssessment ?? null,
          evaluatedBy: syl.examSetupTypeSyllabus?.evaluatedBy ?? null,
        });
      }

      subjects.push({
        subjectId: subj.subjectId,
        subjectName: subj.subjectName,
        subjectCode: subj.subjectCode,
        subjectType: subj.subjectType,
        syllabus,
      });
    }

    return {
      courseId: Number(courseId),
      term: termNum,
      termName: buildTermName(termType, termNum),
      termType,
      courseDurationYears: courseRow.courseDuration ?? null,
      totalTerms: courseRow.totalTerms ?? null,
      subjects,
    };
  } catch (error) {
    console.error('Service Error:', error);
    throw error;
  }
}
