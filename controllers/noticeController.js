import * as notice from "../services/noticeServices.js";

export async function addNotice(req, res) {
  const { title } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const role = req.user.role;

  try {
    if (!title) {
      return res.status(400).send("title is required");
    }

    const noticeData = await notice.addNotice(req.body, createdBy, updatedBy, role);
    res.status(201).json({ message: "Data added successfully", noticeData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllStudentNotice(req, res) {
  try {
    const notices = await notice.getAllStudentNotice();
    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllEmployeeNotice(req, res) {
  const createdBy = req.user.userId;
  const role = req.user.role;

  try {
    const notices = await notice.getAllEmployeeNotice(createdBy, role);
    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateNotice(req, res) {
  try {
    const { noticeId } = req.body;
    if (!noticeId) {
      return res.status(400).send("noticeId is required");
    }

    const updatedBy = req.user.userId;
    const updatednotice = await notice.updateNotice(noticeId, req.body, updatedBy);
    res.status(200).json({ message: "notice update succesfully", updatednotice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteNotice(req, res) {
  try {
    const { noticeId } = req.query;
    if (!noticeId) {
      return res.status(400).json({ message: "noticeId is required" });
    }

    const deleted = await notice.deleteNotice(noticeId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for notice ID ${noticeId}` });
    } else {
      res.status(404).json({ message: "notice not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
