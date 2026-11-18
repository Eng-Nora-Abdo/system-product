const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Log startup info
console.log(`[Init] process.env.PORT: ${process.env.PORT}, using PORT: ${PORT}`);
console.log(`[Init] process.env.VERCEL: ${process.env.VERCEL}`);
console.log(`[Init] process.env.NODE_ENV: ${process.env.NODE_ENV}`);

// Seed data fallback
let seedProducts = [];
try {
    seedProducts = require('./data/products.json');
} catch (e) {
    seedProducts = [
        {
            id: "1",
            name: "Samsung Galaxy S24",
            price: "899.99",
            category: "Mobile",
            description: "Flagship smartphone with AI camera features",
            createdAt: new Date().toISOString()
        },
        {
            id: "2",
            name: "Dell XPS 15",
            price: "1499.00",
            category: "Laptop",
            description: "High performance laptop with OLED display",
            createdAt: new Date().toISOString()
        },
        {
            id: "3",
            name: "Sony WH-1000XM5",
            price: "349.50",
            category: "Audio",
            description: "Noise cancelling wireless headphones",
            createdAt: new Date().toISOString()
        }
    ];
}

// Environment support (Vercel serverless uses os.tmpdir(), Railway & local use data folder)
const isVercel = Boolean(process.env.VERCEL);
const DATA_FILE = isVercel
    ? path.join(os.tmpdir(), 'products.json')
    : path.join(__dirname, 'data', 'products.json');

// Ensure database file is initialized
function ensureDataFile() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            if (!isVercel && !fs.existsSync(path.join(__dirname, 'data'))) {
                fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(seedProducts, null, 2), 'utf-8');
        }
    } catch (err) {
        console.error('Error initializing data file:', err);
    }
}
ensureDataFile();

// Helpers for Database Operations
function getProducts() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            ensureDataFile();
            return seedProducts;
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data) || [];
    } catch (err) {
        console.error('Error reading database file:', err);
        return seedProducts;
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
// REST API Routes (Router)
// ============================================
const productRouter = express.Router();

// 1. Get All Products (with optional search query: ?q=keyword)
productRouter.get('/', (req, res) => {
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

// 2. Get Single Product by ID
productRouter.get('/:id', (req, res) => {
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

// 3. Create New Product
productRouter.post('/', (req, res) => {
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

// 4. Update Existing Product
productRouter.put('/:id', (req, res) => {
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

// 5. Delete Single Product
productRouter.delete('/:id', (req, res) => {
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

// 6. Delete All Products
productRouter.delete('/', (req, res) => {
    const products = getProducts();
    const deletedCount = products.length;

    saveProducts([]);

    res.json({
        success: true,
        message: `All ${deletedCount} products have been deleted successfully`,
        deletedCount
    });
});

// Support both /api/products and /products (handles Vercel path rewrites seamlessly)
app.use('/api/products', productRouter);
app.use('/products', productRouter);

// Health check endpoint
const healthHandler = (req, res) => {
    res.json({
        status: 'OK',
        message: 'Product Management API is running successfully',
        environment: isVercel ? 'vercel-serverless' : (process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'server'),
        timestamp: new Date().toISOString()
    });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Fallback Middleware for Single Page Application
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Listen on process.env.PORT || 3000 binding to 0.0.0.0 when VERCEL is not set (Railway, Docker, Local)
if (!process.env.VERCEL) {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`===============================================`);
        console.log(`🚀 Server running on: http://0.0.0.0:${PORT}`);
        console.log(`📡 REST API endpoint: http://0.0.0.0:${PORT}/api/products`);
        console.log(`💻 Serving frontend from: ${__dirname}`);
        console.log(`===============================================`);
    });

    server.on('error', (err) => {
        console.error('SERVER LISTEN ERROR:', err);
    });
}

// Export the Express app for Vercel Serverless Functions
module.exports = app;
