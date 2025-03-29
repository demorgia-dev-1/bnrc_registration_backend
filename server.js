
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const { MongoClient } = require("mongodb");
const { GridFsStorage } = require("multer-gridfs-storage");
const ExcelJS = require("exceljs");

const formRoutes = require("./routes/formRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const gridFsRoutes = require("./routes/gridRoutes");
const downloadRoutes = require("./routes/downloadRoutes");
const adminAuth = require("./routes/adminAuth")

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";

// Middleware
const origin = process.env.NODE_ENV=== 'production' ? "https://forms.demorgia.com" : "http://localhost:3000";
app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// app.use(express.urlencoded({ extended: true }));
   console.log("origin", origin)

async function startServer() {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected (Mongoose)");

    const mongoClient = new MongoClient(mongoURI);
    await mongoClient.connect();
    const db = mongoClient.db();
    console.log("MongoClient connected");


    const multer = require('multer');

    const storage = new GridFsStorage({
      url: mongoURI,
      options: { useNewUrlParser: true, useUnifiedTopology: true },
      file: (req, file) => {
        return {
          filename: `${Date.now()}-${file.originalname}`,
          bucketName: 'uploads',
          metadata: {
            fieldName: file.fieldname,
            originalname: file.originalname
          }
        };
      }
    });

    const upload = multer({ storage });

    //  Attach to req
    app.use((req, res, next) => {
      req.upload = upload;
      next();
    });

    // Mount routes
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

