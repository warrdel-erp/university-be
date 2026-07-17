import * as lesson from "../repository/lessonRepository.js";
import * as lectureWindowRepository from "../repository/lectureWindowRepository.js";
import sequelize from '../database/sequelizeConfig.js';

export async function addLesson(data, createdBy, updatedBy) {
    const window = await lectureWindowRepository.getLectureWindowById(
        data.lectureWindowId,
        data.academicYearId,
    );
    if (!window) {
        throw new Error("Lecture window not found");
    }

    const payload = {
        ...data,
        lectureWindowId: window.lectureWindowId,
        createdBy,
        updatedBy,
    };
    return lesson.addLesson(payload);
}

export async function getLessonDetails(academicYearId) {
    return await lesson.getLessonDetails(academicYearId);
}

export async function getSingleLessonDetails(lessonId) {
    return await lesson.getSingleLessonDetails(lessonId);
}

export async function addTopice(data, createdBy, updatedBy) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,
        };
        return await lesson.addTopic(payload);
    } catch (error) {
        console.error("Error in add topic:", error);
        throw error;
    }
}

export async function addMapping(data, createdBy, updatedBy) {
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
    };

    const lessonMapping = await lesson.addLessionMapping(payload, transaction);

    if (data.subTopic && Array.isArray(data.subTopic)) {
      for (const sub of data.subTopic) {
        const subTopicData = {
          name: sub.name,
          description: sub.description || null,
          topicId: data.topicId,
          createdBy,
          updatedBy,
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
}

/**
 * Copy an existing lesson/topic mapping onto one or more timetable cells.
 * The same source can be taught in multiple cells, so each target carries its own
 * timeTableMappingId + date. All copies are created in a single transaction.
 */
export async function copyMapping(data, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const source = await lesson.getLessonMappingById(data.sourceLessonMappingId, transaction);
    if (!source) {
      throw Object.assign(new Error("Source lesson mapping not found"), { statusCode: 404 });
    }

    const note = data.note !== undefined ? data.note : source.note;
    const lectureUrl = data.lectureUrl !== undefined ? data.lectureUrl : source.lectureUrl;
    const file = data.file !== undefined ? data.file : source.file;

    const copied = [];

    for (const target of data.targets) {
      const schedule = await lesson.getClassScheduleById(target.timeTableMappingId, transaction);
      if (!schedule) {
        throw Object.assign(
          new Error(`Timetable cell ${target.timeTableMappingId} not found`),
          { statusCode: 404 },
        );
      }

      const row = await lesson.addLessionMapping(
        {
          topicId: source.topicId,
          timeTableMappingId: Number(target.timeTableMappingId),
          date: target.date,
          completeDate: null,
          note,
          lectureUrl,
          file,
          status: "inComplete",
          createdBy,
          updatedBy,
        },
        transaction,
      );

      copied.push({
        lessonMappingId: row.lessonMappingId,
        topicId: row.topicId,
        timeTableMappingId: row.timeTableMappingId,
        date: row.date,
        status: row.status,
      });
    }

    await transaction.commit();
    return {
      message: `Lesson mapping copied to ${copied.length} cell(s) successfully`,
      copied,
      sourceLessonMappingId: Number(data.sourceLessonMappingId),
    };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in copyMapping:", error);
    throw error;
  }
}

export async function getMapping(academicYearId) {
  try {
    const originalData = await lesson.getMapping(academicYearId);

    const grouped = {};
    const plainData = [];

    for (const row of originalData) {
      const item = row.get ? row.get({ plain: true }) : row;
      plainData.push(item);

      const ttMapping = item.timeTableMapping;

      if (!ttMapping) {
        continue;
      }

      const empDetails = ttMapping.employeeDetails;
      const teacherMapping = ttMapping.timeTableTeacherSubject?.teacherEmployeeData;
      const finalEmp = empDetails || teacherMapping;

      const empId = finalEmp?.userId || ttMapping.timeTableMappingId;

      if (!grouped[empId]) {
        grouped[empId] = {
          userId: finalEmp?.userId || null,
          employeeName: finalEmp?.employeeName || 'N/A',
          employeeCode: finalEmp?.employeeCode || 'N/A',
          pickColor: finalEmp?.pickColor || '#ccc',
          timeTables: []
        };
      }

      const ttCreate = ttMapping.timeTablecreate || {};
      const classSection = ttCreate.timeTableClassSectionTerm?.classSection || ttCreate.timeTableClassSection || {};
      const subject = item.mappingTopic?.lessonTopic?.lessonSubject || {};
      const lessonRow = item.mappingTopic?.lessonTopic || {};
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
          lessonId: lessonRow.lessonId,
          name: lessonRow.name,
          description: lessonRow.description
        },
        topic: {
          topicId: topic.topicId,
          name: topic.name,
          description: topic.description,
          subTopics
        }
      });
    }

    return {
      original: plainData,
      filtered: Object.values(grouped)
    };
  } catch (error) {
    console.error('Error in lesson service:', error);
    throw error;
  }
}

export async function updateMapping(completeDate, lessonMappingId) {
  try {
    const data = {
      completeDate,
      status: 'complete'
    };
    return await lesson.updateMapping(lessonMappingId, data);
  } catch (error) {
    console.error('Error updating mapping:', error);
    throw error;
  }
}

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
    await lesson.deleteLessionMapping(lessonMappingId, transaction);
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error in deleteMapping:", error);
    throw error;
  }
}

export async function getEmployeeSubjectAndLesson(userId, courseId, sessionId, subjectSearch, subjectId) {
    const data = await lesson.getEmployeeSubjectAndLesson(
        userId,
        courseId,
        sessionId,
        subjectSearch,
        subjectId,
    );

    return data.filter((item) => item?.employeeSubject?.subjectId != null);
}

export async function getSimpleLessonList(whereClause) {
    return await lesson.getSimpleLessonList(whereClause);
}

export async function linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy, academicYearId) {
    const window = await lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
    if (!window) {
        throw new Error("Lecture window not found");
    }

    return lectureWindowRepository.linkLessonsToWindow(lectureWindowId, lessonIds, updatedBy);
}

export async function getLectureWindowById(lectureWindowId, academicYearId) {
    return lectureWindowRepository.getLectureWindowById(lectureWindowId, academicYearId);
}
