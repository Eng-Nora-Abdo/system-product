const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel serverless environment support (Root fs is read-only on Vercel, /tmp is writable)
const isVercel = Boolean(process.env.VERCEL);
const DATA_FILE = isVercel
    ? path.join('/tmp', 'products.json')
    : path.join(__dirname, 'data', 'products.json');

// Ensure data folder and file exist
if (!isVercel && !fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Seed data file if not present
if (!fs.existsSync(DATA_FILE)) {
    const seedFile = path.join(__dirname, 'data', 'products.json');
    let initialData = [];
    if (fs.existsSync(seedFile)) {
        try {
            initialData = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
        } catch (e) {
            initialData = [];
        }
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
}

// Helpers for Database Operations
function getProducts() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data) || [];
    } catch (err) {
        console.error('Error reading database file:', err);
        return [];
    }
}

function saveProducts(products) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('Error writing database file:', err);
        return false;
    }
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files when running locally
app.use(express.static(__dirname));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// REST API Routes
// ============================================

// 1. Health check & Server Status
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Product Management API is running successfully',
        environment: isVercel ? 'vercel-serverless' : 'local',
        timestamp: new Date().toISOString()
    });
});

// 2. Get All Products (with optional search query: ?q=keyword)
app.get('/api/products', (req, res) => {
    const { q } = req.query;
    let products = getProducts();

    if (q && q.trim() !== '') {
        const query = q.trim().toLowerCase();
        products = products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
    }

    res.json({
        success: true,
        count: products.length,
        data: products
    });
});

// 3. Get Single Product by ID
app.get('/api/products/:id', (req, res) => {
    const products = getProducts();
    const product = products.find(p => String(p.id) === String(req.params.id));

    if (!product) {
        return res.status(404).json({
            success: false,
            message: `Product with ID ${req.params.id} not found`
        });
    }

    res.json({
        success: true,
        data: product
    });
});

// 4. Create New Product
app.post('/api/products', (req, res) => {
    const { name, price, category, description } = req.body;

    // Backend Validation
    if (!name || !price || !category) {
        return res.status(400).json({
            success: false,
            message: 'Name, Price, and Category are required fields'
        });
    }

    const products = getProducts();

    const newProduct = {
        id: Date.now().toString(),
        name: name.trim(),
        price: parseFloat(price).toFixed(2),
        category: category.trim(),
        description: description ? description.trim() : 'No description provided.',
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts(products);

    res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: newProduct
    });
});

// 5. Update Existing Product
app.put('/api/products/:id', (req, res) => {
    const { name, price, category, description } = req.body;
    const products = getProducts();
    const index = products.findIndex(p => String(p.id) === String(req.params.id));

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: `Product with ID ${req.params.id} not found`
        });
    }

    // Update fields
    if (name) products[index].name = name.trim();
    if (price) products[index].price = parseFloat(price).toFixed(2);
    if (category) products[index].category = category.trim();
    if (description !== undefined) {
        products[index].description = description.trim() || 'No description provided.';
    }
    products[index].updatedAt = new Date().toISOString();

    saveProducts(products);

    res.json({
        success: true,
        message: 'Product updated successfully',
        data: products[index]
    });
});

// 6. Delete Single Product
app.delete('/api/products/:id', (req, res) => {
    const products = getProducts();
    const index = products.findIndex(p => String(p.id) === String(req.params.id));

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: `Product with ID ${req.params.id} not found`
        });
    }

    const [deletedProduct] = products.splice(index, 1);
    saveProducts(products);

    res.json({
        success: true,
        message: `Product "${deletedProduct.name}" deleted successfully`,
        data: deletedProduct
    });
});

// 7. Delete All Products
app.delete('/api/products', (req, res) => {
    const products = getProducts();
    const deletedCount = products.length;

    saveProducts([]);

    res.json({
        success: true,
        message: `All ${deletedCount} products have been deleted successfully`,
        deletedCount
    });
});

// Fallback Middleware for Single Page Application
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Only listen locally (not when running in production or Vercel serverless environment)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production' && require.main === module) {
    app.listen(PORT, () => {
        console.log(`===============================================`);
        console.log(`🚀 Server running on: http://localhost:${PORT}`);
        console.log(`📡 REST API endpoint: http://localhost:${PORT}/api/products`);
        console.log(`💻 Serving frontend from: ${__dirname}`);
        console.log(`===============================================`);
    });
}

// Export the Express app for Vercel Serverless Functions
module.exports = app;
