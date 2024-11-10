const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer'); // Import nodemailer
const path = require('path');
const { MongoClient } = require('mongodb');

// Set up MongoDB connection
const mongoUrl = 'mongodb://localhost:27017'; // Update with your MongoDB URL if needed
const dbName = 'scholarshipDB';
let db;

// Initialize MongoDB connection
MongoClient.connect(mongoUrl)

    .then(client => {
        console.log("Connected to MongoDB");
        db = client.db(dbName);
    })
    .catch(err => console.error(err));

const app = express();
const port = 3000;

// Middleware to serve static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // or use another email service
    auth: {
        user: 'your-email@gmail.com', // Your email
        pass: 'your-email-password'   // Your password (use app password or OAuth for better security)
    }
});

// Function to send email notification
function sendEmail(to, subject, text) {
    const mailOptions = {
        from: 'your-email@gmail.com',
        to,
        subject,
        text
    };

    transporter.sendMail(mailOptions, function (err, info) {
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

    // Store the application data in MongoDB
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
            'dushyanthd912@gmail.com', // Admin email
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
