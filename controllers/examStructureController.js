import * as examStructureServices from "../services/examStructureServices.js";

export async function addExamStructure(req, res) {
  const { acedmicYearId, courseId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const universityId = req.user.universityId;
  const instituteId = req.user.defaultInstituteId;
  try {
    if (!(acedmicYearId && courseId)) {
      return res.status(400).send("Required fields are missing");
    }
    const examStructure = await examStructureServices.addExamStructure(req.body, createdBy, updatedBy, universityId, instituteId);
    res.status(201).json({ message: "Exam Structure created successfully", examStructure });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function getAllExamStructure(req, res) {
  const universityId = req.user.universityId;
  const { acedmicYearId } = req.query
  const role = req.user.role;
  const instituteId = req.user.defaultInstituteId;
  try {
    const Structures = await examStructureServices.getExamStructure(universityId, acedmicYearId, role, instituteId);
    res.status(200).json(Structures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSingleExamStructure(req, res) {
  const universityId = req.user.universityId;

  try {
    const courseId = parseInt(req.query.courseId, 10);
    const sessionId = parseInt(req.query.sessionId, 10);

    if (!courseId && !sessionId) {
      return res.status(400).json({ success: false, message: "courseId and sessionId are required" });
    }

    const examDetails = await examStructureServices.getSingleExamStructure(courseId, sessionId, universityId);

    if (examDetails) {
      res.status(200).json({ success: true, data: examDetails });
    } else {
      res.status(404).json({ success: false, message: "Exam Structure not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export async function updateExamStructure(req, res) {
  try {
    const { examStructureId } = req.body;
    if (!examStructureId) {
      return res.status(400).send("examStructureId is required");
    }
    const updatedBy = req.user.userId;
    const examDetails = await examStructureServices.updateExamStructure(examStructureId, req.body, updatedBy);
    res.status(200).json({ message: "Exam Structure updated successfully", examDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function deleteExamStructure(req, res) {
  try {
    const { examStructureId } = req.query;
    if (!examStructureId) {
      return res.status(400).json({ message: "examStructureId is required" });
    }
    const deleted = await examStructureServices.deleteExamStructure(examStructureId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for exam Structure ID ${examStructureId}` });
    } else {
      res.status(404).json({ message: "Exam Structure not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function addExamType(req, res) {
  const { examStructureId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    if (!(examStructureId)) {
      return res.status(400).send("examStructureId Required fields are missing");
    }
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const examStructure = await examStructureServices.addExamType(req.body, createdBy, updatedBy, universityId, instituteId);
    res.status(201).json({ message: "Exam setup type created successfully", examStructure });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function getDetailByExamType(req, res) {
  const universityId = req.user.universityId;

  try {
    const examSetupTypeId = parseInt(req.query.examSetupTypeId, 10);

    if (!examSetupTypeId) {
      return res.status(400).json({ success: false, message: "examSetupTypeId is required" });
    }

    const examDetails = await examStructureServices.getDetailByExamType(examSetupTypeId);

    if (examDetails) {
      res.status(200).json({ success: true, data: examDetails });
    } else {
      res.status(404).json({ success: false, message: "Exam type not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export async function getSingleExamType(req, res) {
  const universityId = req.user.universityId;

  try {
    const courseId = parseInt(req.query.courseId, 10);
    const sessionId = parseInt(req.query.sessionId, 10);
    const termNumber = req.query.termNumber ? parseInt(req.query.termNumber, 10) : null;

    if (!courseId && !sessionId) {
      return res.status(400).json({ success: false, message: "courseId and sessionId are required" });
    }

    const examDetails = await examStructureServices.getSingleExamType(courseId, sessionId, universityId, termNumber);

    if (examDetails) {
      res.status(200).json({ success: true, data: examDetails });
    } else {
      res.status(404).json({ success: false, message: "Exam Type not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export async function updateExamType(req, res) {
  try {
    const { examSetupTypeId } = req.body;
    if (!examSetupTypeId) {
      return res.status(400).send("ExamTypeId is required");
    }
    const updatedBy = req.user.userId;
    const examDetails = await examStructureServices.updateExamType(examSetupTypeId, req.body, updatedBy);
    res.status(200).json({ message: "Exam Type updated successfully", examDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function deleteExamType(req, res) {
  try {
    const { examSetupTypeId } = req.params;

    if (!examSetupTypeId) {
      return res.status(400).json({ message: "examSetupTypeId is required" });
    }
    const deleted = await examStructureServices.deleteExamType(examSetupTypeId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for exam type ID ${examSetupTypeId}` });
    } else {
      res.status(404).json({ message: "Exam examType not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};