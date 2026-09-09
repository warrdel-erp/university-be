import { scoped } from '../utility/scoped.js';
import * as model from '../models/index.js';

export async function findAll(filters = {}) {
  return scoped(model.curriculumModel).findAll({ 
    where: filters, 
    order: [['created_at', 'DESC']],
    include: [{ model: model.courseModel, as: 'course' }]
  });
}

export async function findById(id) {
  return scoped(model.curriculumModel).findByPk(id, {
    include: [{ model: model.courseModel, as: 'course' }]
  });
}

export async function create(data, options = {}) {
  return scoped(model.curriculumModel).create(data, options);
}

export async function update(id, data, options = {}) {
  return scoped(model.curriculumModel).update(data, { where: { curriculumId: id }, ...options });
}

export async function remove(id, options = {}) {
  return scoped(model.curriculumModel).destroy({ where: { curriculumId: id }, ...options });
}

export async function findByNameAndCourse(name, courseId) {
    return scoped(model.curriculumModel).findOne({
        where: { name, courseId }
    });
}
