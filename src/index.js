const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL,
            branch_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES branches (id)
        )`);

        // Branches table
        db.run(`CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            opening_hours TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sales table
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            branch_id INTEGER NOT NULL,
            user_id INTEGER,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id),
            FOREIGN KEY (branch_id) REFERENCES branches (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Feedback table
        db.run(`CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            branch_id INTEGER,
            user_id INTEGER,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES branches (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Insert sample data if tables are empty
        db.get("SELECT COUNT(*) as count FROM branches", (err, row) => {
            if (err) {
                console.error('Error checking branches:', err);
                return;
            }
            if (row.count === 0) {
                // Insert branches
                const branches = [
                    ['Montevideo Centro', 'Centro', '2900 1234', 'centro@hsh.com', 'Lunes a Viernes 9-18, Sábados 9-13'],
                    ['Montevideo Shopping', 'Punta Carretas', '2900 5678', 'shopping@hsh.com', 'Lunes a Domingo 10-22'],
                    ['Portones Shopping', 'Carrasco', '2900 9012', 'portones@hsh.com', 'Lunes a Domingo 10-22']
                ];
                const branchStmt = db.prepare('INSERT INTO branches (name, location, phone, email, opening_hours) VALUES (?, ?, ?, ?, ?)');
                branches.forEach(branch => branchStmt.run(branch));
                branchStmt.finalize();

                // Insert products
                const products = [
                    ['Sofá 3 plazas', 1500, 20, 1, 'Living', 'Sofá moderno de 3 plazas con diseño contemporáneo', '/images/sofa.jpg'],
                    ['Mesa de centro', 500, 15, 1, 'Living', 'Mesa de centro de vidrio templado', '/images/mesa.jpg'],
                    ['Silla de escritorio', 300, 30, 2, 'Oficina', 'Silla ergonómica para oficina', '/images/silla.jpg'],
                    ['Lámpara de pie', 200, 25, 2, 'Iluminación', 'Lámpara de pie LED moderna', '/images/lampara.jpg'],
                    ['Cama queen', 2000, 10, 3, 'Dormitorio', 'Cama queen size con cabecera', '/images/cama.jpg'],
                    ['Rack TV', 400, 18, 3, 'Living', 'Rack para TV de hasta 55"', '/images/rack.jpg']
                ];
                const productStmt = db.prepare('INSERT INTO products (name, price, stock, branch_id, category, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
                products.forEach(product => productStmt.run(product));
                productStmt.finalize();

                // Insert sample users
                const users = [
                    ['admin', bcrypt.hashSync('admin123', 10), 'admin@hsh.com', 'employee'],
                    ['empleado1', bcrypt.hashSync('emp123', 10), 'emp1@hsh.com', 'employee'],
                    ['cliente1', bcrypt.hashSync('cli123', 10), 'cli1@hsh.com', 'customer']
                ];
                const userStmt = db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)');
                users.forEach(user => userStmt.run(user));
                userStmt.finalize();

                // Insert sample sales
                const sales = [
                    [1, 1, 3, 2, 3000, '2024-03-01'],
                    [2, 1, 3, 1, 500, '2024-03-01'],
                    [3, 2, 3, 3, 900, '2024-03-02'],
                    [4, 2, 3, 2, 400, '2024-03-02'],
                    [5, 3, 3, 1, 2000, '2024-03-03'],
                    [6, 3, 3, 2, 800, '2024-03-03']
                ];
                const saleStmt = db.prepare('INSERT INTO sales (product_id, branch_id, user_id, quantity, total_price, sale_date) VALUES (?, ?, ?, ?, ?, ?)');
                sales.forEach(sale => saleStmt.run(sale));
                saleStmt.finalize();

                // Insert sample feedback
                const feedback = [
                    ['Juan Pérez', 'juan@email.com', 'Excelente atención en Montevideo Shopping', 2, 3],
                    ['María García', 'maria@email.com', 'El producto llegó dañado', 1, 3],
                    ['Carlos López', 'carlos@email.com', 'Muy buenos precios en Portones', 3, 3]
                ];
                const feedbackStmt = db.prepare('INSERT INTO feedback (name, email, message, branch_id, user_id) VALUES (?, ?, ?, ?, ?)');
                feedback.forEach(f => feedbackStmt.run(f));
                feedbackStmt.finalize();
            }
        });
    });
}

// Middleware para verificar token JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// Middleware para verificar rol de empleado
function isEmployee(req, res, next) {
    if (req.user.role !== 'employee') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    });
});

// API Routes
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Get sales by branch (público)
app.get('/api/dashboard/sales-by-branch', (req, res) => {
    const query = `
        SELECT b.name as branchName, SUM(s.total_price) as totalSales
        FROM sales s
        JOIN branches b ON s.branch_id = b.id
        GROUP BY b.id
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get top products (público)
app.get('/api/dashboard/top-products', (req, res) => {
    const query = `
        SELECT p.name as productName, SUM(s.quantity) as totalSold
        FROM sales s
        JOIN products p ON s.product_id = p.id
        GROUP BY p.id
        ORDER BY totalSold DESC
        LIMIT 5
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get sales performance (público)
app.get('/api/dashboard/sales-performance', (req, res) => {
    const query = `
        SELECT date(sale_date) as date, SUM(total_price) as totalSales
        FROM sales
        GROUP BY date(sale_date)
        ORDER BY date DESC
        LIMIT 7
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get inventory summary (público)
app.get('/api/dashboard/inventory-summary', (req, res) => {
    const query = `
        SELECT 
            COUNT(DISTINCT p.id) as totalProducts,
            SUM(CASE WHEN p.stock < 10 THEN 1 ELSE 0 END) as lowStockProducts,
            SUM(p.stock * p.price) as totalValue,
            COUNT(DISTINCT b.id) as totalBranches
        FROM products p
        JOIN branches b ON p.branch_id = b.id
    `;
    
    db.get(query, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Get all feedback (requiere autenticación de empleado)
app.get('/api/feedback', authenticateToken, isEmployee, (req, res) => {
    const query = `
        SELECT f.*, b.name as branchName, u.username as userName
        FROM feedback f
        LEFT JOIN branches b ON f.branch_id = b.id
        LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Submit new feedback (público)
app.post('/api/feedback', (req, res) => {
    const { name, email, message, branch_id, user_id } = req.body;
    
    if (!name || !email || !message) {
        res.status(400).json({ error: 'Name, email and message are required' });
        return;
    }

    const query = `
        INSERT INTO feedback (name, email, message, branch_id, user_id)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [name, email, message, branch_id, user_id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            message: 'Feedback submitted successfully'
        });
    });
});

// Get all branches
app.get('/api/branches', (req, res) => {
    const query = `SELECT id, name, location, phone, email, opening_hours FROM branches ORDER BY name`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get all products
app.get('/api/products', (req, res) => {
    const query = `
        SELECT p.*, b.name as branchName
        FROM products p
        JOIN branches b ON p.branch_id = b.id
        ORDER BY p.name
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`El puerto ${port} ya está en uso. Cierra el proceso anterior o usa otro puerto.`);
        process.exit(1);
    } else {
        throw err;
    }
});

// Consulta simple
db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(rows);
});

// Consulta con parámetros
// db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     console.log(row);
// }); 