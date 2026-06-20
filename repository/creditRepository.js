import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export async function addCredit(creditData) {
  try {
    return await scoped(model.creditModel).bulkCreate(creditData);
  } catch (error) {
    console.error('Error in add Credit:', error);
    throw error;
  }
}

export async function getCreditDetails(courseId, sessionId) {
  try {
    return await scoped(model.creditModel).findAll({
      where: {
        ...(courseId && { courseId }),
        ...(sessionId && { sessionId }),
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
      },
      include: [
        {
          model: model.courseModel,
          as: 'courseCredit',
          attributes: ['courseId', 'courseName'],
        },
        {
          model: model.sessionModel,
          as: 'sessionCredit',
          attributes: ['sessionId', 'sessionName'],
        },
        {
          model: model.subjectModel,
          as: 'subjectCredit',
          attributes: ['subjectId', 'subjectName', 'subjectCode'],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching Credit details:', error);
    throw error;
  }
}

export async function getSingleCreditDetails(creditId) {
  try {
    return await scoped(model.creditModel).findOne({
      where: { creditId },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
      },
      include: [
        {
          model: model.courseModel,
          as: 'courseCredit',
          attributes: ['courseId', 'courseName'],
        },
        {
          model: model.sessionModel,
          as: 'sessionCredit',
          attributes: ['sessionId', 'sessionName'],
        },
        {
          model: model.subjectModel,
          as: 'subjectCredit',
          attributes: ['subjectId', 'subjectName', 'subjectCode'],
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching Credit details:', error);
    throw error;
  }
}

export async function deleteCredit(creditId) {
  const existing = await scoped(model.creditModel).findOne({
    where: { creditId },
    attributes: ['creditId'],
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.creditModel).destroy({ where: { creditId } });
  return deleted > 0;
}

export async function updateCredit(creditId, CreditData) {
  try {
    const existing = await scoped(model.creditModel).findOne({
      where: { creditId },
      attributes: ['creditId'],
    });
    if (!existing) {
      return [0];
    }

    return await scoped(model.creditModel).update(CreditData, {
      where: { creditId },
    });
  } catch (error) {
    console.error(`Error updating Credit creation ${creditId}:`, error);
    throw error;
  }
}
