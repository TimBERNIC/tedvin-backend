const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization.replace("Bearer ", "");
  const foundUser = await User.findOne({ token: token });

  if (foundUser === null) {
    return res.status(401).json({ message: "Unauthorized access" });
  } else {
    req.user = foundUser;
    next();
  }
};

module.exports = isAuthenticated;
