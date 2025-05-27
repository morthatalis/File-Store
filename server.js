const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Middleware to log IP and redirect /index.html
app.use((req, res, next) => {
  if (req.path === "/index.html") {
    return res.redirect(301, "/");
  }
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    const userIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(`Request from IP: ${userIp}`);
  }
  next();
});

// Generate a unique short code
function generateCode() {
  return crypto.randomBytes(3).toString('hex'); // 6-char code
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const original = file.originalname.slice(0, 50);
    const code = generateCode();
    const ext = path.extname(original);
    const base = path.basename(original, ext);
    const finalName = `${code}-${base}${ext}`;
    cb(null, finalName);
  }
});

const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const filename = req.file.filename;
  const code = filename.split('-')[0];
  res.send({
    filename,
    code,
    type: path.extname(filename).slice(1),
    path: `/uploads/${filename}`
  });
});

// Download file by code
app.get('/file/:code', (req, res) => {
  const code = req.params.code;
  const files = fs.readdirSync(uploadDir);
  const match = files.find(f => f.startsWith(code + '-'));
  if (!match) return res.status(404).send('File not found.');
  res.download(path.join(uploadDir, match));
});

// List files
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).send('Error reading files.');
    const result = files.map(f => {
      const code = f.split('-')[0];
      const type = path.extname(f).slice(1);
      return { name: f, code, type };
    });
    res.json(result);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
