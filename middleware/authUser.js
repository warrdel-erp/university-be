import jwt from "jsonwebtoken";
import { findEmailByEmail } from "../repository/userRepository.js";
import {
  requestContext,
  buildRequestContextStore,
} from "../utility/requestContext.js";

export default async function useAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;

    if (!email) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Fetch user details from email
    const userDetail = await findEmailByEmail(email);
    if (!userDetail) {
      return res.status(401).json({ message: "Invalid user" });
    }

    req.user = userDetail;

    console.log("req.user.dataValues.defaultInstituteId", req.user.dataValues.defaultInstituteId)

    // Build the request context store with tenant scoping info
    const store = await buildRequestContextStore({
      userId: req.user.dataValues.userId,
      defaultInstituteId: req.user.dataValues.defaultInstituteId,
      universityId: req.user.dataValues.universityId,
      defaultRole: req.user.defaultRole,
      defaultAcademicYearId: req.user.defaultAcademicYearId,
      bypass: req.bypassScope,
    });

    requestContext.run(store, () => {
      next();
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
