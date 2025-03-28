const express = require("express");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const router = express.Router();

router.get("/file/:filename", async (req, res) => {
  try {
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads"
    });

    const stream = bucket.openDownloadStreamByName(req.params.filename);
    stream.on("error", () => res.status(404).json({ error: "File not found" }));
    stream.pipe(res);
  } catch (error) {
    console.error("Error streaming file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
