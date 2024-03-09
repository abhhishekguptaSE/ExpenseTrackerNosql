const Expense = require("../models/expense");
const Users = require("../models/users");
const mongoose = require("mongoose");
const addExpense = async (req, res, next) => {
  function isStringValidate(string) {
    return string === undefined || string.length === 0;
  }

  try {
    const session = await mongoose.startSession();
    // console.log("Session started: ", session.id);
    session.startTransaction();

    try {
      const { amount, description, category } = req.body;

      if (
        isStringValidate(amount) ||
        isStringValidate(description) ||
        isStringValidate(category)
      ) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Parameters missing" });
      }

      const objectIdUserId = new mongoose.Types.ObjectId(req.user._id);
      // console.log("Session ID: ", session.id);

      const expenseData = {
        amount: Number(amount),
        description: description,
        category: category,
        UserId: objectIdUserId,
      };

      const expense = await Expense.create([expenseData], { session: session });
      // console.log("Expense created: ", expense);

      const newTotalExpenses = Number(req.user.totalExpenses) + Number(amount);
      const userUpdateResult = await Users.updateOne(
        { _id: objectIdUserId },
        { $set: { totalExpenses: Number(newTotalExpenses) } },
        { session: session }
      );
      // console.log("User update result: ", userUpdateResult);

      if (userUpdateResult.modifiedCount !== 1) {
        throw new Error("User update failed");
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ success: true, data: expense });
    } catch (err) {
      console.log(err);
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message, success: false });
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (limit > 50) {
      limit = 50;
    }

    const skip = (page - 1) * limit;

    const expenses = await Expense.find({ UserId: req.user._id })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalExpensesCount = await Expense.countDocuments({
      UserId: req.user._id,
    });

    const data = {
      current: page,
      start: skip + 1,
      end: Math.min(skip + limit, totalExpensesCount),
      count: totalExpensesCount,
      result: expenses,
    };

    if (page > 1) {
      data.previous = page - 1;
    }

    if (skip + limit < totalExpensesCount) {
      data.next = page + 1;
    }

    return res.status(200).json({ data, success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error Occurred", success: false });
  }
};

const deleteExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expenseId = req.params.expenseid;
    // console.log(expenseId);

    if (!expenseId) {
      return res.status(400).json({ success: false });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    await Users.findByIdAndUpdate(
      new mongoose.Types.ObjectId(req.user._id),
      {
        $inc: { totalExpenses: -expense.amount },
      },
      { session }
    );

    await Expense.deleteOne(
      {
        _id: new mongoose.Types.ObjectId(expenseId),
        UserId: new mongoose.Types.ObjectId(req.user._id),
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Deleted Successfully",
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed",
    });
  }
};

module.exports = {
  deleteExpense,
  getExpenses,
  addExpense,
};
