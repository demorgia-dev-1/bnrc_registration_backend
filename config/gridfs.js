
const { GridFsStorage } = require("multer-gridfs-storage");

const multer = require('multer');

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";

const storage = new GridFsStorage({
  url: mongoURI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      if (!file.originalname) {
        return reject(new Error("No file provided"));
      }

      const filename = `${Date.now()}-${file.originalname}`;
      const fileInfo = {
        filename,
        bucketName: "uploads",
        metadata: {
          originalname: file.originalname
        }
      };
      resolve(fileInfo);
    });
  }
});

const upload = multer({ storage });
module.exports = upload;
