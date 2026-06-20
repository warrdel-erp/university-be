import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

export async function checkIdsBelongToSameCourse(examSetupTypeTermId, subjectId, sessionId) {
  const term = await scoped(model.examSetupTypeTermModel).findOne({
    where: { examSetupTypeTermId },
    attributes: ['courseId'],
  });
  if (!term) throw new Error('Invalid examSetupTypeTermId');

  const subject = await scoped(model.subjectModel).findOne({
    where: { subjectId },
    attributes: ['courseId'],
  });
  if (!subject) throw new Error('Invalid subjectId');

  if (term.courseId !== subject.courseId) {
    throw new Error('examSetupTypeTermId and subjectId belong to different courses');
  }

  const session = await scoped(model.sessionModel).findOne({
    where: { sessionId },
    attributes: ['sessionId'],
  });
  if (!session) {
    throw new Error('Invalid sessionId');
  }

  const sessionMapping = await scoped(model.sessionCouseMappingModel).findOne({
    where: {
      sessionId,
      courseId: term.courseId,
    },
  });

  if (!sessionMapping) {
    throw new Error('sessionId is not mapped to the course of the given term/subject');
  }

  return term.courseId;
}

export async function createOrUpdateWeightageBulk(dataList) {
  return await scoped(model.subjectWeightageModel).bulkCreate(dataList, {
    updateOnDuplicate: ['weightage', 'sessionId', 'updatedBy', 'updatedAt'],
  });
}

export async function getSubjectsWithWeightages(sessionId, courseId, term) {
  return await scoped(model.subjectModel).findAll({
    where: {
      courseId,
      term,
    },
    include: [
      {
        model: model.subjectWeightageModel,
        as: 'subjectWeightages',
        where: { sessionId },
        required: false,
      },
    ],
  });
}
