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

// Highlights the tab for the page you're on (works the same on every page)
function highlightCurrentTab() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-link').forEach(link => {
        const isCurrent = link.getAttribute('href') === currentPage;
        link.classList.toggle('active', isCurrent);
        if (isCurrent) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}
highlightCurrentTab();

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
    displayQuickAdd();
    const listEl = document.getElementById('allergen-list');
    const statsEl = document.getElementById('allergen-stats');

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

// Common allergens that show up as quick-add buttons
const COMMON_ALLERGENS = [
    'Fragrance', 'Paraben', 'Sulfate', 'Lanolin',
    'Propylene Glycol', 'Methylisothiazolinone', 'Formaldehyde',
    'Linalool', 'Limonene', 'Coconut', 'Shea Butter', 'Almond'
];

// Turns each common allergen into a quick-add button
function displayQuickAdd() {
    const container = document.getElementById('quick-add-list');
    if (!container) return;
    container.innerHTML = '';

    const myAllergens = loadAllergens().map(a => a.toLowerCase());

    COMMON_ALLERGENS.forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quick-add-btn';

        if (myAllergens.includes(name.toLowerCase())) {
            btn.textContent = '✓ ' + name;
            btn.classList.add('added');
            btn.disabled = true;
        } else {
            btn.textContent = '+ ' + name;
            btn.addEventListener('click', () => addAllergen(name));
        }

        container.appendChild(btn);
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
        afterAllergensChanged();
    }
}

function deleteAllergen(index) {
    const allergens = loadAllergens();
    allergens.splice(index, 1);
    saveAllergens(allergens);
    afterAllergensChanged();
}

// Runs whenever an allergen is added or removed:
// re-checks saved products, refreshes the page, and says what changed
function afterAllergensChanged() {
    const changes = recheckSavedProducts();
    displayAllergens();
    displayProducts();
    showRecheckNotice(changes);
}

// Re-checks every saved product against the current allergen list.
// Returns which products just became "Avoid" and which just became "Safe".
function recheckSavedProducts() {
    const allergens = loadAllergens();
    const products = loadProducts();
    const changes = { nowAvoid: [], nowSafe: [] };

    products.forEach(p => {
        // Products saved before this feature don't have their ingredient list stored
        if (!p.ingredients) return;

        const triggers = checkIngredients(p.ingredients, allergens);
        const isSafe = triggers.length === 0;

        if (p.safe && !isSafe) changes.nowAvoid.push(p.name);
        if (!p.safe && isSafe) changes.nowSafe.push(p.name);

        p.triggers = triggers;
        p.safe = isSafe;
    });

    saveProducts(products);
    return changes;
}

// Shows a short message under My Allergies when saved products changed
let recheckNoticeTimer = null;

function showRecheckNotice(changes) {
    const noticeEl = document.getElementById('recheck-notice');
    if (!noticeEl) return;

    const lines = [];
    if (changes.nowAvoid.length > 0) {
        lines.push(`⚠️ Now marked <strong>Avoid</strong>: ${escapeHtml(changes.nowAvoid.join(', '))}`);
    }
    if (changes.nowSafe.length > 0) {
        lines.push(`✅ Now marked <strong>Safe</strong>: ${escapeHtml(changes.nowSafe.join(', '))}`);
    }

    if (lines.length === 0) {
        noticeEl.innerHTML = '';
        return;
    }

    noticeEl.innerHTML = `
        <div class="recheck-notice">
            <strong>Re-checked your saved products</strong>
            ${lines.map(line => `<span>${line}</span>`).join('')}
        </div>`;

    // Hide the message after 8 seconds
    clearTimeout(recheckNoticeTimer);
    recheckNoticeTimer = setTimeout(() => { noticeEl.innerHTML = ''; }, 8000);
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
        updateInsights();
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
                const matchesBrand = (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesTriggers = (item.triggers || []).some(t => 
                    t.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (!matchesName && !matchesBrand && !matchesCategory && !matchesTriggers) return false;
            }
            return true;
        });

    if (filteredProducts.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No matching products found.</li>';
        updateInsights();
        return;
    }

    // 3. Render filtered items
    filteredProducts.forEach((prod) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        // escapeHtml makes typed text safe to show, so things like <b> can't break the page
        const brandText = prod.brand ? `<span class="history-brand">${escapeHtml(prod.brand)}</span> • ` : '';
        const categoryBadge = prod.category ? `<span class="category-badge">${escapeHtml(prod.category)}</span>` : '';
        const notesLine = prod.notes ? `<div class="history-notes">"${escapeHtml(prod.notes)}"</div>` : '';
        const patchLine = prod.patchResult === 'passed'
            ? '<span class="patch-badge patch-passed">🧪 Patch test passed</span>'
            : prod.patchResult === 'failed'
                ? '<span class="patch-badge patch-failed">🧪 Patch test failed</span>'
                : '';

        const info = document.createElement('div');
        info.className = 'history-info';
        info.innerHTML = `
            <div class="history-header">
                <div>
                    ${brandText}<strong>${escapeHtml(prod.name)}</strong>
                    ${categoryBadge}
                </div>
                <div>
                    ${prod.safe
                        ? '<span class="badge-safe">Safe ✅</span>'
                        : `<span class="badge-danger">Avoid ⚠️ (${escapeHtml(prod.triggers.join(', '))})</span>`}
                </div>
            </div>
            ${patchLine}
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

    updateInsights();
}

function saveProductRecord(product) {
    const products = loadProducts();
    products.unshift(product);
    saveProducts(products);
    displayProducts();
    updateProductSuggestions();
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

/* =========================================================
   4. INGREDIENT CHECKER LOGIC
   ========================================================= */
let currentTestedProduct = null;

// Puts text in one standard format: lowercase, US spelling, no punctuation
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/sulph/g, 'sulf')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Dictionary: each row is a group of names for the same ingredient
const SYNONYM_GROUPS = [
    ['sodium lauryl sulfate', 'sls', 'sodium dodecyl sulfate'],
    ['sodium laureth sulfate', 'sles', 'sodium lauryl ether sulfate'],
    ['cocamidopropyl betaine', 'capb'],
    ['fragrance', 'parfum', 'perfume'],
    ['methylisothiazolinone', 'mit'],
    ['methylchloroisothiazolinone', 'mci', 'cmit'],
    ['propylene glycol', 'pg'],
    ['tocopherol', 'vitamin e'],
    ['lanolin', 'wool wax', 'wool alcohol', 'adeps lanae'],
    ['almond', 'prunus amygdalus dulcis'],
    ['shea butter', 'butyrospermum parkii'],
    ['coconut', 'cocos nucifera'],
    ['argan', 'argania spinosa'],
    ['aloe', 'aloe barbadensis'],
    ['oat', 'avena sativa'],
    ['wheat', 'triticum vulgare'],
    ['soy', 'glycine soja']
];

// Turns one allergen into every name to search for
// e.g. "Fragrance" -> ["fragrance", "parfum", "perfume"]
function getSearchTerms(allergen) {
    const terms = allergen
        .split(/[()]/)
        .map(normalizeText)
        .filter(name => name.length > 0);

    SYNONYM_GROUPS.forEach(group => {
        if (group.some(name => terms.includes(name))) {
            group.forEach(name => {
                if (!terms.includes(name)) terms.push(name);
            });
        }
    });

    return terms;
}

// Checks if one search term is inside one ingredient
function termMatches(term, ingredient) {
    // Short names (sls, oat, soy) must be a whole word, so "oat" won't match "coating"
    if (term.length <= 4) {
        return new RegExp(`\\b${term}\\b`).test(ingredient);
    }
    // Longer names can be inside a word, so "paraben" matches "methylparaben"
    return ingredient.replace(/ /g, '').includes(term.replace(/ /g, ''));
}

// Returns the user's allergens found in the ingredient list
function checkIngredients(rawText, allergens) {
    const ingredients = rawText
        .split(/[,;\n]+/)
        .map(normalizeText)
        .filter(item => item.length > 0);

    return allergens.filter(allergen => {
        const terms = getSearchTerms(allergen);
        return ingredients.some(ing => terms.some(term => termMatches(term, ing)));
    });
}

// Makes pasted text safe to show on the page (stops stray < > from breaking the HTML)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Shows every ingredient as a small chip, with the flagged ones in red
function buildIngredientBreakdown(rawText, allergens) {
    const allTerms = allergens.flatMap(getSearchTerms);

    return rawText
        .split(/[,;\n]+/)
        .map(piece => piece.trim())
        .filter(piece => piece.length > 0)
        .map(piece => {
            const isFlagged = allTerms.some(term => termMatches(term, normalizeText(piece)));
            const safeText = escapeHtml(piece);
            return isFlagged
                ? `<span class="ingredient-chip ingredient-flagged">⚠️ ${safeText}</span>`
                : `<span class="ingredient-chip">${safeText}</span>`;
        })
        .join('');
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
            triggers: matches,
            ingredients: trimmedIngredients, // kept so the product can be re-checked later
            date: todayString()
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
                    <span><strong>⚠️ Avoid:</strong> Contains ${escapeHtml(matches.join(', '))}.</span>
                    <div class="ingredient-breakdown">
                        ${buildIngredientBreakdown(trimmedIngredients, allergens)}
                    </div>
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

/* =========================================================
   5. ALLERGEN INSIGHTS & SAFETY METER (WIDGET 4)
   ========================================================= */
function updateInsights() {
    const products = loadProducts();
    const percentEl = document.getElementById('safety-percent');
    const barEl = document.getElementById('gauge-bar');
    const triggerEl = document.getElementById('top-trigger-text');

    if (!percentEl || !barEl || !triggerEl) return;

    if (products.length === 0) {
        percentEl.textContent = '100%';
        barEl.style.width = '100%';
        barEl.style.backgroundColor = 'var(--color-safe)';
        triggerEl.textContent = 'Test products to calculate your safety score.';
        renderTriggerChart(products);
        renderCategoryChart(products);
        return;
    }

    const safeCount = products.filter(p => p.safe).length;
    const score = Math.round((safeCount / products.length) * 100);

    percentEl.textContent = `${score}%`;
    barEl.style.width = `${score}%`;

    // Dynamic color shift depending on percentage
    if (score >= 70) {
        barEl.style.backgroundColor = 'var(--color-safe)';
    } else if (score >= 40) {
        barEl.style.backgroundColor = '#eab308'; // Amber warning
    } else {
        barEl.style.backgroundColor = 'var(--color-danger)';
    }

    // Identify the top offender allergen
    const triggerCounts = {};
    products.forEach(p => {
        if (!p.safe && p.triggers) {
            p.triggers.forEach(t => {
                triggerCounts[t] = (triggerCounts[t] || 0) + 1;
            });
        }
    });

    const entries = Object.entries(triggerCounts);
    if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        const [topName, topCount] = entries[0];
        triggerEl.innerHTML = `⚠️ Top trigger: <strong>${escapeHtml(topName)}</strong> (found in ${topCount} product${topCount > 1 ? 's' : ''})`;
    } else {
        triggerEl.textContent = '🎉 All tested products are safe so far!';
    }

    renderTriggerChart(products);
    renderCategoryChart(products);
}

/* =========================================================
   6. INSIGHTS CHARTS
   ========================================================= */

// Chart 1: horizontal bars showing how often each allergen was found
function renderTriggerChart(products) {
    const chartEl = document.getElementById('trigger-chart');
    if (!chartEl) return;

    // Count how many products contained each allergen
    const counts = {};
    products.forEach(p => {
        (p.triggers || []).forEach(t => {
            counts[t] = (counts[t] || 0) + 1;
        });
    });

    // Sort from most to least, keep the top 5
    const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (top.length === 0) {
        chartEl.innerHTML = '<p class="empty-state">No triggers found yet. Flagged products will show up here.</p>';
        return;
    }

    const maxCount = top[0][1];

    chartEl.innerHTML = top.map(([name, count]) => {
        const width = Math.round((count / maxCount) * 100);
        const label = `${name}: found in ${count} product${count > 1 ? 's' : ''}`;
        return `
            <div class="bar-row" title="${escapeHtml(label)}">
                <span class="bar-label">${escapeHtml(name)}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${width}%"></div>
                </div>
                <span class="bar-value">${count}</span>
            </div>`;
    }).join('');
}

// Chart 2: one stacked bar per product type, split into safe (green) and avoid (red)
function renderCategoryChart(products) {
    const chartEl = document.getElementById('category-chart');
    if (!chartEl) return;

    if (products.length === 0) {
        chartEl.innerHTML = '<p class="empty-state">Save products to compare product types.</p>';
        return;
    }

    // Group products by type and count safe vs avoid
    const groups = {};
    products.forEach(p => {
        const type = p.category || 'Uncategorized';
        if (!groups[type]) groups[type] = { safe: 0, avoid: 0 };
        if (p.safe) {
            groups[type].safe++;
        } else {
            groups[type].avoid++;
        }
    });

    // Show the types with the most products first
    const rows = Object.entries(groups)
        .sort((a, b) => (b[1].safe + b[1].avoid) - (a[1].safe + a[1].avoid));

    chartEl.innerHTML = rows.map(([type, { safe, avoid }]) => {
        const total = safe + avoid;
        const safePct = Math.round((safe / total) * 100);
        const avoidPct = 100 - safePct;
        const label = `${type}: ${safe} safe, ${avoid} avoid`;
        return `
            <div class="bar-row bar-row-stacked" title="${escapeHtml(label)}">
                <span class="bar-label">${escapeHtml(type)}</span>
                <div class="bar-track bar-track-stacked">
                    ${safe > 0 ? `<div class="bar-fill bar-safe" style="width: ${safePct}%"></div>` : ''}
                    ${avoid > 0 ? `<div class="bar-fill bar-avoid" style="width: ${avoidPct}%"></div>` : ''}
                </div>
                <span class="bar-value">${safe} ✅ · ${avoid} ⚠️</span>
            </div>`;
    }).join('');
}

// Initial load for tested products and insights
displayProducts();

/* =========================================================
   7. SHARED DATE HELPERS
   ========================================================= */

// Today's date as "YYYY-MM-DD" in the user's own time zone
function todayString() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

// "2026-10-12" -> "Oct 12, 2026"
function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* =========================================================
   8. REACTION JOURNAL
   ========================================================= */
const SEVERITY_LABELS = {
    1: 'Mild',
    2: 'Noticeable',
    3: 'Moderate',
    4: 'Strong',
    5: 'Severe'
};

function loadReactions() {
    try {
        const saved = localStorage.getItem('reactionLog');
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        console.error('Error loading reactions from storage:', err);
        return [];
    }
}

function saveReactions(reactions) {
    try {
        localStorage.setItem('reactionLog', JSON.stringify(reactions));
    } catch (err) {
        console.error('Error saving reactions to storage:', err);
    }
}

// Fills the Product box with suggestions from saved products
function updateProductSuggestions() {
    const listEl = document.getElementById('product-suggestions');
    if (!listEl) return;

    const names = [...new Set(loadProducts().map(p => p.name))];
    listEl.innerHTML = names
        .map(name => `<option value="${escapeHtml(name)}"></option>`)
        .join('');
}

// Picks a color group for a severity number: 1-2 low, 3 medium, 4-5 high
function severityClass(severity) {
    if (severity >= 4) return 'sev-high';
    if (severity === 3) return 'sev-medium';
    return 'sev-low';
}

function displayReactions() {
    const reactions = loadReactions();
    const listEl = document.getElementById('reaction-list');
    const statsEl = document.getElementById('reaction-stats');

    // Stats: total, average severity, most affected body area
    if (statsEl) {
        if (reactions.length === 0) {
            statsEl.innerHTML = '';
        } else {
            const avg = reactions.reduce((sum, r) => sum + r.severity, 0) / reactions.length;

            const areaCounts = {};
            reactions.forEach(r => {
                areaCounts[r.area] = (areaCounts[r.area] || 0) + 1;
            });
            const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0][0];

            statsEl.innerHTML = `
                <div class="stats-row">
                    <span class="stat-pill">Reactions: <strong>${reactions.length}</strong></span>
                    <span class="stat-pill">Avg severity: <strong>${avg.toFixed(1)}/5</strong></span>
                    <span class="stat-pill">Most affected: <strong>${escapeHtml(topArea)}</strong></span>
                </div>`;
        }
    }

    if (listEl) {
        listEl.innerHTML = '';

        if (reactions.length === 0) {
            listEl.innerHTML = '<li class="empty-state">No reactions logged. Hopefully it stays that way!</li>';
        } else {
            // Newest first
            const sorted = [...reactions].sort((a, b) => b.date.localeCompare(a.date));

            sorted.forEach(r => {
                const li = document.createElement('li');
                li.className = 'history-item';

                const info = document.createElement('div');
                info.className = 'history-info';
                info.innerHTML = `
                    <div class="history-header">
                        <strong>${escapeHtml(r.product)}</strong>
                        <span class="severity-badge ${severityClass(r.severity)}">
                            ${r.severity}/5 · ${SEVERITY_LABELS[r.severity]}
                        </span>
                    </div>
                    <div class="history-brand">${formatDate(r.date)} · ${escapeHtml(r.area)}</div>
                    ${r.notes ? `<div class="history-notes">"${escapeHtml(r.notes)}"</div>` : ''}
                `;

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.setAttribute('aria-label', `Delete reaction to ${r.product}`);
                deleteBtn.addEventListener('click', () => deleteReaction(r.id));

                li.appendChild(info);
                li.appendChild(deleteBtn);
                listEl.appendChild(li);
            });
        }
    }

    renderReactionChart(reactions);
}

function deleteReaction(id) {
    const reactions = loadReactions().filter(r => r.id !== id);
    saveReactions(reactions);
    displayReactions();
}

// Chart: number of reactions in each of the last 6 months
function renderReactionChart(reactions) {
    const chartEl = document.getElementById('reaction-chart');
    if (!chartEl) return;

    if (reactions.length === 0) {
        chartEl.innerHTML = '<p class="empty-state">Logged reactions will show up here by month.</p>';
        return;
    }

    // Build the last 6 months, oldest first, e.g. "2026-05" ... "2026-10"
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        months.push({ key, label, count: 0 });
    }

    // Count reactions in each month ("2026-10-12" starts with "2026-10")
    reactions.forEach(r => {
        const month = months.find(m => r.date.startsWith(m.key));
        if (month) month.count++;
    });

    const maxCount = Math.max(1, ...months.map(m => m.count));

    chartEl.innerHTML = months.map(m => {
        const width = Math.round((m.count / maxCount) * 100);
        return `
            <div class="bar-row" title="${m.label}: ${m.count} reaction${m.count === 1 ? '' : 's'}">
                <span class="bar-label">${m.label}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${width}%"></div>
                </div>
                <span class="bar-value">${m.count}</span>
            </div>`;
    }).join('');
}

const reactionForm = document.getElementById('reaction-form');
if (reactionForm) {
    const dateInput = document.getElementById('reaction-date');
    dateInput.value = todayString();
    dateInput.max = todayString(); // can't log a reaction in the future

    reactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productInput = document.getElementById('reaction-product');
        const product = productInput.value.trim();
        if (!product) {
            productInput.focus();
            return;
        }

        const reactions = loadReactions();
        reactions.push({
            id: Date.now(),
            product: product,
            date: dateInput.value || todayString(),
            area: document.getElementById('reaction-area').value,
            severity: Number(document.getElementById('reaction-severity').value),
            notes: document.getElementById('reaction-notes').value.trim()
        });
        saveReactions(reactions);

        // Reset the form for the next entry
        reactionForm.reset();
        dateInput.value = todayString();
        displayReactions();
    });
}

updateProductSuggestions();
displayReactions();

/* =========================================================
   9. EXPORT TO CSV
   ========================================================= */

// Wraps one value in quotes so commas inside it don't split the column
function csvCell(value) {
    const text = value === undefined || value === null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function exportToCSV() {
    const header = ['Record Type', 'Date', 'Name', 'Brand', 'Product Type', 'Result',
                    'Allergens Found', 'Body Area', 'Severity', 'Notes'];
    const rows = [header];

    loadAllergens().forEach(a => {
        rows.push(['Allergen', '', a, '', '', '', '', '', '', '']);
    });

    loadProducts().forEach(p => {
        rows.push(['Tested Product', p.date || '', p.name, p.brand, p.category,
                   p.safe ? 'Safe' : 'Avoid', (p.triggers || []).join('; '), '', '', p.notes]);
    });

    loadReactions().forEach(r => {
        rows.push(['Reaction', r.date, r.product, '', '', '', '', r.area,
                   `${r.severity}/5`, r.notes]);
    });

    loadPatchTests().forEach(t => {
        const result = t.status === 'passed' ? 'Passed' : t.status === 'failed' ? 'Failed' : 'In progress';
        rows.push(['Patch Test', dateStringFromTime(t.start), t.product, '', '', result, '', t.spot, '', '']);
    });

    const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');

    // Turn the text into a file and make the browser download it
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dont-poison-yourself-${todayString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
}

/* =========================================================
   10. ALLERGEN DIRECTORY PAGE
   ========================================================= */

// Short facts about common allergens. Allergens not listed here still get a card,
// just without the description.
const ALLERGEN_INFO = {
    'fragrance': {
        about: 'A blend of scent chemicals. Brands can list dozens of ingredients as one word, which makes it one of the most common causes of skin reactions to cosmetics.',
        foundIn: 'Perfume, lotion, shampoo, body wash, candles, laundry products'
    },
    'paraben': {
        about: 'A family of preservatives (methylparaben, propylparaben, butylparaben and more) that stop bacteria and mold from growing in products.',
        foundIn: 'Lotion, makeup, shampoo, conditioner, sunscreen'
    },
    'sulfate': {
        about: 'Cleansing ingredients that make products foam, like SLS and SLES. They can dry out or irritate sensitive skin and scalps.',
        foundIn: 'Shampoo, body wash, face wash, toothpaste'
    },
    'lanolin': {
        about: 'A natural wax from sheep\'s wool, used to seal in moisture.',
        foundIn: 'Lip balm, nipple cream, thick moisturizers, ointments'
    },
    'propylene glycol': {
        about: 'Helps products hold moisture and spread smoothly, and helps other ingredients absorb into skin.',
        foundIn: 'Lotion, deodorant, face wash, hair products'
    },
    'methylisothiazolinone': {
        about: 'A strong preservative and a well-known cause of contact allergy, especially in products that stay on the skin.',
        foundIn: 'Shampoo, wet wipes, body wash, household cleaners'
    },
    'formaldehyde': {
        about: 'A preservative. Some ingredients slowly release it, like DMDM Hydantoin and Quaternium-15, so watch for those names too.',
        foundIn: 'Nail polish, hair-smoothing treatments, shampoo, body wash'
    },
    'linalool': {
        about: 'A scent compound found in lavender and other plants. It can become more irritating as it reacts with air over time.',
        foundIn: 'Perfume, lotion, essential oils, cleaning products'
    },
    'limonene': {
        about: 'The scent compound in citrus peels. Like linalool, it can become more irritating once exposed to air.',
        foundIn: 'Perfume, citrus-scented products, cleaners'
    },
    'coconut': {
        about: 'Coconut oil and ingredients made from coconut. Many cleansers use coconut-derived ingredients, like cocamidopropyl betaine.',
        foundIn: 'Body oil, hair masks, soap, shampoo'
    },
    'shea butter': {
        about: 'A rich fat from the nut of the shea tree, used as a moisturizer.',
        foundIn: 'Body butter, lip balm, hand cream, hair products'
    },
    'almond': {
        about: 'Usually sweet almond oil, a tree-nut oil used to soften skin.',
        foundIn: 'Body oil, massage oil, lotion, makeup remover'
    }
};

// "prunus amygdalus dulcis" -> "Prunus Amygdalus Dulcis" (short ones like "sls" -> "SLS")
function toDisplayName(name) {
    if (name.length <= 4 && !name.includes(' ')) return name.toUpperCase();
    return name.replace(/\b\w/g, letter => letter.toUpperCase());
}

let directorySearch = '';

function displayDirectory() {
    const gridEl = document.getElementById('directory-grid');
    if (!gridEl) return;

    const allergens = loadAllergens();
    const products = loadProducts();
    const summaryEl = document.getElementById('directory-summary');

    if (summaryEl) {
        summaryEl.textContent = allergens.length === 0
            ? 'Add allergens on the Dashboard and they will show up here.'
            : `You're tracking ${allergens.length} allergen${allergens.length === 1 ? '' : 's'} across ${products.length} tested product${products.length === 1 ? '' : 's'}.`;
    }

    if (allergens.length === 0) {
        gridEl.innerHTML = `
            <div class="directory-empty">
                <p>No allergens yet.</p>
                <a href="index.html" class="directory-empty-link">Go to the Dashboard to add some →</a>
            </div>`;
        return;
    }

    // Build the info for each card
    const cards = allergens.map(allergen => {
        const key = normalizeText(allergen);
        const otherNames = getSearchTerms(allergen)
            .filter(name => name !== key)
            .map(toDisplayName);
        const foundIn = products.filter(p => (p.triggers || []).includes(allergen));
        return { allergen, info: ALLERGEN_INFO[key], otherNames, foundIn };
    });

    // Search by allergen name or any of its other names
    const query = directorySearch.toLowerCase();
    const visible = cards
        .filter(card => !query ||
            card.allergen.toLowerCase().includes(query) ||
            card.otherNames.some(n => n.toLowerCase().includes(query)))
        // Allergens found in the most products go first
        .sort((a, b) => b.foundIn.length - a.foundIn.length);

    if (visible.length === 0) {
        gridEl.innerHTML = '<p class="empty-state">No allergens match your search.</p>';
        return;
    }

    gridEl.innerHTML = visible.map(card => {
        const count = card.foundIn.length;
        const countBadge = count > 0
            ? `<span class="found-badge found-yes">Found in ${count} product${count === 1 ? '' : 's'}</span>`
            : `<span class="found-badge found-no">Not found yet</span>`;

        const aboutSection = card.info ? `
            <p class="card-about">${escapeHtml(card.info.about)}</p>
            <div class="card-section">
                <span class="card-label">Common in</span>
                <p class="card-text">${escapeHtml(card.info.foundIn)}</p>
            </div>` : '';

        const namesSection = card.otherNames.length > 0 ? `
            <div class="card-section">
                <span class="card-label">Also listed as</span>
                <div class="name-chips">
                    ${card.otherNames.map(n => `<span class="name-chip">${escapeHtml(n)}</span>`).join('')}
                </div>
            </div>` : '';

        const productsSection = count > 0 ? `
            <ul class="card-products">
                ${card.foundIn.map(p => `
                    <li>⚠️ ${p.brand ? `${escapeHtml(p.brand)} · ` : ''}${escapeHtml(p.name)}</li>`).join('')}
            </ul>` : '<p class="card-text card-muted">None of your tested products contain this yet.</p>';

        return `
            <article class="allergen-card">
                <div class="card-header">
                    <h3>${escapeHtml(card.allergen)}</h3>
                    ${countBadge}
                </div>
                ${aboutSection}
                ${namesSection}
                <div class="card-section card-footer">
                    <span class="card-label">Your products</span>
                    ${productsSection}
                </div>
            </article>`;
    }).join('');
}

const directorySearchInput = document.getElementById('directory-search');
if (directorySearchInput) {
    directorySearchInput.addEventListener('input', (e) => {
        directorySearch = e.target.value.trim();
        displayDirectory();
    });
}

displayDirectory();

/* =========================================================
   11. PATCH TEST TRACKER
   ========================================================= */
const PATCH_TEST_HOURS = 48;
const PATCH_TEST_MS = PATCH_TEST_HOURS * 60 * 60 * 1000; // 48 hours in milliseconds

function loadPatchTests() {
    try {
        const saved = localStorage.getItem('patchTests');
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        console.error('Error loading patch tests from storage:', err);
        return [];
    }
}

function savePatchTests(tests) {
    try {
        localStorage.setItem('patchTests', JSON.stringify(tests));
    } catch (err) {
        console.error('Error saving patch tests to storage:', err);
    }
}

// A timestamp -> "2026-10-12" (used for the CSV export)
function dateStringFromTime(time) {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// A timestamp -> "Oct 12, 3:05 PM"
function formatDateTime(time) {
    return new Date(time).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

// Milliseconds -> "31h 12m"
function formatTimeLeft(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
}

function displayPatchTests() {
    const listEl = document.getElementById('patch-list');
    if (!listEl) return;

    const tests = loadPatchTests();
    listEl.innerHTML = '';

    if (tests.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No patch tests yet. Start one when you try a new product.</li>';
        return;
    }

    // Running tests first, then newest first
    const sorted = [...tests].sort((a, b) => {
        const aActive = a.status === 'active' ? 0 : 1;
        const bActive = b.status === 'active' ? 0 : 1;
        return aActive - bActive || b.start - a.start;
    });

    sorted.forEach(test => {
        const li = document.createElement('li');
        li.className = 'history-item patch-item';

        const info = document.createElement('div');
        info.className = 'history-info';

        if (test.status === 'active') {
            const elapsed = Date.now() - test.start;
            const percent = Math.min(100, Math.round((elapsed / PATCH_TEST_MS) * 100));
            const isDone = elapsed >= PATCH_TEST_MS;

            info.innerHTML = `
                <div class="history-header">
                    <strong>${escapeHtml(test.product)}</strong>
                    <span class="patch-status ${isDone ? 'patch-ready' : 'patch-running'}">
                        ${isDone ? '⏰ Ready to check' : `⏳ ${formatTimeLeft(PATCH_TEST_MS - elapsed)} left`}
                    </span>
                </div>
                <div class="history-brand">${escapeHtml(test.spot)} · started ${formatDateTime(test.start)}</div>
                <div class="patch-progress" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-label="Patch test progress">
                    <div class="patch-progress-fill" style="width: ${percent}%"></div>
                </div>
                <p class="patch-question">${isDone ? '48 hours are up! How does your skin look?' : 'Check in early if you notice anything:'}</p>
                <div class="patch-actions">
                    <button type="button" class="patch-btn patch-btn-pass">✓ No reaction</button>
                    <button type="button" class="patch-btn patch-btn-fail">✗ I reacted</button>
                </div>
            `;

            info.querySelector('.patch-btn-pass').addEventListener('click', () => finishPatchTest(test.id, 'passed'));
            info.querySelector('.patch-btn-fail').addEventListener('click', () => finishPatchTest(test.id, 'failed'));
        } else {
            const passed = test.status === 'passed';
            info.innerHTML = `
                <div class="history-header">
                    <strong>${escapeHtml(test.product)}</strong>
                    <span class="patch-status ${passed ? 'patch-passed' : 'patch-failed'}">
                        ${passed ? '✓ Passed' : '✗ Reacted'}
                    </span>
                </div>
                <div class="history-brand">${escapeHtml(test.spot)} · started ${formatDateTime(test.start)}</div>
                ${passed ? '' : '<a href="#reaction-form" class="patch-log-link">Log this reaction →</a>'}
            `;

            const logLink = info.querySelector('.patch-log-link');
            if (logLink) {
                logLink.addEventListener('click', () => {
                    const productInput = document.getElementById('reaction-product');
                    if (productInput) {
                        productInput.value = test.product;
                        productInput.focus();
                    }
                });
            }
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', `Delete patch test for ${test.product}`);
        deleteBtn.addEventListener('click', () => deletePatchTest(test.id));

        li.appendChild(info);
        li.appendChild(deleteBtn);
        listEl.appendChild(li);
    });
}

// Records the result, and marks any saved product with the same name
function finishPatchTest(id, result) {
    const tests = loadPatchTests();
    const test = tests.find(t => t.id === id);
    if (!test) return;

    test.status = result;
    savePatchTests(tests);

    const products = loadProducts();
    products.forEach(p => {
        if (p.name.toLowerCase() === test.product.toLowerCase()) {
            p.patchResult = result;
        }
    });
    saveProducts(products);

    displayPatchTests();
}

function deletePatchTest(id) {
    savePatchTests(loadPatchTests().filter(t => t.id !== id));
    displayPatchTests();
}

const patchForm = document.getElementById('patch-form');
if (patchForm) {
    patchForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productInput = document.getElementById('patch-product');
        const product = productInput.value.trim();
        if (!product) {
            productInput.focus();
            return;
        }

        const tests = loadPatchTests();
        tests.push({
            id: Date.now(),
            product: product,
            spot: document.getElementById('patch-spot').value,
            start: Date.now(),
            status: 'active'
        });
        savePatchTests(tests);

        patchForm.reset();
        displayPatchTests();
    });

    // Update the countdowns every 30 seconds
    setInterval(displayPatchTests, 30 * 1000);
}

displayPatchTests();