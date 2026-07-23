import * as notice from '../services/noticeServices.js';

export async function addNotice(req, res) {
  try {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const role = req.user.defaultRole;

    const noticeData = await notice.addNotice(req.body, createdBy, updatedBy, role);
    res.status(201).json({ message: 'Data added successfully', noticeData });
  } catch (error) {
    const statusCode = /scope|required|not found/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
}

export async function getAllStudentNotice(req, res) {
  try {
    const role = req.user.defaultRole;
    const notices = await notice.getAllStudentNotice(role);
    res.status(200).json(notices);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
}

export async function getAllEmployeeNotice(req, res) {
  try {
    const createdBy = req.user.userId;
    const role = req.user.defaultRole;
    const academicYearId = req.query.academicYearId;
    const notices = await notice.getAllEmployeeNotice(createdBy, role, academicYearId);
    res.status(200).json(notices);
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
}

export async function updateNotice(req, res) {
  try {
    const { noticeId, ...updateData } = req.body;
    const updatedBy = req.user.userId;
    const updatednotice = await notice.updateNotice(noticeId, updateData, updatedBy);
    res.status(200).json({ message: 'notice update succesfully', updatednotice });
  } catch (error) {
    const statusCode = /scope|required|not found/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
}

export async function deleteNotice(req, res) {
  try {
    const { noticeId } = req.query;
    const deleted = await notice.deleteNotice(noticeId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for notice ID ${noticeId}` });
    } else {
      res.status(404).json({ message: 'notice not found' });
    }
  } catch (error) {
    const statusCode = /scope/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
}
