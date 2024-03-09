const User = require('../models/users'); // Make sure to replace 'User' with your actual Mongoose model

const getUserLeaderBoard = async (req, res) => {
  try {
    const leaderboardOfUsers = await User.find({})
      .select('name totalExpenses')
      .sort({ totalExpenses: -1 })
      .exec();

    // console.log(leaderboardOfUsers);
    res.status(200).json(leaderboardOfUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

module.exports = {
  getUserLeaderBoard,
};
