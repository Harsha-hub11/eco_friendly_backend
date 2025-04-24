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

/* =========================================
   USER PROFILE MANAGEMENT APIs
   ========================================= */

// GET endpoint to fetch a user's own profile (by user_id)
app.get('/user/profile/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT user_id, user_name, first_name, last_name, email, mobile_no, address, updated_on 
    FROM user 
    WHERE user_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ status: 500, message: 'Error fetching user profile' });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }
    res.status(200).json({ status: 200, data: results[0] });
  });
});

// PUT endpoint to update a user's own profile
app.put('/user/profile/:id', (req, res) => {
  const { id } = req.params;
  const { user_name, first_name, last_name, email, mobile_no, address } = req.body;
  const sql = `
    UPDATE user
    SET user_name = ?, first_name = ?, last_name = ?, email = ?, mobile_no = ?, address = ?
    WHERE user_id = ?
  `;
  db.query(sql, [user_name, first_name, last_name, email, mobile_no, address, id], (err, results) => {
    if (err) {
      console.error('Error updating user profile:', err);
      return res.status(500).json({ status: 500, message: 'Error updating profile' });
    }
    res.status(200).json({ status: 200, message: 'Profile updated successfully' });
  });
});



// GET: Fetch cart items for a given user
app.get('/cart', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) {
    return res.status(400).json({ status: 400, message: "user_id query parameter is required" });
  }
  const sql = `
    SELECT c.cart_id, c.product_id, c.quantity, c.user_id,
           p.product_name, p.price, p.description, p.product_image
    FROM cart c
    LEFT JOIN products p ON c.product_id = p.product_id
    WHERE c.user_id = ?
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching cart items:", err);
      return res.status(500).json({ status: 500, message: "Error fetching cart items" });
    }
    res.status(200).json({ status: 200, data: results });
  });
});

// POST: Add a product to the cart
app.post('/cart', (req, res) => {
  const { product_id, quantity, user_id } = req.body;
  if (!product_id || !quantity || !user_id) {
    return res.status(400).json({ status: 400, message: "product_id, quantity, and user_id are required" });
  }
  const sql = "INSERT INTO cart (product_id, quantity, user_id) VALUES (?, ?, ?)";
  db.query(sql, [product_id, quantity, user_id], (err, result) => {
    if (err) {
      console.error("Error adding to cart:", err);
      return res.status(500).json({ status: 500, message: "Error adding to cart" });
    }
    res.status(201).json({ status: 201, message: "Product added to cart successfully", cart_id: result.insertId });
  });
});

// PUT: Update cart item quantity
app.put('/cart/:id', (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  if (quantity == null) {
    return res.status(400).json({ status: 400, message: "Quantity is required" });
  }
  const sql = "UPDATE cart SET quantity = ? WHERE cart_id = ?";
  db.query(sql, [quantity, id], (err, result) => {
    if (err) {
      console.error("Error updating cart item:", err);
      return res.status(500).json({ status: 500, message: "Error updating cart item" });
    }
    res.status(200).json({ status: 200, message: "Cart item updated successfully" });
  });
});

// DELETE: Remove a cart item
app.delete('/cart/:id', (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM cart WHERE cart_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting cart item:", err);
      return res.status(500).json({ status: 500, message: "Error deleting cart item" });
    }
    res.status(200).json({ status: 200, message: "Cart item deleted successfully" });
  });
});

// POST /checkout – Process a user's checkout and store shipping address 
// POST /checkout – Process a user's checkout and store shipping address 
app.post('/checkout', async (req, res) => {
  // 1) Destructure the nested shipping_address
  const { user_id, shipping_address } = req.body;
  // Make sure we have something to unpack
  const {
    fullName,
    address1,
    address2 = null,
    town,
    postcode,
    country = 'United Kingdom'
  } = shipping_address || {};

  // 2) Validate required fields
  if (!user_id) {
    return res.status(400).json({ status: 400, message: "User ID is required" });
  }
  if (!fullName || !address1 || !town || !postcode) {
    return res.status(400).json({ status: 400, message: "Incomplete shipping address" });
  }

  // 3) Transaction helpers (same as before)
  const beginTrans = () => new Promise((resolve, reject) => {
    db.getConnection((err, conn) => {
      if (err) return reject(err);
      conn.beginTransaction(err => {
        if (err) { conn.release(); return reject(err); }
        resolve(conn);
      });
    });
  });
  const commitTrans = conn => new Promise((resolve, reject) => {
    conn.commit(err => {
      if (err) {
        conn.rollback(() => { conn.release(); reject(err); });
      } else {
        conn.release();
        resolve();
      }
    });
  });
  const rollbackTrans = conn => new Promise(resolve => {
    conn.rollback(() => { conn.release(); resolve(); });
  });
  const queryP = (conn, sql, params=[]) => new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

  let conn;
  try {
    conn = await beginTrans();

    // 4) Fetch cart items
    const cartSQL = `
      SELECT c.cart_id, c.product_id, c.quantity, p.price
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `;
    const cartItems = await queryP(conn, cartSQL, [user_id]);
    if (cartItems.length === 0) {
      await rollbackTrans(conn);
      return res.status(400).json({ status: 400, message: "Your cart is empty" });
    }

    // 5) Calculate total
    const totalCost = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

    // 6) Insert into orders with the discrete shipping columns
    const orderSQL = `
      INSERT INTO orders
        (user_id, order_date, total_cost,
         shipping_full_name,
         shipping_address_1,
         shipping_address_2,
         shipping_town,
         shipping_postcode,
         shipping_country)
      VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)
    `;
    const orderRes = await queryP(conn, orderSQL, [
      user_id,
      totalCost,
      fullName,
      address1,
      address2,
      town,
      postcode,
      country
    ]);
    const orderId = orderRes.insertId;

    // 7) Insert order_details
    const detailValues = cartItems.map(item => [item.product_id, orderId]);
    await queryP(conn, `INSERT INTO order_details (product_id, order_id) VALUES ?`, [detailValues]);

    // 8) Clear the cart
    await queryP(conn, `DELETE FROM cart WHERE user_id = ?`, [user_id]);

    // 9) Commit
    await commitTrans(conn);

    res.status(200).json({ status: 200, message: "Checkout successful", order_id: orderId });
  } catch (err) {
    console.error("Checkout error:", err);
    if (conn) await rollbackTrans(conn);
    res.status(500).json({ status: 500, message: "Checkout failed", error: err.message });
  }
});


// GET endpoint: Fetch all orders joined with user details for admin view
app.get('/admin/orders', (req, res) => {
  const sql = `
    SELECT o.order_id, o.user_id, u.user_name, o.order_date, o.total_cost, o.created_at 
    FROM orders o 
    LEFT JOIN user u ON o.user_id = u.user_id
    ORDER BY o.order_date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ status: 500, message: 'Failed to fetch orders' });
    }
    res.status(200).json({ status: 200, data: results });
  });
});

// GET endpoint: Fetch order details (products, quantities, etc.) for a given order_id
app.get('/admin/orders/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT od.order_details_id, od.product_id, p.product_name, p.price, p.description, p.product_image, od.created_at 
    FROM order_details od 
    LEFT JOIN products p ON od.product_id = p.product_id
    WHERE od.order_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching order details:', err);
      return res.status(500).json({ status: 500, message: 'Failed to fetch order details' });
    }
    res.status(200).json({ status: 200, data: results });
  });
});

// Start the server
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
