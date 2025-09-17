import * as model from '../models/index.js'

export async function addSchedule(scheduleData) {
    try {
        const result = await model.scheduleModel.create(scheduleData);
        return result;
    } catch (error) {
        console.error("Error in add Schedule :", error);
        throw error;
    }
};

export async function getScheduleDetails(universityId, acedmicYearId, instituteId, role) {
    try {
        const Schedule = await model.scheduleModel.findAll({
            where: {
                ...(acedmicYearId && { acedmicYearId }),
                ...(role === 'Head' && { instituteId }),
                ...(universityId && { universityId }),
            },
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
            },
        });
        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule with details:', error);
        throw error;
    }
};

export async function getSingleScheduleDetails(scheduleId, universityId) {
    try {
        const Schedule = await model.scheduleModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { scheduleId, universityId },
        });

        return Schedule;
    } catch (error) {
        console.error('Error fetching Schedule details:', error);
        throw error;
    }
};

export async function deleteSchedule(scheduleId) {
    const deleted = await model.scheduleModel.destroy({ where: { scheduleId: scheduleId } });
    return deleted > 0;
};

export async function updateSchedule(scheduleId, scheduleData) {
    try {
        const result = await model.scheduleModel.update(scheduleData, {
            where: { scheduleId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating Schedule creation ${scheduleId}:`, error);
        throw error;
    }
};

export async function assignTeacher(data) {
    try {
        const result = await model.scheduleAssignModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add assign Teacher :", error);
        throw error;
    }
};

export async function getAssignTeacher() {
    try {
        const scheduleAssignments = await model.scheduleAssignModel.findAll({
            // where: {
            //             ...(acedmicYearId && { acedmicYearId }),
            //             ...(role === 'Head' && { instituteId }),
            //             ...(universityId && { universityId }),
            //         },
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
            },
            include: [
                {
                    model: model.scheduleModel,
                    as: "schedule",
                    attributes: {
                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
                    },
                },
                {
                    model: model.employeeModel,
                    as: "employeeSchedule",
                    attributes: [
                        "employeeId",
                        "employeeName",
                        "employeeCode",
                        "department",
                        "employmentType"
                    ]
                }
            ]
        });

        return scheduleAssignments;
    } catch (error) {
        console.error("Error fetching assigned teachers:", error);
        throw error;
    }
};

export async function attendence(data) {
    try {
        const result = await model.teacherAttendeceModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add teacher attendence:", error);
        throw error;
    }
};

export async function updateAttendence(teacherAttendenceId, data) {
    try {
        const result = await model.teacherAttendeceModel.update(data, {
            where: { teacherAttendenceId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating Schedule creation ${teacherAttendenceId}:`, error);
        throw error;
    }
};

// export async function getAllAttendence(universityId, instituteId, role,page,limit,fromDate,toDate) {
//     try {
//         const Schedule = await model.teacherAttendeceModel.findAll({
//             attributes: {
//                 exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
//             },
//             include: [
//                 {
//                     model: model.scheduleAssignModel,
//                     as: 'scheduleAssign',
//                     attributes: {
//                         exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
//                     },
//                     include: [
//                         {
//                             model: model.scheduleModel,
//                             as: "schedule",
//                             attributes: {
//                                 exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
//                             },
//                             where: {
//                 ...(role === 'Head' && { instituteId }),
//                 ...(universityId && { universityId }),
//             },
//                         },
//                         {
//                             model: model.employeeModel,
//                             as: "employeeSchedule",
//                             attributes: [
//                                 "employeeId",
//                                 "employeeName",
//                                 "employeeCode",
//                                 "department",
//                                 "employmentType"
//                             ]
//                         }
//                     ]
//                 }

//             ]
//         });
//         return Schedule;
//     } catch (error) {
//         console.error('Error fetching Schedule with details:', error);
//         throw error;
//     }
// };

import { Op } from "sequelize";

export async function getAllAttendence(universityId, instituteId, role, page, limit, fromDate, toDate) {
  try {
    const whereClause = {};

    // ✅ filter by date range if provided
    if (fromDate && toDate) {
      whereClause.date = {
        [Op.between]: [fromDate, toDate]
      };
    } else if (fromDate) {
      whereClause.date = {
        [Op.gte]: fromDate
      };
    } else if (toDate) {
      whereClause.date = {
        [Op.lte]: toDate
      };
    }

    // ✅ pagination
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * pageSize;

    const attendances = await model.teacherAttendeceModel.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },
      include: [
        {
          model: model.scheduleAssignModel,
          as: "scheduleAssign",
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
          },
          include: [
            {
              model: model.scheduleModel,
              as: "schedule",
              attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
              },
              where: {
                ...(role === "Head" && { instituteId }),
                ...(universityId && { universityId })
              }
            },
            {
              model: model.employeeModel,
              as: "employeeSchedule",
              attributes: [
                "employeeId",
                "employeeName",
                "employeeCode",
                "department",
                "employmentType"
              ]
            }
          ]
        }
      ],
      limit: pageSize,
      offset: offset,
      order: [["date", "DESC"]]
    });

    return {
      totalRecords: attendances.count,
      totalPages: Math.ceil(attendances.count / pageSize),
      currentPage: pageNumber,
      data: attendances.rows
    };
  } catch (error) {
    console.error("Error fetching attendance with details:", error);
    throw error;
  }
};