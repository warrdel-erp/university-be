import * as model from '../models/index.js'

export async function addLesson(data) {
  try {
    const result = await model.lessonModel.create(data);
    return result;
  } catch (error) {
    console.error("Error in add lesson :", error);
    throw error;
  }
};

export async function getLessonDetails(universityId, instituteId, role, acedmicYearId) {
  try {
    const whereClause = {
      ...(universityId && { universityId }),
      ...(acedmicYearId && { acedmicYearId }),
      ...(role === 'Head' && { institute_id: instituteId })
    };
    const lesson = await model.lessonModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: whereClause,
      include: [
        {
          model: model.subjectModel,
          as: "lessonSubject",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.courseModel,
              as: 'courseInfo',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "affiliated_university_id", "institute_id"] },
            }
          ]
        },
        {
          model: model.semesterModel,
          as: 'lessionSemester',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
        },
        {
          model: model.sessionModel,
          as: 'lessionSession',
          attributes: ["sessionName", "startingDate", "endingDate", "classTillDate"],
        },
        {
          model: model.topicModel,
          as: 'topicSession',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
        },
        {
          model:model.employeeModel,
          as:'employeeLesson',
          attributes:["employeeId","campusId","instituteId","employeeCode","employeeName"],
        }
      ]
    });
    return lesson;
  } catch (error) {
    console.error('Error fetching lesson details:', error);
    throw error;
  }
};

export async function getSingleLessonDetails(lessonId) {
  try {
    const lesson = await model.lessonModel.findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: {
        lessonId
      },
      include: [
        {
          model: model.subjectModel,
          as: "lessonSubject",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.courseModel,
              as: 'courseInfo',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "affiliated_university_id", "institute_id", "acedmic_year_id"] },
            }
          ]
        },
        {
          model: model.semesterModel,
          as: 'lessionSemester',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
        },
        {
          model: model.sessionModel,
          as: 'lessionSession',
          attributes: ["sessionName", "startingDate", "endingDate", "classTillDate"],
        },
        {
          model: model.topicModel,
          as: 'topicSession',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
        }
      ]
    });

    return lesson;
  } catch (error) {
    console.error('Error fetching Fee Plan details single:', error);
    throw error;
  }
};

export async function addTopic(data) {
  try {
    const result = await model.topicModel.create(data);
    return result;
  } catch (error) {
    console.error("Error in add topic :", error);
    throw error;
  }
};

export async function addSubTopic(data, transaction) {
  try {
    const result = await model.subTopicModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add sub topic :", error);
    throw error;
  }
};

export async function addLessionMapping(data, transaction) {
  try {
    const result = await model.lessonMappingModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add Lession Mapping:", error);
    throw error;
  }
};

export async function getMapping(universityId, instituteId, role, acedmicYearId) {
  try {
    const whereClause = {
      ...(universityId && { universityId }),
      ...(acedmicYearId && { acedmicYearId }),
      ...(role === 'Head' && { institute_id: instituteId })
    };
    const lesson = await model.lessonMappingModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: whereClause,
      include: [
        {
          model: model.topicModel,
          as: 'mappingTopic',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          where: whereClause,
          include: [
            {
              model: model.lessonModel,
              as: 'lessonTopic',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              where: whereClause,
              include: [
                {
                  model: model.subjectModel,
                  as: 'lessonSubject',
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                }
              ]
            },
            {
              model: model.subTopicModel,
              as: 'subTopic',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              where: whereClause,
            }
          ]
        },
        {
          model: model.timeTableMappingModel,
          as: 'timeTableMapping',
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "teacher_subject_mapping_id", "time_table_create_id", "time_table_creation_id", "class_room_section_id", "elective_subject_id", "subject_id"] },
          include: [
            {
              model: model.timeTableCreateModel,
              as: 'timeTablecreate',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "time_table_name_id", "course_id", "campus_id", "class_sections_id", "acedmic_year_id"] },
              include: [
                {
                  model: model.classSectionModel,
                  as: 'timeTableClassSection',
                  attributes: ["section", "class", "section_id", "class_sections_id"],
                },
              ],
            },
            {
              model: model.timeTableCreationModel,
              as: "timeTablecreation",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] }
            },
            {
              model: model.employeeModel,
              as: 'employeeDetails',
              attributes: ["employeeName", "employeeCode", "pickColor", "employeeId"]
            },
            {
              model:model.teacherSubjectMappingModel,
              as: 'timeTableTeacherSubject',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updated","employee_id","class_subject_mapper_id"]},
                include:[
                  {
                      model:model.employeeModel,
                      as: 'teacherEmployeeData',
                      attributes: ["employeeName","employeeCode","pickColor","employeeId"],
                  },
                ],
            }
          ]
        }
      ]
    });
    return lesson;
  } catch (error) {
    console.error('Error fetching lesson mapping details:', error);
    throw error;
  }
};

export async function updateMapping(lessonMappingId, data) {
  try {
    const [updatedRowsCount] = await model.lessonMappingModel.update(data, {
      where: {lessonMappingId }
    });

    if (updatedRowsCount === 0) {
      throw new Error('No lesson mapping found with the given ID.');
    }

    return { success: true, message: 'Mapping updated successfully.' };
  } catch (error) {
    console.error('Repository error during updateMapping:', error);
    throw error;
  }
};

export async function updateLessionMapping(lessonMappingId, data, transaction) {
  try {
    const result = await model.lessonMappingModel.update(data, {
      where: { lessonMappingId},
      transaction
    });
    return result;
  } catch (error) {
    console.error("Error in update Lession Mapping:", error);
    throw error;
  }
}

export async function updateSubTopic(subTopicId, data, transaction) {
  try {
    const result = await model.subTopicModel.update(data, {
      where: {subTopicId },
      transaction
    });
    return result;
  } catch (error) {
    console.error("Error in update SubTopic:", error);
    throw error;
  }
}

export async function deleteLessionMapping(lessonMappingId, transaction) {
  try {
    const result = await model.lessonMappingModel.destroy({
      where: { lessonMappingId },
      transaction
    });
    return result;
  } catch (error) {
    console.error("Error in delete Lession Mapping:", error);
    throw error;
  }
}

export async function deleteSubTopicsByMapping(mappingId, transaction) {
  try {
    const result = await model.subTopicModel.destroy({
      where: { topicId: mappingId },
      transaction
    });
    return result;
  } catch (error) {
    console.error("Error in delete SubTopics:", error);
    throw error;
  }
};

export async function getEmployeeSubjectAndLesson(acedmicYearId,employeeId) {
  try {
    const whereClause = {
      ...(employeeId && { employeeId }),
      ...(acedmicYearId && { acedmicYearId }),
    };
    const lesson = await model.teacherSubjectMappingModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
      where: whereClause,
      include: [
        {
          model: model.classSubjectMapperModel,
          as: "employeeSubject",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
          include: [
            {
              model: model.subjectModel,
              as: 'subjects',
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
              include:[
                {
                  model:model.lessonModel,
                  as:'lessonSubject',
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                  include:[
                    {
                      model: model.topicModel,
                      as: 'topicSession',
                      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
                    },
                    {
                      model: model.semesterModel,
                      as: 'lessionSemester',
                      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "specialization_id", "course_id"] },
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });
    return lesson;
  } catch (error) {
    console.error('Error fetching lesson details:', error);
    throw error;
  }
};