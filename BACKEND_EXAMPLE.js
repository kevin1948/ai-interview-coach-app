/**
 * BACKEND EXAMPLE - Node.js/Express
 *
 * This is a reference implementation for the resume upload API
 * Place this in your backend server (running on localhost:8000)
 */

// ============ USING EXPRESS ============

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

// Configure upload directory
const uploadDir = path.join(__dirname, "uploads", "resumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "resume-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Enable CORS if frontend is on different port
const cors = require("cors");
app.use(cors());
app.use(express.json());

// ============ ENDPOINTS ============

/**
 * POST /api/resume/upload
 * Upload a new resume
 */
app.post("/api/resume/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
      success: true,
      message: "Resume uploaded successfully",
      resumeId: req.file.filename,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload resume",
    });
  }
});

/**
 * GET /api/resume/history
 * Get list of all uploaded resumes
 */
app.get("/api/resume/history", (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const resumes = files.map((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      return {
        resumeId: file,
        fileName: file.replace(/.pdf$/, ""),
        fileSize: stats.size,
        uploadedAt: stats.birthtime,
      };
    });

    res.json({
      success: true,
      resumes: resumes,
      total: resumes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch resume history",
    });
  }
});

/**
 * GET /api/resume/parse/:resumeId
 * Parse resume and extract information (requires PDF parsing library)
 */
app.get("/api/resume/parse/:resumeId", async (req, res) => {
  try {
    const { resumeId } = req.params;
    const filePath = path.join(uploadDir, resumeId);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Example: Parse PDF and extract info
    // You would use a library like 'pdf-parse' or 'pdfjs-dist'
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    res.json({
      success: true,
      resumeId: resumeId,
      text: data.text,
      pages: data.numpages,
      // Additional parsed data would go here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to parse resume",
    });
  }
});

/**
 * DELETE /api/resume/:resumeId
 * Delete a resume
 */
app.delete("/api/resume/:resumeId", (req, res) => {
  try {
    const { resumeId } = req.params;
    const filePath = path.join(uploadDir, resumeId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: "Resume deleted successfully",
      resumeId: resumeId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete resume",
    });
  }
});

// ============ ERROR HANDLING ============

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        success: false,
        message: "File is too large. Maximum 5MB allowed.",
      });
    }
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "An error occurred",
  });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Resume API server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${uploadDir}`);
});

// ============ REQUIRED PACKAGES ============
/*
npm install express multer cors

Optional (for PDF parsing):
npm install pdf-parse
*/

// ============ SETUP INSTRUCTIONS ============
/*
1. Create a new Node.js project:
   mkdir resume-api-server
   cd resume-api-server
   npm init -y

2. Install dependencies:
   npm install express multer cors

3. Create this file as server.js

4. Run the server:
   node server.js

5. Your server will be available at http://localhost:8000

6. The API endpoints will be:
   - POST   http://localhost:8000/api/resume/upload
   - GET    http://localhost:8000/api/resume/history
   - GET    http://localhost:8000/api/resume/parse/:resumeId
   - DELETE http://localhost:8000/api/resume/:resumeId
*/
