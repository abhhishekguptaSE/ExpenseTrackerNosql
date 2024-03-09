const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const expenseSchema = new Schema({
  amount: {
    type: Number,
  },
  category: {
    type: String,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  UserId: {
    type: Schema.Types.ObjectId,
    ref: "Users", // Use the correct model name here
  },
});

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;
