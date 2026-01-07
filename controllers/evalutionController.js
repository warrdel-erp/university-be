import * as evaluationService  from  "../services/evalutionService.js";

export async function addEvaluation(req, res) {
  const { evalutions } = req.body;

  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const universityId = req.user.universityId;
  const instituteId = req.user.instituteId;

  try {
    if (!Array.isArray(evalutions) || evalutions.length === 0) {
      return res.status(400).send("evalutions array is required");
    }

   const result = await evaluationService.addEvaluation( evalutions, createdBy, updatedBy, universityId, instituteId );

    res.status(201).json({
      message: "evaluations added successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


export async function getAllEvaluation(req, res) {
    const universityId = req.user.universityId;
    const { examSetupTypeId } = req.query;
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    try {
        const evaluation = await evaluationService.getEvaluationDetails(universityId,examSetupTypeId,role,instituteId);
        res.status(200).json(evaluation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleEvaluationDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { evaluationId } = req.query;
        const evaluation = await evaluationService.getSingleEvaluationDetails(evaluationId,universityId);
        if (evaluation) {
            res.status(200).json(evaluation);
        } else {
            res.status(404).json({ message: "evaluation not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateEvaluation(req, res) {
    try {
        const {evalutionId} = req.body
        if(!(evalutionId)){
            return res.status(400).send('evaluationId is required')
         }
         const updatedBy = req.user.userId;
        const updatedEvaluations = await evaluationService.updateEvaluation(evalutionId, req.body,updatedBy);
            res.status(200).json({message: "evaluation update succesfully",updatedEvaluations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteEvaluation(req, res) {
    try { 
        const { evaluationId } = req.query;
        if (!evaluationId) {
            return res.status(400).json({ message: "evaluationId is required" });
        }
        const deleted = await evaluationService.deleteEvaluation(evaluationId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for evaluation ID ${evaluationId}` });
        } else {
            res.status(404).json({ message: "evaluation not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}