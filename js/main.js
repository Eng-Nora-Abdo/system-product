// DOM Elements
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const productCategoryInput = document.getElementById('productCategory');
const productDescInput = document.getElementById('productDesc');
const searchInput = document.getElementById('searchInput');

const mainBtn = document.getElementById('mainBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const formTitle = document.getElementById('formTitle');
const productsCountBadge = document.getElementById('productsCount');
const tableBody = document.getElementById('tableBody');
const serverStatusBadge = document.getElementById('serverStatusBadge');

// Application State
let productContainer = [];
let editingProductId = null; // null for Add Mode, string/id for Update Mode
let isServerConnected = false;

// API Base URL (auto-detects port and domain)
const API_ORIGIN = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
const API_URL = `${API_ORIGIN}/api/products`;
const HEALTH_URL = `${API_ORIGIN}/api/health`;

// Validation Regular Expressions (accepts capital or lowercase, Arabic or English)
const regexRules = {
    productName: /^[a-zA-Z0-9\u0600-\u06FF\s\-_]{2,30}$/,
    productPrice: /^(?:[1-9]\d{0,4}(?:\.\d{1,2})?|100000(?:\.0{1,2})?)$/,
    productCategory: /^[a-zA-Z0-9\u0600-\u06FF\s\-_]{2,25}$/,
    productDesc: /^$|^[\w\W\s]{3,250}$/
};

// ============================================
// Initialization & Backend Connectivity Check
// ============================================
async function initApp() {
    await checkBackendConnection();
    await loadProducts();
}

async function checkBackendConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(HEALTH_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            isServerConnected = true;
            updateServerBadge(true);
            return;
        }
    } catch (err) {
        // Server not reachable
    }

    isServerConnected = false;
    updateServerBadge(false);
}

function updateServerBadge(connected) {
    if (connected) {
        serverStatusBadge.innerHTML = `
            <span class="badge bg-success text-white px-3 py-2 shadow-sm">
                <i class="fa-solid fa-cloud-check me-1"></i> Full Stack Mode: Connected to Express API & Database
            </span>
        `;
    } else {
        serverStatusBadge.innerHTML = `
            <span class="badge bg-warning text-dark px-3 py-2 shadow-sm" title="Start the backend server with 'npm start' to enable database persistence">
                <i class="fa-solid fa-hard-drive me-1"></i> LocalStorage Mode (Run <code>npm start</code> for Full Stack)
            </span>
        `;
    }
}

// Load products from API or fallback to LocalStorage
async function loadProducts() {
    if (isServerConnected) {
        try {
            const response = await fetch(API_URL);
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                productContainer = result.data;
                localStorage.setItem('ourProducts', JSON.stringify(productContainer));
                displayProducts();
                return;
            }
        } catch (err) {
            console.warn("Failed to fetch from API, falling back to LocalStorage:", err);
            isServerConnected = false;
            updateServerBadge(false);
        }
    }

    // Fallback: LocalStorage
    if (localStorage.getItem('ourProducts') !== null) {
        try {
            productContainer = JSON.parse(localStorage.getItem('ourProducts')) || [];
        } catch (e) {
            productContainer = [];
        }
    }
    displayProducts();
}

// =======================
// Validation Functions
// =======================
function validateForm(element) {
    const rule = regexRules[element.id];
    if (!rule) return true;

    const isValid = rule.test(element.value.trim());

    if (isValid) {
        element.classList.add('is-valid');
        element.classList.remove('is-invalid');
    } else {
        element.classList.add('is-invalid');
        element.classList.remove('is-valid');
    }

    return isValid;
}

function isFormValid() {
    const isNameValid = validateForm(productNameInput);
    const isPriceValid = validateForm(productPriceInput);
    const isCategoryValid = validateForm(productCategoryInput);
    const isDescValid = validateForm(productDescInput);

    return isNameValid && isPriceValid && isCategoryValid && isDescValid;
}

// =======================
// CRUD Operations
// =======================

// Create / Update Product
async function handleProductSubmit() {
    if (!isFormValid()) {
        alert("Please fix the validation errors before submitting.");
        return;
    }

    const productData = {
        name: productNameInput.value.trim(),
        price: parseFloat(productPriceInput.value).toFixed(2),
        category: productCategoryInput.value.trim(),
        description: productDescInput.value.trim() || "No description provided."
    };

    if (editingProductId === null) {
        // --- Add Mode ---
        if (isServerConnected) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                const result = await response.json();
                if (result.success) {
                    productContainer.push(result.data);
                }
            } catch (err) {
                console.error("API Error adding product, saving locally:", err);
                productData.id = Date.now().toString();
                productContainer.push(productData);
            }
        } else {
            productData.id = Date.now().toString();
            productContainer.push(productData);
        }
    } else {
        // --- Update Mode ---
        if (isServerConnected) {
            try {
                const response = await fetch(`${API_URL}/${editingProductId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                const result = await response.json();
                if (result.success) {
                    const idx = productContainer.findIndex(p => String(p.id) === String(editingProductId));
                    if (idx !== -1) productContainer[idx] = result.data;
                }
            } catch (err) {
                console.error("API Error updating product, saving locally:", err);
                const idx = productContainer.findIndex(p => String(p.id) === String(editingProductId));
                if (idx !== -1) productContainer[idx] = { ...productData, id: editingProductId };
            }
        } else {
            const idx = productContainer.findIndex(p => String(p.id) === String(editingProductId));
            if (idx !== -1) productContainer[idx] = { ...productData, id: editingProductId };
        }

        cancelUpdate(); // Reset form & exit update mode
    }

    saveToLocalStorage();
    displayProducts();
    clearForm();
}

// Display Products in Table
function displayProducts(customList = null, highlightTerm = '') {
    const list = customList !== null ? customList : productContainer;

    updateCounters();

    if (list.length === 0) {
        const message = productContainer.length === 0
            ? '<i class="fa-solid fa-box-open"></i><h5>No products in database yet!</h5><p class="text-muted">Fill the form above to add your first product.</p>'
            : '<i class="fa-solid fa-magnifying-glass"></i><h5>No products found</h5><p class="text-muted">Try searching with a different keyword.</p>';

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        ${message}
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let cartoona = '';
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const displayName = highlightMatch(item.name, highlightTerm);
        const displayCategory = highlightMatch(item.category, highlightTerm);

        cartoona += `
            <tr>
                <td class="fw-bold text-muted">${i + 1}</td>
                <td class="fw-semibold text-start ps-4">${displayName}</td>
                <td><span class="badge bg-success-subtle text-success fs-6">$${item.price}</span></td>
                <td><span class="badge bg-secondary-subtle text-secondary fs-6">${displayCategory}</span></td>
                <td class="text-muted small text-truncate" style="max-width: 200px;" title="${item.description}">
                    ${item.description}
                </td>
                <td>
                    <button onclick="prepareUpdate('${item.id}')" class="btn btn-sm btn-outline-warning" title="Edit Product">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
                <td>
                    <button onclick="deleteProduct('${item.id}')" class="btn btn-sm btn-outline-danger" title="Delete Product">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    tableBody.innerHTML = cartoona;
}

// Prepare Form for Updating a Product
function prepareUpdate(id) {
    const product = productContainer.find(p => String(p.id) === String(id));
    if (!product) return;

    editingProductId = id;

    productNameInput.value = product.name;
    productPriceInput.value = product.price;
    productCategoryInput.value = product.category;
    productDescInput.value = product.description === "No description provided." ? "" : product.description;

    // Validate fields to show feedback
    validateForm(productNameInput);
    validateForm(productPriceInput);
    validateForm(productCategoryInput);
    validateForm(productDescInput);

    // Update UI states
    mainBtn.innerHTML = '<i class="fa-solid fa-pen-to-square me-1"></i> Update Product';
    mainBtn.className = 'btn btn-warning px-4 fw-semibold text-dark';

    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Editing Product: ${product.name}`;
    formTitle.className = 'card-title mb-0 text-warning fw-bold';

    cancelBtn.classList.remove('d-none');

    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Cancel Update Mode
function cancelUpdate() {
    editingProductId = null;

    mainBtn.innerHTML = '<i class="fa-solid fa-plus me-1"></i> Add Product';
    mainBtn.className = 'btn btn-primary px-4 fw-semibold';

    formTitle.innerHTML = '<i class="fa-solid fa-plus-circle me-2"></i>Add New Product';
    formTitle.className = 'card-title mb-0 text-primary fw-bold';

    cancelBtn.classList.add('d-none');
    clearForm();
}

// Delete Single Product
async function deleteProduct(id) {
    const product = productContainer.find(p => String(p.id) === String(id));
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
        if (editingProductId === id) {
            cancelUpdate();
        }

        if (isServerConnected) {
            try {
                await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            } catch (err) {
                console.error("API Error deleting product:", err);
            }
        }

        productContainer = productContainer.filter(p => String(p.id) !== String(id));
        saveToLocalStorage();

        if (searchInput.value.trim() !== '') {
            searchProducts(searchInput.value.trim());
        } else {
            displayProducts();
        }
    }
}

// Delete All Products
async function deleteAllProducts() {
    if (productContainer.length === 0) return;

    if (confirm(`Are you sure you want to delete ALL ${productContainer.length} products? This cannot be undone.`)) {
        if (isServerConnected) {
            try {
                await fetch(API_URL, { method: 'DELETE' });
            } catch (err) {
                console.error("API Error deleting all products:", err);
            }
        }

        productContainer = [];
        saveToLocalStorage();
        cancelUpdate();
        clearSearch();
        displayProducts();
    }
}

// Search Products (by Name or Category)
function searchProducts(term) {
    const cleanTerm = term.trim().toLowerCase();

    if (cleanTerm === '') {
        displayProducts();
        return;
    }

    const filtered = productContainer.filter(prod => {
        const nameMatch = prod.name.toLowerCase().includes(cleanTerm);
        const categoryMatch = prod.category.toLowerCase().includes(cleanTerm);
        const descMatch = prod.description && prod.description.toLowerCase().includes(cleanTerm);
        return nameMatch || categoryMatch || descMatch;
    });

    displayProducts(filtered, cleanTerm);
}

// Clear Search Input
function clearSearch() {
    searchInput.value = '';
    displayProducts();
}

// Highlight Matched Search Terms
function highlightMatch(text, term) {
    if (!term) return text;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// Clear Form Inputs & Validation Classes
function clearForm() {
    productNameInput.value = '';
    productPriceInput.value = '';
    productCategoryInput.value = '';
    productDescInput.value = '';

    const inputs = [productNameInput, productPriceInput, productCategoryInput, productDescInput];
    inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });
}

// Save to LocalStorage helper
function saveToLocalStorage() {
    localStorage.setItem('ourProducts', JSON.stringify(productContainer));
}

// Update Counters & Buttons Status
function updateCounters() {
    const count = productContainer.length;
    productsCountBadge.textContent = count;

    if (count === 0) {
        deleteAllBtn.setAttribute('disabled', 'true');
        deleteAllBtn.classList.add('disabled');
    } else {
        deleteAllBtn.removeAttribute('disabled');
        deleteAllBtn.classList.remove('disabled');
    }
}

// Run app on load
window.addEventListener('DOMContentLoaded', initApp);
