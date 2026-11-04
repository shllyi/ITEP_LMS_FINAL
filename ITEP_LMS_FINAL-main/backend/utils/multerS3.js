const multer = require('multer');

// Use memory storage — we upload to S3 manually
const storage = multer.memoryStorage();

const presentationUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pptx', '.pdf', '.ppt'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .pptx, .ppt and .pdf files are allowed for presentations.'));
    }
  },
});

const quizDocUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf, .docx, and .txt files are allowed for quiz extraction.'));
    }
  },
});

module.exports = { presentationUpload, quizDocUpload };
