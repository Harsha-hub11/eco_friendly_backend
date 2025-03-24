import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { db, execQuery, beginTransaction, commitTransaction, rollbackTransaction } from './db/db.js';
import { LoginAppCtrl, createUserCtrl } from './app/controller/authenticationController.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, GET, DELETE');
        return res.status(200).json({});
    }
    next();
});

// Authentication routes
app.post("/eco_friendly/login", LoginAppCtrl);
app.post("/eco_friendly/register", createUserCtrl);

// GET endpoint to fetch all Products
app.get('/products', (req, res) => {
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching from products table:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch from products table' });
            return;
        }
        console.log('Fetched from products table:', results);
        res.status(200).json({ status: 200, data: results });
    });
});

app.post('/contactus', (req, res) => {
    const { firstName, lastName, phoneNumber, email, message } = req.body;
    const sql = 'INSERT INTO ContactUs (firstName, lastName, phoneNumber, email_id, message) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [firstName, lastName, phoneNumber, email, message], (err, result) => {
        if (err) {
            console.error('Error inserting into ContactUs table:', err);
            res.status(500).json({ status: 500, message: 'Failed to insert into ContactUs table' });
            return;
        }
        console.log('Inserted into ContactUs table:', result);
        res.status(200).json({ status: 200, message: 'Contact details inserted successfully' });
    });
});

// GET endpoint to fetch all contacts
app.get('/contacts', (req, res) => {
    const sql = 'SELECT * FROM ContactUs';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching from ContactUs table:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch from ContactUs table' });
            return;
        }
        console.log('Fetched from ContactUs table:', results);
        res.status(200).json({ status: 200, data: results });
    });
});


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
