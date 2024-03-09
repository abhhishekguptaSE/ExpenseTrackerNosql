const jwt = require("jsonwebtoken");
const User = require("../models/users");
const mongoose = require("mongoose");

const authenticate = (req, res, next) => {
  try {
    const token = req.header("Authorization");
    // console.log(token);
    const user = jwt.verify(token, process.env.TOKEN);
    const objectIdUserId = new mongoose.Types.ObjectId(user.userId);
    User.findById(objectIdUserId).then((user) => {
      req.user = user;
      next();
    });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ success: false });
  }
};

module.exports = {
  authenticate,
};
