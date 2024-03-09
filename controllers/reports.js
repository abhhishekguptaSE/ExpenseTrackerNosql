const Expense = require("../models/expense");
const Download = require("../models/download");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");

const dailyReport = async (req, res) => {
  const date = req.body.date;

  try {
    const expenses = await Expense.find({
      UserId: new mongoose.Types.ObjectId(req.user._id),
      createdAt: {
        $gte: new Date(date + "T00:00:00Z"),
        $lte: new Date(date + "T23:59:59Z"),
      },
    });

    if (!expenses.length) {
      return res.status(404).json({ message: "Expenses not found" });
    }

    res.status(200).json({ data: expenses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const monthReport = async (req, res) => {
  const month = req.body.month;

  try {
    const user = await Expense.find({
      UserId: new mongoose.Types.ObjectId(req.user._id),
      createdAt: {
        $gte: new Date(`${month}-01T00:00:00Z`),
        $lt: new Date(`${month}-01T00:00:00Z`).setMonth(
          new Date(`${month}-01T00:00:00Z`).getMonth() + 1
        ),
      },
    });

    if (!user || !user.length) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const generatePDF = (expenses) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const pdfBuffer = [];

    doc.on("data", (chunk) => pdfBuffer.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(pdfBuffer)));

    // Create a PDF document
    doc.fontSize(18).text("Expense Report", { align: "center" });
    doc.moveDown();

    // Define table headers and calculate column widths
    const tableHeaders = ["Date", "Amount", "Description", "Category"];

    const columnWidths = calculateColumnWidths(tableHeaders, expenses);

    // Function to draw a page with the table
    const drawPage = (expensesPage) => {
      doc.font("Helvetica-Bold");

      const startX = 50; // Starting X position
      const startY = doc.y; // Starting Y position
      const rowHeight = 20; // Height of each row

      // Calculate column widths
      const columnWidths = [
        100, // Width for Date
        100, // Width for Amount
        200, // Width for Description
        100, // Width for Category
      ];

      // Draw headers
      doc.text("Date", startX, startY, {
        width: columnWidths[0],
        align: "left",
      });
      doc.text("Amount", startX + columnWidths[0], startY, {
        width: columnWidths[1],
        align: "left",
      });
      doc.text(
        "Description",
        startX + columnWidths[0] + columnWidths[1],
        startY,
        { width: columnWidths[2], align: "left" }
      );
      doc.text(
        "Category",
        startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        startY,
        { width: columnWidths[3], align: "left" }
      );

      doc.moveDown();

      // Draw expense data
      doc.font("Helvetica");
      expensesPage.forEach((expense) => {
        const createdAt = new Date(expense.createdAt);
        const year = createdAt.getUTCFullYear();
        const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
        const day = String(createdAt.getUTCDate()).padStart(2, "0");
        const formattedDate = `${day}-${month}-${year}`;

        doc.text(formattedDate, startX, doc.y, {
          width: columnWidths[0],
          align: "left",
        });
        doc.text(expense.amount.toString(), startX + columnWidths[0], doc.y, {
          width: columnWidths[1],
          align: "left",
        });
        doc.text(
          expense.description,
          startX + columnWidths[0] + columnWidths[1],
          doc.y,
          { width: columnWidths[2], align: "left" }
        );
        doc.text(
          expense.category,
          startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
          doc.y,
          { width: columnWidths[3], align: "left" }
        );

        doc.moveDown();
      });
    };

    // Calculate how many rows fit on a page
    const rowsPerPage = Math.floor((doc.page.height - doc.y) / 20);

    for (let i = 0; i < expenses.length; i += rowsPerPage) {
      const expensesPage = expenses.slice(i, i + rowsPerPage);

      if (i > 0) {
        doc.addPage();
      }

      drawPage(expensesPage);
    }

    doc.end();
  });
};

// Function to calculate column widths based on content length
function calculateColumnWidths(headers, data) {
  const minWidth = 80; // Minimum column width
  const maxWidth = 200; // Maximum column width

  const columnWidths = headers.map((header, index) => {
    const contentWidth = Math.max(
      header.length * 10,
      ...data.map((row) =>
        row[header] ? row[header].toString().length * 7 : 0
      )
    );
    return Math.min(maxWidth, Math.max(minWidth, contentWidth));
  });

  return columnWidths;
}

function uploadToS3(data, filename) {
  const BUCKET_NAME = process.env.BUCKET_NAME;
  const IAM_USER_KEY = process.env.IAM_USER_KEY;
  const IAM_USER_SECRET = process.env.IAM_USER_SECRET;

  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET,
  });

  var params = {
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: data,
    ACL: "public-read",
  };
  return new Promise((resolve, reject) => {
    s3bucket.upload(params, (err, s3response) => {
      if (err) {
        reject(err);
        console.log("Something is wrong", err);
      } else {
        resolve(s3response.Location);
        console.log("success", s3response);
      }
    });
  });
}

const downloadReport = async (req, res) => {
  try {
    const expenses = await Expense.find({
      UserId: new mongoose.Types.ObjectId(req.user._id),
    });
    const pdfBuffer = await generatePDF(expenses);
    const userId = req.user._id;
    const filename = `Expense${userId}/${new Date()}.pdf`;
    const fileURl = await uploadToS3(pdfBuffer, filename);
    // Saving FileUrl
    await Download.create({
      UserId: userId,
      link: fileURl,
    });

    res.status(200).json({ fileURl, success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ fileURl: "", success: false });
  }
};

const prevReport = async (req, res) => {
  try {
    const data = await Download.find({
      UserId: new mongoose.Types.ObjectId(req.user._id),
    });
    if (!data.length) {
      return res.status(404).json({ message: "Data Unavailable" });
    }
    res.status(200).json({ data });
  } catch (err) {
    console.log(err);
  }
};
module.exports = {
  dailyReport,
  monthReport,
  downloadReport,
  prevReport,
};
