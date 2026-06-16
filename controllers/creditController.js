import * as creditService from '../services/creditServices.js';

export async function addCredit(req, res) {
  const { credits } = req.body;

  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const universityId = req.user.universityId;
  const instituteId = req.user.defaultInstituteId;

  try {
    if (!Array.isArray(credits) || credits.length === 0) {
      return res.status(400).send('credits array is required');
    }

    const enrichedCredits = credits.map((item) => ({
      ...item,
      universityId,
      instituteId,
    }));

    const result = await creditService.addCredit(enrichedCredits, createdBy, updatedBy);

    res.status(201).json({
      message: 'Credits added successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllCredit(req, res) {
  const { courseId, sessionId } = req.query;
  try {
    const Credit = await creditService.getCreditDetails(courseId, sessionId);
    res.status(200).json(Credit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSingleCreditDetails(req, res) {
  try {
    const { creditId } = req.query;
    const Credit = await creditService.getSingleCreditDetails(creditId);
    if (Credit) {
      res.status(200).json(Credit);
    } else {
      res.status(404).json({ message: 'Credit not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateCredit(req, res) {
  try {
    const { creditId } = req.body;
    if (!creditId) {
      return res.status(400).send('creditId is required');
    }
    const updatedBy = req.user.userId;
    await creditService.updateCredit(creditId, req.body, updatedBy);
    res.status(200).json({ message: 'Credit update succesfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCredit(req, res) {
  try {
    const { creditId } = req.query;
    if (!creditId) {
      return res.status(400).json({ message: 'creditId is required' });
    }
    const deleted = await creditService.deleteCredit(creditId);
    if (deleted) {
      res.status(200).json({ message: `Delete successful for Credit ID ${creditId}` });
    } else {
      res.status(404).json({ message: 'Credit not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
