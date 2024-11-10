const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config(); // Require dotenv for environment variables

// Set up MongoDB connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = 'scholarshipDB';
let db;

// Initialize MongoDB connection
MongoClient.connect(mongoUrl)
    .then(client => {
        console.log("Connected to MongoDB");
        db = client.db(dbName);
    })
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static('public')); // Serve static files

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, // Your email from environment variable
        pass: process.env.EMAIL_PASS  // Your password (use app password or OAuth)
    }
});

// Function to send email notification
function sendEmail(to, subject, text) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log('Error sending email:', err);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

// Route to handle the form submission
app.post('/submit-application', upload.array('documents', 10), async (req, res) => {
    const applicantData = {
        name: req.body.name,
        email: req.body.email,
        gpa: req.body.gpa,
        essay: req.body.essay,
    };

    try {
        const collection = db.collection('applications');
        await collection.insertOne(applicantData);
        console.log('Application saved to database:', applicantData);

        // Send email notification to the applicant and admin
        sendEmail(
            applicantData.email,
            'Scholarship Application Submission',
            `Dear ${applicantData.name},\n\nThank you for applying for the XYZ scholarship. Your application has been received.\n\nBest Regards,\nScholarship Team`
        );

        sendEmail(
            'dushyanthd912@gmail.com', // Replace with actual admin email
            'New Scholarship Application Received',
            `A new application has been submitted by ${applicantData.name}. Please review the application.`
        );

        res.send('Application submitted successfully! Email notification sent.');
    } catch (err) {
        console.error('Error saving to database:', err);
        res.status(500).send('An error occurred while submitting your application.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
