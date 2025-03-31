const multer = require("multer");
const { MongoClient } = require("mongodb");
const { GridFsStorage } = require("multer-gridfs-storage");

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";

const client = new MongoClient(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let upload;

const connectStorage = async () => {
  if (!upload) {
    await client.connect();
   

    const storage = new GridFsStorage({
      url: mongoURI,
      file: async (req, file) => {
        return {
          filename: `${Date.now()}-${file.originalname}`,
          bucketName: "uploads",
          metadata: {
            originalname: file.originalname,
            fieldName: file.fieldname,
          },
        };
      },
    });

    upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
  }

  return upload;
};

module.exports = connectStorage;
