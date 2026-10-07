/* =========================================================
   1. THEME TOGGLE
   ========================================================= */
function initializeTheme() {
    if (localStorage.getItem('pureCheckTheme') === 'dark') {
        document.body.classList.add('theme-dark');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('theme-dark');
    localStorage.setItem('pureCheckTheme', isDark ? 'dark' : 'light');
}

const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
}
initializeTheme();

/* =========================================================
   2. ALLERGEN PROFILE MANAGEMENT
   ========================================================= */
function loadAllergens() {
    try {
        const saved = localStorage.getItem('userAllergens');
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        console.error('Error loading allergens from storage:', err);
        return [];
    }
}

function saveAllergens(allergens) {
    try {
        localStorage.setItem('userAllergens', JSON.stringify(allergens));
    } catch (err) {
        console.error('Error saving allergens to storage:', err);
    }
}

function displayAllergens() {
    const allergens = loadAllergens();
    const listEl = document.getElementById('allergen-list');
    const statsEl = document.getElementById('allergen-stats');

    // Update allergen count summary pill
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stats-row">
                <span class="stat-pill">Total Allergens: <strong>${allergens.length}</strong></span>
            </div>
        `;
    }

    if (!listEl) return;
    listEl.innerHTML = '';

    if (allergens.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No allergens added yet.</li>';
        return;
    }

    allergens.forEach((allergen, index) => {
        const li = document.createElement('li');
        li.className = 'allergen-tag';
        li.textContent = allergen + ' ';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', `Remove ${allergen}`);
        deleteBtn.addEventListener('click', () => deleteAllergen(index));

        li.appendChild(deleteBtn);
        listEl.appendChild(li);
    });
}

function addAllergen(name) {
    const cleanName = name.trim();
    if (!cleanName) return;

    const allergens = loadAllergens();
    const exists = allergens.some(item => item.toLowerCase() === cleanName.toLowerCase());
    if (!exists) {
        allergens.push(cleanName);
        saveAllergens(allergens);
        displayAllergens();
    }
}

function deleteAllergen(index) {
    const allergens = loadAllergens();
    allergens.splice(index, 1);
    saveAllergens(allergens);
    displayAllergens();
}

const allergenForm = document.getElementById('allergen-form');
if (allergenForm) {
    allergenForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('allergen-input');
        const value = input.value.trim();
        if (!value) return;

        addAllergen(value);
        input.value = '';
    });
}

displayAllergens();

/* =========================================================
   3. TESTED PRODUCTS HISTORY WITH SEARCH & FILTER
   ========================================================= */
let currentFilter = 'all'; // 'all', 'safe', or 'avoid'
let searchQuery = '';

function loadProducts() {
    try {
        const saved = localStorage.getItem('testedProducts');
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        console.error('Error loading products from storage:', err);
        return [];
    }
}

function saveProducts(products) {
    try {
        localStorage.setItem('testedProducts', JSON.stringify(products));
    } catch (err) {
        console.error('Error saving products to storage:', err);
    }
}

function displayProducts() {
    const allProducts = loadProducts();
    const listEl = document.getElementById('history-list');
    const statsEl = document.getElementById('history-stats');

    // 1. Render dynamic statistics chips
    if (statsEl) {
        const total = allProducts.length;
        const safeCount = allProducts.filter(p => p.safe).length;
        const avoidCount = total - safeCount;

        statsEl.innerHTML = `
            <div class="stats-row">
                <span class="stat-pill">Total: <strong>${total}</strong></span>
                <span class="stat-pill stat-safe">Safe: <strong>${safeCount}</strong></span>
                <span class="stat-pill stat-avoid">Avoid: <strong>${avoidCount}</strong></span>
            </div>
        `;
    }

    if (!listEl) return;
    listEl.innerHTML = '';

    if (allProducts.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No products tested yet.</li>';
        return;
    }

    // 2. Filter products based on search term and active status tab
    const filteredProducts = allProducts
        .map((prod, originalIndex) => ({ ...prod, originalIndex }))
        .filter(item => {
            if (currentFilter === 'safe' && !item.safe) return false;
            if (currentFilter === 'avoid' && item.safe) return false;

            if (searchQuery) {
                const matchesName = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesTriggers = (item.triggers || []).some(t => 
                    t.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (!matchesName && !matchesTriggers) return false;
            }
            return true;
        });

    if (filteredProducts.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No matching products found.</li>';
        return;
    }

    // 3. Render filtered items
    filteredProducts.forEach((prod) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const brandText = prod.brand ? `<span class="history-brand">${prod.brand}</span> • ` : '';
        const categoryBadge = prod.category ? `<span class="category-badge">${prod.category}</span>` : '';
        const notesLine = prod.notes ? `<div class="history-notes">"${prod.notes}"</div>` : '';

        const info = document.createElement('div');
        info.className = 'history-info';
        info.innerHTML = `
            <div class="history-header">
                <div>
                    ${brandText}<strong>${prod.name}</strong>
                    ${categoryBadge}
                </div>
                <div>
                    ${prod.safe
                        ? '<span class="badge-safe">Safe ✅</span>'
                        : `<span class="badge-danger">Avoid ⚠️ (${prod.triggers.join(', ')})</span>`}
                </div>
            </div>
            ${notesLine}
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', `Delete ${prod.name}`);
        deleteBtn.addEventListener('click', () => deleteProductRecord(prod.originalIndex));

        li.appendChild(info);
        li.appendChild(deleteBtn);
        listEl.appendChild(li);
    });
}

function saveProductRecord(product) {
    const products = loadProducts();
    products.unshift(product);
    saveProducts(products);
    displayProducts();
}

function deleteProductRecord(originalIndex) {
    const products = loadProducts();
    products.splice(originalIndex, 1);
    saveProducts(products);
    displayProducts();
}

// Search bar input listener
const searchInput = document.getElementById('history-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        displayProducts();
    });
}

// Filter button click listeners (All / Safe / Avoid)
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        displayProducts();
    });
});

displayProducts();

/* =========================================================
   4. INGREDIENT CHECKER LOGIC
   ========================================================= */
let currentTestedProduct = null;

function checkIngredients(rawText, allergens) {
    const ingredients = rawText
        .split(/[,;\n]+/)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0);

    const matches = [];
    allergens.forEach(allergen => {
        const target = allergen.toLowerCase();
        const found = ingredients.some(ing => ing.includes(target));
        if (found) {
            matches.push(allergen);
        }
    });

    return matches;
}

const checkerForm = document.getElementById('checker-form');
if (checkerForm) {
    checkerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('product-name');
        const brandInput = document.getElementById('product-brand');
        const categoryInput = document.getElementById('product-category');
        const notesInput = document.getElementById('product-notes');
        const textInput = document.getElementById('ingredients-input');
        const resultBox = document.getElementById('checker-result');
        const allergens = loadAllergens();

        const trimmedIngredients = textInput.value.trim();
        const trimmedName = nameInput.value.trim();
        const brand = brandInput ? brandInput.value.trim() : '';
        const category = categoryInput ? categoryInput.value : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        // Guard against missing product name
        if (!trimmedName) {
            resultBox.innerHTML = `
                <div class="result-alert alert-warning">
                    <strong>Missing Name:</strong> Please enter a product name.
                </div>`;
            nameInput.focus();
            return;
        }

        // Guard against empty ingredient inputs
        if (!trimmedIngredients) {
            resultBox.innerHTML = `
                <div class="result-alert alert-warning">
                    <strong>Missing Ingredients:</strong> Please paste an ingredient list to check.
                </div>`;
            textInput.focus();
            return;
        }

        // Guard against missing allergens
        if (allergens.length === 0) {
            resultBox.innerHTML = `
                <div class="result-alert alert-warning">
                    <strong>No Allergens Entered:</strong> Please add at least one allergen under "My Allergies" first!
                </div>`;
            return;
        }

        const matches = checkIngredients(trimmedIngredients, allergens);
        const isSafe = matches.length === 0;

        currentTestedProduct = {
            name: trimmedName,
            brand: brand,
            category: category,
            notes: notes,
            safe: isSafe,
            triggers: matches
        };

        if (isSafe) {
            resultBox.innerHTML = `
                <div class="result-alert alert-safe">
                    <span><strong>✅ Safe to Use:</strong> None of your saved allergens were found.</span>
                    <button type="button" id="save-product-btn">Save Product</button>
                </div>`;
        } else {
            resultBox.innerHTML = `
                <div class="result-alert alert-danger">
                    <span><strong>⚠️ Avoid:</strong> Contains ${matches.join(', ')}.</span>
                    <button type="button" id="save-product-btn">Save Product</button>
                </div>`;
        }

        const saveBtn = document.getElementById('save-product-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (currentTestedProduct) {
                    saveProductRecord(currentTestedProduct);
                    currentTestedProduct = null;
                    nameInput.value = '';
                    if (brandInput) brandInput.value = '';
                    if (categoryInput) categoryInput.value = '';
                    if (notesInput) notesInput.value = '';
                    textInput.value = '';
                    resultBox.innerHTML = '';
                }
            });
        }
    });
}