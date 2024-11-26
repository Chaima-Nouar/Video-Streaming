const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/processed", express.static(path.join(__dirname, "processed")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${name}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["video/mp4", "video/mkv", "video/avi"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only videos are allowed."));
  },
});

app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    const segmentTime = parseInt(req.body.segmentTime, 10) || 10; // Default to 10 seconds if not provided
    const resolution = req.body.resolution;
    
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    const originalPath = file.path;
    const outputPath = `processed/${path.basename(file.filename, path.extname(file.filename))}_${resolution}.mp4`;

    // Ensure processed directory exists
    if (!fs.existsSync("processed")) fs.mkdirSync("processed");

    // Adjust resolution and process video
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions(`-vf scale=${resolution}`)
        .output(outputPath)
        .on("start", (cmd) => console.log("FFmpeg command:", cmd))
        .on("end", resolve)
        .on("error", (err) => {
          console.error("FFmpeg Error:", err.message);
          reject(err);
        })
        .run();
    });
    console.log("finished");
    
    // Get video duration using ffprobe
    const getVideoDuration = () =>
      new Promise((resolve, reject) => {
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) return reject(err);
          resolve(metadata.format.duration);
        });
      });

    const duration = await getVideoDuration();

    // Generate chapters
    const chapters = [];
    let startTime = 0;
    let chapterIndex = 1;

    while (startTime < duration) {
      const endTime = Math.min(startTime + segmentTime, duration); // Ensure last chapter ends at video duration
      chapters.push({
        title: `Chapter ${chapterIndex}`,
        startTime,
        endTime,
        length: endTime - startTime,
      });
      startTime += segmentTime;
      chapterIndex++;
    }

    res.json({
      message: "Video processed and chapters generated successfully.",
      video: `http://localhost:${PORT}/processed/${path.basename(outputPath)}`, // Processed video URL
      chapters, // Chapter metadata
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
