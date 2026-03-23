import * as lesson  from "../repository/lessonRepository.js";
import sequelize from '../database/sequelizeConfig.js';

export async function addLesson(data, createdBy, updatedBy, universityId, instituteId) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,
            universityId,
            instituteId
        };

        return await lesson.addLesson(payload);
    } catch (error) {
        console.error("Error in addLesson:", error);
        throw error; 
    }
};

export async function getLessonDetails(universityId,instituteId,role,acedmicYearId) {
    return await lesson.getLessonDetails(universityId,instituteId,role,acedmicYearId);
};

export async function getSingleLessonDetails(lessonId) {
    return await lesson.getSingleLessonDetails(lessonId);
};

export async function addTopice(data, createdBy, updatedBy, universityId, instituteId) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,
            universityId,
            instituteId
        };

        return await lesson.addTopic(payload);
    } catch (error) {
        console.error("Error in add topic:", error);
        throw error; 
    }
};

export async function addMapping(data, createdBy, updatedBy, universityId, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const payload = {
      topicId: data.topicId,
      timeTableMappingId: data.timeTableMappingId,
      date: data.date,
      completeDate: data.completeDate || null,
      note: data.note || null,
      lectureUrl: data.lectureUrl || null,
      file: data.file || null,
      status: data.status || 'inComplete',
      createdBy,
      updatedBy,
      universityId,
      instituteId
    };

    const lessonMapping = await lesson.addLessionMapping(payload, transaction);

    if (data.subTopic && Array.isArray(data.subTopic)) {
      for (const sub of data.subTopic) {
        const subTopicData = {
          name: sub.name,
          description: sub.description || null,
          topicId: data.topicId, 
          universityId,
          instituteId,
          createdBy,
          updatedBy
        };

        await lesson.addSubTopic(subTopicData, transaction);
      }
    }

    await transaction.commit();
    return { message: "Lesson mapping and sub-topics added successfully" };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in addMapping:", error);
    throw error;
  }
};

export async function getMapping(universityId, instituteId, role, acedmicYearId) {
  try {
    const originalData = await lesson.getMapping(universityId, instituteId, role, acedmicYearId);

    const grouped = {};

    originalData.forEach(item => {
      const ttMapping = item.timeTableMapping;

      if (!ttMapping) return; // skip if mapping is missing

      // Prefer direct employee, otherwise teacher from teacherSubjectMapping
      const empDetails = ttMapping.employeeDetails;
      const teacherMapping = ttMapping.timeTableTeacherSubject?.teacherEmployeeData;
      const finalEmp = empDetails || teacherMapping;

      const empId = finalEmp?.employeeId || ttMapping.timeTableMappingId;

      if (!grouped[empId]) {
        grouped[empId] = {
          employeeId: finalEmp?.employeeId || null,
          employeeName: finalEmp?.employeeName || 'N/A',
          employeeCode: finalEmp?.employeeCode || 'N/A',
          pickColor: finalEmp?.pickColor || '#ccc',
          timeTables: []
        };
      }

      const ttCreate = ttMapping.timeTablecreate || {};
      const classSection = ttCreate.timeTableClassSection || {};
      const subject = item.mappingTopic?.lessonTopic?.lessonSubject || {};
      const lesson = item.mappingTopic?.lessonTopic || {};
      const topic = item.mappingTopic || {};
      const subTopics = topic.subTopic || [];

      grouped[empId].timeTables.push({
        timeTableMappingId: ttMapping.timeTableMappingId,
        day: ttMapping.day,
        date: item.date,
        lectureUrl: item.lectureUrl,
        note: item.note,
        lessonMappingId: item.lessonMappingId,
        status: item.status,
        completeDate: item.completeDate,
        period: ttMapping.period,
        timeTableType: ttMapping.timeTableType,
        classSection,
        subject,
        lesson: {
          lessonId: lesson.lessonId,
          name: lesson.name,
          description: lesson.description
        },
        topic: {
          topicId: topic.topicId,
          name: topic.name,
          description: topic.description,
          subTopics
        }
      });
    });

    const filteredData = Object.values(grouped);

    return {
      original: originalData,
      filtered: filteredData
    };
  } catch (error) {
    console.error('Error in lesson service:', error);
    throw error;
  }
};

export async function updateMapping(completeDate, lessonMappingId) {
  try {
    const data = {
      completeDate,
      status: 'complete'
    };

    const result = await lesson.updateMapping(lessonMappingId, data);
    return result;
  } catch (error) {
    console.error('Error updating mapping:', error);
    throw error;
  }
};

export async function updateCompleteMapping(lessonMappingId, data, updatedBy) {
  const transaction = await sequelize.transaction();
  try {
    const payload = {
      topicId: data.topicId,
      timeTableMappingId: data.timeTableMappingId,
      date: data.date,
      completeDate: data.completeDate || null,
      note: data.note || null,
      lectureUrl: data.lectureUrl || null,
      file: data.file || null,
      status: data.status || 'inComplete',
      updatedBy
    };

    const updatedLesson = await lesson.updateLessionMapping(
      lessonMappingId,
      payload,
      transaction
    );

    if (data.subTopic && Array.isArray(data.subTopic)) {
      for (const sub of data.subTopic) {
        if (sub.subTopicId) {
          await lesson.updateSubTopic(
            sub.subTopicId, 
            {
              name: sub.name,
              description: sub.description || null,
              updatedBy
            },
            transaction
          );
        }
      }
    }

    await transaction.commit();
    return updatedLesson;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateCompleteMapping:", error);
    throw error;
  }
}


export async function deleteMapping(lessonMappingId) {
  const transaction = await sequelize.transaction();
  try {
    // await lesson.deleteSubTopicsByMapping(lessonMappingId, transaction);

    await lesson.deleteLessionMapping(lessonMappingId, transaction);

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in deleteMapping:", error);
    throw error;
  }
};

export async function getEmployeeSubjectAndLesson(acedmicYearId, employeeId, courseId, sessionId) {
    const data = await lesson.getEmployeeSubjectAndLesson(
        acedmicYearId,
        employeeId,
        courseId,
        sessionId
    );

    const filteredData = data.filter(item =>
        item?.employeeSubject?.subjects !== null
    );

    return filteredData;
}

export async function getSimpleLessonList(whereClause) {
    return await lesson.getSimpleLessonList(whereClause);
}
