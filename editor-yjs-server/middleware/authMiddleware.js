import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  // If route is marked to skip authentication, pass directly
  if (req.skipAuth) {
    return next();
  }

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};
