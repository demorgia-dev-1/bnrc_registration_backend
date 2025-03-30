require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { initConnection } = require("./middlewares/upload");
const multer = require("multer");
const { MongoClient } = require("mongodb");
const { GridFsStorage } = require("multer-gridfs-storage");
const ExcelJS = require("exceljs");

const formRoutes = require("./routes/formRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const gridFsRoutes = require("./routes/gridRoutes");
const downloadRoutes = require("./routes/downloadRoutes");
const adminAuth = require("./routes/adminAuth");
// const { default: products } = require("razorpay/dist/types/products");

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://forms.demorgia.com"]
    : ["http://localhost:3000"];

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

async function startServer() {
  try {
    await mongoose.connect(mongoURI);
    await initConnection();
    console.log("MongoDB connected (Mongoose)");
    app.use(express.json({ limit: "100mb" }));
    app.use(express.urlencoded({ limit: "100mb", extended: true }));
    app.use("/api", formRoutes);
    app.use("/api/payment", paymentRoutes);
    app.use("/api", receiptRoutes);
    app.use("/api", gridFsRoutes);
    app.use("/api/download", downloadRoutes);
    app.use("/api/admin", adminAuth);

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(" Error starting server:", error);
    process.exit(1);
  }
}

startServer();
