import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  // 如果路由标记为跳过认证，则直接通过
  if (req.skipAuth) {
    return next();
  }

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ msg: "无token，授权被拒绝" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token无效" });
  }
};
