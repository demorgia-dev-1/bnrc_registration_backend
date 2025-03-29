
const multer = require("multer");
const { MongoClient } = require("mongodb");
const { GridFsStorage } = require("multer-gridfs-storage");
const { ObjectId } = require("mongodb");


const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";

const client = new MongoClient(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let upload;

const connectStorage = async () => {
  if (!upload) {
    await client.connect();
    const db = client.db();

    const storage = new GridFsStorage({
      db,
      file: (req, file) => {
        const generatedId = new ObjectId(); // ✅ Ensure a unique ID is assigned
        console.log("Generated File ID:", generatedId);

        return {
          _id: generatedId, // ✅ Explicitly setting file ID
          filename: `${Date.now()}-${file.originalname}`,
          bucketName: "uploads",
          metadata: {
            originalname: file.originalname,
            fieldName: file.fieldname,
          },
        };
      },
    });
    upload = multer({ storage });
  }

  return upload;
};


module.exports = connectStorage;

