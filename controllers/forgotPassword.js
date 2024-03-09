const path = require("path");
const bcrypt = require("bcrypt");
const Sib = require("sib-api-v3-sdk");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/users");
const ForgotPassword = require("../models/forgotPassword");

const saltRounds = 10;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const recipientEmail = await User.findOne({ email: email });

    if (!recipientEmail) {
      return res
        .status(404)
        .json({ message: "Please provide the registered email!" });
    }

    const requestId = uuidv4(); // Generate request ID
    await ForgotPassword.create({
      active: true,
      userId: recipientEmail._id,
      requestId: requestId, // Save request ID
    });

    // Setup SendInBlue client
    const client = Sib.ApiClient.instance;
    const apiKey = client.authentications["api-key"];
    apiKey.apiKey = process.env.API_KEY_BREVO;
    const transEmailApi = new Sib.TransactionalEmailsApi();
    const sender = {
      email: "abhishekgupta201024@gmail.com",
      name: "Expense-Tracker",
    };
    const receivers = [{ email: email }];
    await transEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "Expense Tracker Reset Password",
      textContent: "Link Below",
      htmlContent: `<h3>Hi! We got the request from you for resetting the password. Here is the link below >>></h3>
                    <a href="http://localhost:5500/password/resetPassword/${requestId}"> Click Here</a>`,
      params: { requestId: requestId },
    });

    return res.status(200).json({
      message:
        "Link for reset the password is successfully sent on your Mail Id!",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(409).json({ message: "Failed changing password" });
  }
};

const resetPassword = async (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "../views/resetPassword.html"));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const resetRequestId = req.headers.referer.split("/").pop();
    const { password } = req.body;

    const checkResetRequest = await ForgotPassword.findOne({
      requestId: resetRequestId,
      active: true,
    });

    if (checkResetRequest) {
      const newPassword = await hashPassword(password);
      await User.updateOne(
        { _id: checkResetRequest.userId },
        { password: newPassword }
      );
      await ForgotPassword.updateOne(
        { requestId: resetRequestId },
        { active: false }
      );

      return res
        .status(200)
        .json({ message: "Successfully changed password!" });
    } else {
      return res
        .status(409)
        .json({ message: "Link is already Used Once, Request for new Link!" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(409).json({ message: "Failed to change password!" });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  updatePassword,
};
