const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const downloadSchema = new Schema({
  link: {
    type: String,
    required: true,
  },
  UserId: {
    type: Schema.Types.ObjectId,
    ref: "Users", // Use the correct model name here
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Download = mongoose.model("Download", downloadSchema);

module.exports = Download;
