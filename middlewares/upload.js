const multer = require("multer");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb"); // Add this import

// MongoDB connection
const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";

// Create MongoDB connection directly for GridFS
let conn;
let bucket;
let mongoClient;

// Initialize connection - export as a function to be awaited in server.js
const initConnection = async () => {
  if (!bucket) {
    console.log("Initializing GridFS connection...");
    try {
      // Use MongoClient directly instead of mongoose.createConnection
      mongoClient = new MongoClient(mongoURI);
      await mongoClient.connect();

      // Get the database
      const db = mongoClient.db();
      console.log("MongoDB client connected");

      // Create bucket
      bucket = new GridFSBucket(db, {
        bucketName: "uploads",
      });

      console.log("GridFS bucket initialized successfully");
      return true;
    } catch (err) {
      console.error("Failed to connect to GridFS:", err);
      throw err;
    }
  }
  return true;
};

// Set up temporary storage
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, "../temp-uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// Configure multer
const upload = multer({
  storage: tempStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Function to upload file to GridFS
const uploadToGridFS = async (file) => {
  // Check if bucket is initialized, if not try to initialize
  if (!bucket) {
    console.log("Bucket not initialized, attempting to initialize...");
    await initConnection();

    // Double-check after initialization
    if (!bucket) {
      throw new Error("Failed to initialize GridFS bucket");
    }
  }

  return new Promise((resolve, reject) => {
    try {
      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${file.originalname}`;

      console.log(`Creating file stream for ${file.originalname}`);

      // Use buffer approach instead of streams for reliability
      const fileBuffer = fs.readFileSync(file.path);
      console.log(`Read file into buffer: ${fileBuffer.length} bytes`);

      // Create GridFS upload stream
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        contentType: file.mimetype,
        metadata: {
          originalname: file.originalname,
          fieldname: file.fieldname,
        },
      });

      console.log(
        `Starting upload for file ID: ${uploadStream.id} (${uniqueFilename})`
      );

      // Handle errors
      uploadStream.on("error", (error) => {
        console.error(`Error uploading to GridFS: ${error.message}`);
        fs.unlinkSync(file.path); // Clean up
        reject(error);
      });

      // When upload finishes
      uploadStream.on("finish", () => {
        console.log(`File uploaded successfully to GridFS: ${uniqueFilename}`);

        // Delete temp file
        fs.unlinkSync(file.path, (err) => {
          if (err) {
            console.warn(`Warning: Could not delete temp file: ${err.message}`);
          }
        });

        // Resolve with file info
        resolve({
          id: uploadStream.id,
          filename: uniqueFilename,
          fieldName: file.fieldname,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        });
      });

      // Write directly to upload stream instead of piping
      uploadStream.write(fileBuffer);
      uploadStream.end();
    } catch (error) {
      console.error(`Exception in uploadToGridFS: ${error.message}`);

      // Clean up temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignore cleanup errors
      }

      reject(error);
    }
  });
};

// Function to get file by ID (useful for downloads)
const getFileById = async (fileId) => {
  if (!bucket) {
    await initConnection();
  }

  return new Promise((resolve, reject) => {
    try {
      const downloadStream = bucket.openDownloadStream(
        new mongoose.Types.ObjectId(fileId)
      );

      const chunks = [];
      downloadStream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on("error", (error) => {
        console.error(`Error downloading file: ${error.message}`);
        reject(error);
      });

      downloadStream.on("end", () => {
        const fileData = Buffer.concat(chunks);
        resolve(fileData);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Export everything needed
module.exports = {
  upload,
  uploadToGridFS,
  getFileById,
  initConnection,
  bucket: () => bucket,
  connection: () => mongoClient,
};
