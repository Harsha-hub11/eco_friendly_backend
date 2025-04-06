import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import { db, execQuery, beginTransaction, commitTransaction, rollbackTransaction } from './db/db.js';
import { LoginAppCtrl, createUserCtrl } from './app/controller/authenticationController.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));

// Set CORS headers for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, GET, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

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

// CREATE a new product with file upload
app.post('/products', upload.single('product_image'), (req, res) => {
  const { product_name, price, description } = req.body;
  const product_image = req.file ? req.file.filename : null;
  const sql = 'INSERT INTO products (product_name, price, description, product_image) VALUES (?, ?, ?, ?)';
  db.query(sql, [product_name, price, description, product_image], (err, result) => {
    if (err) {
      console.error('Error adding product:', err);
      return res.status(500).json({ status: 500, message: 'Error adding product' });
    }
    res.status(201).json({ status: 201, message: 'Product added successfully' });
  });
});

// UPDATE a product with file upload
app.put('/products/:id', upload.single('product_image'), (req, res) => {
  const { product_name, price, description } = req.body;
  const { id } = req.params;
  // If a file is uploaded, update product_image, otherwise update only other fields
  if (req.file) {
    const product_image = req.file.filename;
    const sql = 'UPDATE products SET product_name = ?, price = ?, description = ?, product_image = ? WHERE product_id = ?';
    db.query(sql, [product_name, price, description, product_image, id], (err, result) => {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ status: 500, message: 'Error updating product' });
      }
      res.status(200).json({ status: 200, message: 'Product updated successfully' });
    });
  } else {
    const sql = 'UPDATE products SET product_name = ?, price = ?, description = ? WHERE product_id = ?';
    db.query(sql, [product_name, price, description, id], (err, result) => {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ status: 500, message: 'Error updating product' });
      }
      res.status(200).json({ status: 200, message: 'Product updated successfully' });
    });
  }
});

// DELETE a product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM products WHERE product_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting product:', err);
      return res.status(500).json({ status: 500, message: 'Error deleting product' });
    }
    res.status(200).json({ status: 200, message: 'Product deleted successfully' });
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

/* ===========================
   ADMIN USER MANAGEMENT APIs
   =========================== */

// GET endpoint to fetch all users (excluding sensitive info)
app.get('/admin/users', (req, res) => {
  const sql = `
    SELECT user_id, user_name, first_name, last_name, email, mobile_no, address, updated_on 
    FROM user
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ status: 500, message: 'Failed to fetch users' });
    }
    res.status(200).json({ status: 200, data: results });
  });
});

// PUT endpoint to update a user by user_id
app.put('/admin/users/:id', (req, res) => {
  const { user_name, first_name, last_name, email, mobile_no, address } = req.body;
  const { id } = req.params;
  const sql = `
    UPDATE user 
    SET user_name = ?, first_name = ?, last_name = ?, email = ?, mobile_no = ?, address = ? 
    WHERE user_id = ?
  `;
  db.query(sql, [user_name, first_name, last_name, email, mobile_no, address, id], (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      return res.status(500).json({ status: 500, message: 'Error updating user' });
    }
    res.status(200).json({ status: 200, message: 'User updated successfully' });
  });
});

// DELETE endpoint to remove a user by user_id
app.delete('/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM user WHERE user_id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ status: 500, message: 'Error deleting user' });
    }
    res.status(200).json({ status: 200, message: 'User deleted successfully' });
  });
});

// Start the server
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
