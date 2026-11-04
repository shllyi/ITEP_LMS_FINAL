const multer = require("multer");

const upload = multer({
    limits: { fileSize: 100 * 1024 * 1024 }, 
    storage: multer.memoryStorage(), 
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('Unsupported file type!'), false);
            return;
        }
        cb(null, true);
    },
});

module.exports = upload;