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

// Application State
let productContainer = [];
let currentIndex = -1; // -1 means Add Mode, >= 0 means Update Mode

// Validation Regular Expressions
const regexRules = {
    productName: /^[A-Z][a-zA-Z0-9\s]{2,24}$/, // Starts with capital, 3-25 chars
    productPrice: /^(?:[1-9]\d{0,4}(?:\.\d{1,2})?|100000(?:\.0{1,2})?)$/, // 1 to 100,000
    productCategory: /^[A-Z][a-zA-Z0-9\s]{2,19}$/, // Starts with capital, 3-20 chars
    productDesc: /^$|^[\w\W\s]{3,250}$/ // Optional or 3-250 chars
};

// Initialize from LocalStorage
if (localStorage.getItem('ourProducts') !== null) {
    try {
        productContainer = JSON.parse(localStorage.getItem('ourProducts')) || [];
    } catch (e) {
        productContainer = [];
    }
}
displayProducts();

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
function handleProductSubmit() {
    if (!isFormValid()) {
        alert("Please fix the validation errors before submitting.");
        return;
    }

    const product = {
        name: productNameInput.value.trim(),
        price: parseFloat(productPriceInput.value).toFixed(2),
        category: productCategoryInput.value.trim(),
        description: productDescInput.value.trim() || "No description provided."
    };

    if (currentIndex === -1) {
        // Add Mode
        productContainer.push(product);
    } else {
        // Update Mode
        productContainer[currentIndex] = product;
        cancelUpdate(); // Switch back to Add mode
    }

    saveToLocalStorage();
    displayProducts();
    clearForm();
}

// Display Products in Table
function displayProducts(customList = null, highlightTerm = '') {
    const list = customList !== null ? customList : productContainer.map((prod, idx) => ({ ...prod, originalIndex: idx }));

    updateCounters();

    if (list.length === 0) {
        const message = productContainer.length === 0
            ? '<i class="fa-solid fa-box-open"></i><h5>No products added yet!</h5><p class="text-muted">Fill the form above to add your first product.</p>'
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
        const realIndex = item.originalIndex !== undefined ? item.originalIndex : i;

        const displayName = highlightMatch(item.name, highlightTerm);
        const displayCategory = highlightMatch(item.category, highlightTerm);

        cartoona += `
            <tr>
                <td class="fw-bold text-muted">${realIndex + 1}</td>
                <td class="fw-semibold text-start ps-4">${displayName}</td>
                <td><span class="badge bg-success-subtle text-success fs-6">$${item.price}</span></td>
                <td><span class="badge bg-secondary-subtle text-secondary fs-6">${displayCategory}</span></td>
                <td class="text-muted small text-truncate" style="max-width: 200px;" title="${item.description}">
                    ${item.description}
                </td>
                <td>
                    <button onclick="prepareUpdate(${realIndex})" class="btn btn-sm btn-outline-warning" title="Edit Product">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
                <td>
                    <button onclick="deleteProduct(${realIndex})" class="btn btn-sm btn-outline-danger" title="Delete Product">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    tableBody.innerHTML = cartoona;
}

// Prepare Form for Updating a Product
function prepareUpdate(index) {
    currentIndex = index;
    const product = productContainer[index];

    productNameInput.value = product.name;
    productPriceInput.value = product.price;
    productCategoryInput.value = product.category;
    productDescInput.value = product.description === "No description provided." ? "" : product.description;

    // Validate fields to show green checkmarks
    validateForm(productNameInput);
    validateForm(productPriceInput);
    validateForm(productCategoryInput);
    validateForm(productDescInput);

    // Update UI states
    mainBtn.innerHTML = '<i class="fa-solid fa-pen-to-square me-1"></i> Update Product';
    mainBtn.className = 'btn btn-warning px-4 fw-semibold text-dark';

    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Editing Product #${index + 1}`;
    formTitle.className = 'card-title mb-0 text-warning fw-bold';

    cancelBtn.classList.remove('d-none');

    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Cancel Update Mode
function cancelUpdate() {
    currentIndex = -1;

    mainBtn.innerHTML = '<i class="fa-solid fa-plus me-1"></i> Add Product';
    mainBtn.className = 'btn btn-primary px-4 fw-semibold';

    formTitle.innerHTML = '<i class="fa-solid fa-plus-circle me-2"></i>Add New Product';
    formTitle.className = 'card-title mb-0 text-primary fw-bold';

    cancelBtn.classList.add('d-none');
    clearForm();
}

// Delete Single Product
function deleteProduct(index) {
    const productName = productContainer[index].name;

    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
        if (currentIndex === index) {
            cancelUpdate();
        } else if (currentIndex > index) {
            currentIndex--;
        }

        productContainer.splice(index, 1);
        saveToLocalStorage();

        if (searchInput.value.trim() !== '') {
            searchProducts(searchInput.value.trim());
        } else {
            displayProducts();
        }
    }
}

// Delete All Products
function deleteAllProducts() {
    if (productContainer.length === 0) return;

    if (confirm(`Are you sure you want to delete ALL ${productContainer.length} products? This cannot be undone.`)) {
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

    const filtered = [];
    for (let i = 0; i < productContainer.length; i++) {
        const prod = productContainer[i];
        const nameMatch = prod.name.toLowerCase().includes(cleanTerm);
        const categoryMatch = prod.category.toLowerCase().includes(cleanTerm);

        if (nameMatch || categoryMatch) {
            filtered.push({
                ...prod,
                originalIndex: i
            });
        }
    }

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
