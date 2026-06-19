import * as syllabusCreation from '../services/syllabusServices.js';

export async function addSyllabus(req, res) {
  const { courseId, acedmicYearId, instituteId } = req.body;
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    if (!courseId || !acedmicYearId || !instituteId) {
      return res.status(400).send('courseId,acedmicYearId and instituteId is required');
    }
    const Syllabus = await syllabusCreation.addSyllabus(req.body, createdBy, updatedBy);
    if (Syllabus) {
      res.status(201).json({ message: 'Data added successfully', Syllabus });
    } else {
      res.status(404).json({ message: 'something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllSyllabus(req, res) {
  const { acedmicYearId } = req.query;
  try {
    const syllabus = await syllabusCreation.getSyllabusDetails(acedmicYearId);
    res.status(200).json(syllabus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSingleSyllabusDetails(req, res) {
  try {
    const { SyllabusId } = req.query;
    const Syllabus = await syllabusCreation.getSingleSyllabusDetails(SyllabusId);
    if (Syllabus) {
      res.status(200).json(Syllabus);
    } else {
      res.status(404).json({ message: 'Syllabus not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateSyllabus(req, res) {
  try {
    const { SyllabusId } = req.body;
    if (!SyllabusId) {
      return res.status(400).send('SyllabusId is required');
    }
    const updatedBy = req.user.userId;
    await syllabusCreation.updateSyllabus(SyllabusId, req.body, updatedBy);
    res.status(200).json({ message: 'Syllabus update succesfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSyllabus(req, res) {
  try {
    const { SyllabusId } = req.query;
    if (!SyllabusId) {
      return res.status(400).json({ message: 'SyllabusId is required' });
    }
    const deleted = await syllabusCreation.deleteSyllabus(SyllabusId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for Syllabus ID ${SyllabusId}` });
    } else {
      res.status(404).json({ message: 'Syllabus not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function courseAllSubject(req, res) {
  try {
    const { courseId, sessionId } = req.query;
    if (!courseId || !sessionId) {
      return res.status(400).send('courseId and sessionId is required');
    }
    const Syllabus = await syllabusCreation.courseAllSubject(courseId, sessionId);
    if (Syllabus) {
      res.status(200).json(Syllabus);
    } else {
      res.status(404).json({ message: 'Syllabus not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function addSyllabusUnit(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    const Syllabus = await syllabusCreation.addSyllabusUnit(req.body, createdBy, updatedBy);
    if (Syllabus) {
      res.status(201).json({ message: 'Data added successfully', Syllabus });
    } else {
      res.status(404).json({ message: 'something went wrong' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function syllabusUnitGet(req, res) {
  try {
    const syllabus = await syllabusCreation.syllabusUnitGet(req.query);
    res.status(200).json(syllabus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateSyllabusUnit(req, res) {
  try {
    const { syllabusUnitId, acedmicYearId } = req.body;
    const updatedBy = req.user.userId;
    const updated = await syllabusCreation.updateSyllabusUnit(
      syllabusUnitId,
      acedmicYearId,
      req.body,
      updatedBy
    );

    if (!updated) {
      return res.status(404).json({ message: 'Syllabus unit not found' });
    }

    res.status(200).json({ message: 'Syllabus unit updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSyllabusUnit(req, res) {
  try {
    const { syllabusUnitId, acedmicYearId } = req.query;
    const deleted = await syllabusCreation.deleteSyllabusUnit(
      Number(syllabusUnitId),
      Number(acedmicYearId)
    );

    if (!deleted) {
      return res.status(404).json({ message: 'Syllabus unit not found' });
    }

    res.status(200).json({ message: `Delete successful for syllabus unit ID ${syllabusUnitId}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function semesterAllSubject(req, res) {
  try {
    const { semesterId } = req.query;
    if (!semesterId) {
      return res.status(400).send('semesterId is required');
    }
    const Syllabus = await syllabusCreation.semesterAllSubject(semesterId);
    if (Syllabus) {
      res.status(200).json(Syllabus);
    } else {
      res.status(404).json({ message: 'Syllabus subject not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
