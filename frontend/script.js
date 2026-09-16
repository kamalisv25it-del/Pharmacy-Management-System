/* ==========================================================
   PharmaCare Management System - Client Logic
   Connected to Supabase PostgreSQL Backend
   ========================================================== */

let currentMedicines = [];
let currentCustomers = [];
let currentPurchases = [];
let currentSales = [];

/* PAGE NAVIGATION */
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll(".page-section");
    sections.forEach(function(section) {
        section.classList.add("hidden");
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }

    // Change page title
    const titles = {
        dashboard: "Dashboard",
        pharmacy: "Pharmacy Records",
        medicines: "Medicine Management",
        customers: "Customer Management",
        purchases: "Purchase Management",
        transactions: "Sales & Billing",
        records: "Search & Records"
    };

    const titleEl = document.getElementById("pageTitle");
    if (titleEl && titles[sectionId]) {
        titleEl.textContent = titles[sectionId];
    }

    // Change active navigation item
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(function(item) {
        item.classList.remove("active");
    });

    navItems.forEach(function(item) {
        const onclickAttr = item.getAttribute("onclick");
        if (onclickAttr && onclickAttr.includes("'" + sectionId + "'")) {
            item.classList.add("active");
        }
    });

    // Close sidebar on mobile
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.remove("show");
    }

    // Load data specific to the section
    if (sectionId === "dashboard") loadDashboard();
    else if (sectionId === "pharmacy") loadPharmacy();
    else if (sectionId === "medicines") loadMedicines();
    else if (sectionId === "customers") loadCustomers();
    else if (sectionId === "purchases") loadPurchases();
    else if (sectionId === "transactions") loadSales();
}

/* SIDEBAR TOGGLE */
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("show");
    }
}

/* TOAST NOTIFICATION */
function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* MODAL UTILITIES */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("hidden");

    if (modalId === "purchaseModal") {
        setupPurchaseModalSelects();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("hidden");
    const form = modal.querySelector("form");
    if (form) form.reset();
}

// Close modals when clicking backdrop
document.addEventListener("click", function(e) {
    if (e.target && e.target.classList.contains("modal-backdrop")) {
        e.target.classList.add("hidden");
    }
});

/* 1. DATABASE STATUS */
async function fetchDbStatus() {
    try {
        const res = await fetch('/api/db-status');
        const data = await res.json();
        const badge = document.getElementById("dbStatusBadge");
        const text = document.getElementById("dbStatusText");
        const sidebarMode = document.getElementById("sidebarDbMode");

        if (data.connected) {
            badge.className = "db-pill";
            badge.title = "Connected to Supabase PostgreSQL";
            text.textContent = "Supabase PostgreSQL Connected";
            sidebarMode.textContent = "Supabase PostgreSQL";
        } else {
            badge.className = "db-pill waiting";
            badge.title = "Local PostgreSQL mirror running. Add SUPABASE_URL in settings to connect cloud instance.";
            text.textContent = "PostgreSQL (Mirror Mode)";
            sidebarMode.textContent = "PostgreSQL Mirror";
        }
    } catch (e) {
        console.warn("Could not check database status:", e);
    }
}

/* 2. DASHBOARD */
async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();

        // Summary Counters
        document.getElementById("dashTotalMedicines").textContent = data.totalMedicines;
        document.getElementById("dashTotalCustomers").textContent = data.totalCustomers;
        document.getElementById("dashLowStock").textContent = data.lowStock;
        document.getElementById("dashExpiringSoon").textContent = data.expiringSoon;

        // Stock Donut / Circle
        document.getElementById("stockChartTotal").textContent = data.totalMedicines;
        document.getElementById("stockChartAvailable").textContent = data.availableStock;
        document.getElementById("stockChartLow").textContent = data.lowStock;
        document.getElementById("stockChartExpiring").textContent = data.expiringSoon;

        // Sales Card
        document.getElementById("dashTotalSales").textContent = "₹" + Number(data.totalSalesAmount || 0).toLocaleString();
        document.getElementById("dashTotalPurchases").textContent = "₹" + Number(data.totalPurchasesAmount || 0).toLocaleString();
        document.getElementById("dashTotalTransactions").textContent = data.totalTransactions;
        document.getElementById("dashAvgPurchase").textContent = "₹" + Number(data.avgPurchase || 0).toLocaleString();

        // Monthly Sales Bars
        const barContainer = document.getElementById("dashMonthlySales");
        if (barContainer && data.monthlySales) {
            barContainer.innerHTML = data.monthlySales.map(item => `
                <div class="bar-item" title="${item.amount}">
                    <span>${item.month}</span>
                    <div class="bar" style="height: ${item.height}%;"></div>
                </div>
            `).join("");
        }

        // Recent Customers Table
        const custTbody = document.getElementById("dashCustomerTableBody");
        if (custTbody && data.recentCustomers) {
            if (data.recentCustomers.length === 0) {
                custTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No customer records found.</td></tr>`;
            } else {
                custTbody.innerHTML = data.recentCustomers.map(c => `
                    <tr>
                        <td>${c.id}</td>
                        <td><strong>${escapeHtml(c.name)}</strong></td>
                        <td>${escapeHtml(c.address)}</td>
                        <td>${c.purchase_count} Purchases</td>
                        <td>₹${Number(c.total_purchase).toLocaleString()}</td>
                        <td>
                            <span class="status ${c.status === 'Active' ? 'active-status' : 'inactive-status'}">
                                ${c.status}
                            </span>
                        </td>
                    </tr>
                `).join("");
            }
        }

        // Stock Details List
        const stockListEl = document.getElementById("dashMedicineStockList");
        if (stockListEl && data.stockList) {
            stockListEl.innerHTML = data.stockList.map(m => `
                <div class="medicine-row">
                    <div class="medicine-icon">💊</div>
                    <div class="medicine-info">
                        <strong>${escapeHtml(m.name)}</strong>
                        <span>${escapeHtml(m.category)} • ₹${m.price}</span>
                    </div>
                    <div class="stock-number ${m.stock <= 10 ? 'low-stock-number' : ''}">
                        ${m.stock} <small>units</small>
                    </div>
                </div>
            `).join("");
        }

        // Expiry Details List
        const expiryListEl = document.getElementById("dashExpiryList");
        if (expiryListEl && data.expiryList) {
            expiryListEl.innerHTML = data.expiryList.map(m => `
                <div class="expiry-item">
                    <div>
                        <strong>${escapeHtml(m.name)}</strong>
                        <span>Batch: ${escapeHtml(m.batch_no || 'N/A')}</span>
                    </div>
                    <span class="expiry-date">${escapeHtml(m.expiry_date)}</span>
                </div>
            `).join("");
        }

    } catch (err) {
        console.error("Failed to load dashboard:", err);
    }
}

/* 3. PHARMACY RECORDS */
async function loadPharmacy() {
    try {
        const res = await fetch('/api/pharmacy');
        const info = await res.json();
        document.getElementById("pharmacyNameInput").value = info.name || "";
        document.getElementById("pharmacyAddressInput").value = info.address || "";
        document.getElementById("pharmacyPhoneInput").value = info.phone || "";
        document.getElementById("pharmacyEmailInput").value = info.email || "";
    } catch (err) {
        console.error("Failed to load pharmacy info:", err);
    }
}

async function savePharmacyDetails() {
    const btn = document.getElementById("btnSavePharmacy");
    const name = document.getElementById("pharmacyNameInput").value.trim();
    const address = document.getElementById("pharmacyAddressInput").value.trim();
    const phone = document.getElementById("pharmacyPhoneInput").value.trim();
    const email = document.getElementById("pharmacyEmailInput").value.trim();

    if (!name) {
        showToast("Please enter the Pharmacy Name");
        return;
    }

    try {
        btn.textContent = "Saving...";
        btn.disabled = true;

        const res = await fetch('/api/pharmacy', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, address, phone, email })
        });

        if (res.ok) {
            showToast("Pharmacy details saved successfully to PostgreSQL!");
        } else {
            showToast("Error updating pharmacy details");
        }
    } catch (err) {
        showToast("Failed to connect to database");
    } finally {
        btn.textContent = "Save Details";
        btn.disabled = false;
    }
}

/* 4. MEDICINES */
async function loadMedicines(searchQuery = "") {
    try {
        const url = searchQuery ? `/api/medicines?search=${encodeURIComponent(searchQuery)}` : '/api/medicines';
        const res = await fetch(url);
        currentMedicines = await res.json();

        const tbody = document.getElementById("medicineTableBody");
        if (!tbody) return;

        if (currentMedicines.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 24px;">No medicines found matching criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentMedicines.map(m => {
            let statusClass = 'active-status';
            if (m.status === 'Low Stock') statusClass = 'warning-status';
            else if (m.status === 'Expired' || m.status === 'Out of Stock') statusClass = 'danger-status';

            return `
                <tr>
                    <td><strong>${m.id}</strong></td>
                    <td>
                        <strong>${escapeHtml(m.name)}</strong>
                        ${m.manufacturer ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(m.manufacturer)}</div>` : ''}
                    </td>
                    <td>${escapeHtml(m.category)}</td>
                    <td><strong>${m.stock}</strong></td>
                    <td>₹${Number(m.price).toFixed(2)}</td>
                    <td>${escapeHtml(m.expiry_date)}</td>
                    <td>
                        <span class="status ${statusClass}">${escapeHtml(m.status)}</span>
                    </td>
                    <td>
                        <div class="action-btn-group">
                            <button class="delete-btn" onclick="deleteMedicine('${m.id}')" title="Delete Medicine">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.error("Failed to load medicines:", err);
    }
}

let medSearchDebounce;
function filterMedicinesTable(query) {
    clearTimeout(medSearchDebounce);
    medSearchDebounce = setTimeout(() => {
        loadMedicines(query);
    }, 250);
}

async function handleMedicineSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("medName").value.trim();
    const category = document.getElementById("medCategory").value;
    const stock = Number(document.getElementById("medStock").value);
    const price = Number(document.getElementById("medPrice").value);
    const expiry_date = document.getElementById("medExpiry").value.trim();
    const batch_no = document.getElementById("medBatch").value.trim();
    const manufacturer = document.getElementById("medManufacturer").value.trim();

    try {
        const res = await fetch('/api/medicines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, stock, price, expiry_date, batch_no, manufacturer })
        });

        if (res.ok) {
            closeModal('medicineModal');
            showToast(`Medicine "${name}" saved to PostgreSQL!`);
            loadMedicines();
            loadDashboard();
        } else {
            const errData = await res.json();
            showToast("Error: " + (errData.error || "Failed to add medicine"));
        }
    } catch (err) {
        showToast("Database communication error");
    }
}

async function deleteMedicine(id) {
    if (!confirm(`Are you sure you want to delete medicine ${id}?`)) return;

    try {
        const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Medicine ${id} removed successfully.`);
            loadMedicines();
            loadDashboard();
        } else {
            showToast("Failed to delete medicine.");
        }
    } catch (err) {
        showToast("Database communication error");
    }
}

/* 5. CUSTOMERS */
async function loadCustomers(searchQuery = "") {
    try {
        const url = searchQuery ? `/api/customers?search=${encodeURIComponent(searchQuery)}` : '/api/customers';
        const res = await fetch(url);
        currentCustomers = await res.json();

        // Update customer summary grid
        const totalPurchases = currentCustomers.reduce((acc, c) => acc + (Number(c.purchase_count) || 0), 0);
        const totalAmount = currentCustomers.reduce((acc, c) => acc + (Number(c.total_purchase) || 0), 0);

        const countEl = document.getElementById("custSummaryCount");
        const purchasesEl = document.getElementById("custSummaryPurchases");
        const amountEl = document.getElementById("custSummaryAmount");

        if (countEl) countEl.textContent = currentCustomers.length;
        if (purchasesEl) purchasesEl.textContent = totalPurchases;
        if (amountEl) amountEl.textContent = "₹" + totalAmount.toLocaleString();

        const tbody = document.getElementById("customerTableBody");
        if (!tbody) return;

        if (currentCustomers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">No customer records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentCustomers.map(c => `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td>
                    <strong>${escapeHtml(c.name)}</strong>
                    ${c.phone ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(c.phone)}</div>` : ''}
                </td>
                <td>${escapeHtml(c.address)}</td>
                <td>${c.purchase_count} Purchases</td>
                <td>₹${Number(c.total_purchase).toLocaleString()}</td>
                <td>${escapeHtml(c.last_purchase || 'None')}</td>
                <td>
                    <div class="action-btn-group">
                        <button class="small-button" onclick="viewCustomer('${c.id}')">View</button>
                        <button class="delete-btn" onclick="deleteCustomer('${c.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Failed to load customers:", err);
    }
}

let custSearchDebounce;
function filterCustomersTable(query) {
    clearTimeout(custSearchDebounce);
    custSearchDebounce = setTimeout(() => {
        loadCustomers(query);
    }, 250);
}

async function handleCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("custName").value.trim();
    const address = document.getElementById("custAddress").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const email = document.getElementById("custEmail").value.trim();
    const status = document.getElementById("custStatus").value;

    try {
        const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, address, phone, email, status })
        });

        if (res.ok) {
            closeModal('customerModal');
            showToast(`Customer "${name}" created successfully!`);
            loadCustomers();
            loadDashboard();
        } else {
            showToast("Failed to create customer.");
        }
    } catch (err) {
        showToast("Database communication error");
    }
}

async function deleteCustomer(id) {
    if (!confirm(`Are you sure you want to delete customer ${id}?`)) return;

    try {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Customer ${id} removed.`);
            loadCustomers();
            loadDashboard();
        } else {
            showToast("Failed to delete customer.");
        }
    } catch (err) {
        showToast("Database communication error");
    }
}

function viewCustomer(id) {
    const cust = currentCustomers.find(c => c.id === id);
    if (!cust) return;

    document.getElementById("viewCustTitle").textContent = `Customer: ${cust.name} (${cust.id})`;
    const body = document.getElementById("viewCustBody");
    body.innerHTML = `
        <div style="background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px;">
            <div><strong>Full Name:</strong> ${escapeHtml(cust.name)}</div>
            <div><strong>Location:</strong> ${escapeHtml(cust.address)}</div>
            <div><strong>Phone:</strong> ${escapeHtml(cust.phone || 'N/A')}</div>
            <div><strong>Email:</strong> ${escapeHtml(cust.email || 'N/A')}</div>
            <div><strong>Status:</strong> <span class="status ${cust.status === 'Active' ? 'active-status' : 'inactive-status'}">${cust.status}</span></div>
            <div><strong>Total Purchases:</strong> ${cust.purchase_count} transactions</div>
            <div><strong>Lifetime Value:</strong> ₹${Number(cust.total_purchase).toLocaleString()}</div>
            <div><strong>Last Active:</strong> ${escapeHtml(cust.last_purchase || 'Never')}</div>
        </div>
    `;
    openModal('customerViewModal');
}

/* 6. PURCHASES */
async function loadPurchases() {
    try {
        const res = await fetch('/api/purchases');
        currentPurchases = await res.json();

        const totalAmount = currentPurchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const uniqueCustomers = new Set(currentPurchases.map(p => p.customer_id || p.customer_name)).size;

        document.getElementById("purchaseSummaryCount").textContent = currentPurchases.length;
        document.getElementById("purchaseSummaryValue").textContent = "₹" + totalAmount.toLocaleString();
        document.getElementById("purchaseSummaryCustomers").textContent = uniqueCustomers;

        const tbody = document.getElementById("purchaseTableBody");
        if (!tbody) return;

        if (currentPurchases.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">No purchase records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentPurchases.map(p => `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.customer_id || 'N/A'}</td>
                <td><strong>${escapeHtml(p.customer_name)}</strong></td>
                <td>💊 ${escapeHtml(p.medicine)}</td>
                <td>${p.quantity}</td>
                <td>₹${Number(p.amount).toLocaleString()}</td>
                <td>${escapeHtml(p.date)}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Failed to load purchases:", err);
    }
}

async function setupPurchaseModalSelects() {
    // Populate customers
    const custSelect = document.getElementById("purchaseCustomerSelect");
    if (currentCustomers.length === 0) {
        const res = await fetch('/api/customers');
        currentCustomers = await res.json();
    }
    custSelect.innerHTML = `<option value="">-- Choose Customer --</option>` +
        currentCustomers.map(c => `<option value="${c.id}" data-name="${escapeHtml(c.name)}">${c.id} - ${escapeHtml(c.name)} (${escapeHtml(c.address)})</option>`).join("") +
        `<option value="walk-in">Walk-in Customer</option>`;

    // Populate medicines
    const medSelect = document.getElementById("purchaseMedicineSelect");
    if (currentMedicines.length === 0) {
        const res = await fetch('/api/medicines');
        currentMedicines = await res.json();
    }
    medSelect.innerHTML = `<option value="">-- Choose Medicine --</option>` +
        currentMedicines.map(m => `<option value="${m.id}" data-price="${m.price}" data-stock="${m.stock}" data-name="${escapeHtml(m.name)}">${escapeHtml(m.name)} (Stock: ${m.stock}, ₹${m.price})</option>`).join("");

    calculatePurchaseAmount();
}

function onPurchaseMedicineChange() {
    const medSelect = document.getElementById("purchaseMedicineSelect");
    const selectedOpt = medSelect.options[medSelect.selectedIndex];
    const stockEl = document.getElementById("purchaseAvailableStock");
    if (selectedOpt && selectedOpt.value) {
        stockEl.textContent = selectedOpt.dataset.stock + " units";
    } else {
        stockEl.textContent = "--";
    }
    calculatePurchaseAmount();
}

function onPurchaseCustomerChange() {
    // Customer selected
}

function calculatePurchaseAmount() {
    const medSelect = document.getElementById("purchaseMedicineSelect");
    const qtyInput = document.getElementById("purchaseQty");
    const amountInput = document.getElementById("purchaseAmount");

    const selectedOpt = medSelect.options[medSelect.selectedIndex];
    const price = selectedOpt && selectedOpt.dataset.price ? Number(selectedOpt.dataset.price) : 0;
    const qty = Math.max(1, Number(qtyInput.value || 1));

    amountInput.value = (price * qty).toFixed(2);
}

async function handlePurchaseSubmit(e) {
    e.preventDefault();
    const custSelect = document.getElementById("purchaseCustomerSelect");
    const medSelect = document.getElementById("purchaseMedicineSelect");
    const qty = Number(document.getElementById("purchaseQty").value);
    const amount = Number(document.getElementById("purchaseAmount").value);

    const chosenCustOpt = custSelect.options[custSelect.selectedIndex];
    const chosenMedOpt = medSelect.options[medSelect.selectedIndex];

    if (!chosenMedOpt.value) {
        showToast("Please choose a medicine");
        return;
    }

    const availableStock = Number(chosenMedOpt.dataset.stock || 0);
    if (qty > availableStock) {
        alert(`Cannot purchase ${qty} units. Only ${availableStock} units available in stock!`);
        return;
    }

    const customer_id = chosenCustOpt.value === "walk-in" ? null : chosenCustOpt.value;
    const customer_name = chosenCustOpt.value === "walk-in" ? "Walk-in Customer" : chosenCustOpt.dataset.name;
    const medicine_id = chosenMedOpt.value;
    const medicine = chosenMedOpt.dataset.name;

    try {
        const res = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id,
                customer_name,
                medicine_id,
                medicine,
                quantity: qty,
                amount
            })
        });

        if (res.ok) {
            closeModal('purchaseModal');
            showToast(`Purchase recorded & stock deducted from PostgreSQL!`);
            loadPurchases();
            loadMedicines();
            loadCustomers();
            loadDashboard();
        } else {
            showToast("Failed to record purchase.");
        }
    } catch (err) {
        showToast("Database communication error");
    }
}

/* 7. SALES & BILLING */
async function loadSales() {
    try {
        const res = await fetch('/api/sales');
        currentSales = await res.json();

        const totalAmount = currentSales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
        document.getElementById("txSummaryToday").textContent = "₹" + totalAmount.toLocaleString();
        document.getElementById("txSummaryMonth").textContent = "₹" + totalAmount.toLocaleString();
        document.getElementById("txSummaryCount").textContent = currentSales.length;

        const tbody = document.getElementById("salesTableBody");
        if (!tbody) return;

        if (currentSales.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">No transaction records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentSales.map(s => `
            <tr>
                <td><strong>${s.id}</strong></td>
                <td><strong>${escapeHtml(s.customer_name)}</strong></td>
                <td>${s.items_count} item(s)</td>
                <td>₹${Number(s.amount).toFixed(2)}</td>
                <td>
                    <span class="status ${s.status === 'Paid' ? 'active-status' : 'warning-status'}">
                        ${escapeHtml(s.payment_method || 'Cash')} • ${s.status}
                    </span>
                </td>
                <td>${escapeHtml(s.date)}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Failed to load sales:", err);
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const customer_name = document.getElementById("txCustomer").value.trim();
    const items_count = Number(document.getElementById("txItemsCount").value);
    const amount = Number(document.getElementById("txAmount").value);
    const payment_method = document.getElementById("txPaymentMethod").value;
    const status = document.getElementById("txStatus").value;

    try {
        const res = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name, items_count, amount, payment_method, status })
        });

        if (res.ok) {
            closeModal('transactionModal');
            showToast(`Invoice transaction created in PostgreSQL!`);
            loadSales();
            loadDashboard();
        } else {
            showToast("Failed to create transaction.");
        }
    } catch (err) {
        showToast("Database communication error");
    }
}

/* 8. GLOBAL SEARCH */
let globalSearchDebounce;
async function globalSearch() {
    clearTimeout(globalSearchDebounce);
    globalSearchDebounce = setTimeout(async () => {
        const input = document.getElementById("globalSearch");
        const query = input.value.trim();
        const msg = document.getElementById("searchMessage");
        const container = document.getElementById("searchResultsContainer");

        if (!query) {
            msg.textContent = "Start typing to search records across the PostgreSQL database.";
            container.style.display = "none";
            return;
        }

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.totalMatches === 0) {
                msg.textContent = `No matching records found for "${query}".`;
                container.style.display = "none";
                return;
            }

            msg.innerHTML = `<strong>${data.totalMatches} match(es) found</strong> across PostgreSQL tables for "<em>${escapeHtml(query)}</em>":`;
            container.style.display = "block";

            let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

            if (data.medicines.length > 0) {
                html += `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                        <h4 style="margin-bottom: 8px; color: #0284c7;">💊 Medicines (${data.medicines.length})</h4>
                        <ul style="list-style: none; padding-left: 0;">
                            ${data.medicines.map(m => `
                                <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                    <span><strong>${m.id}</strong>: ${escapeHtml(m.name)} (${m.category})</span>
                                    <span>Stock: <strong>${m.stock}</strong> | ₹${m.price}</span>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;
            }

            if (data.customers.length > 0) {
                html += `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                        <h4 style="margin-bottom: 8px; color: #7c3aed;">👥 Customers (${data.customers.length})</h4>
                        <ul style="list-style: none; padding-left: 0;">
                            ${data.customers.map(c => `
                                <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                    <span><strong>${c.id}</strong>: ${escapeHtml(c.name)} (${escapeHtml(c.address)})</span>
                                    <span>${c.purchase_count} purchases | ₹${Number(c.total_purchase).toLocaleString()}</span>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;
            }

            if (data.purchases.length > 0) {
                html += `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                        <h4 style="margin-bottom: 8px; color: #059669;">🛒 Purchases (${data.purchases.length})</h4>
                        <ul style="list-style: none; padding-left: 0;">
                            ${data.purchases.map(p => `
                                <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                    <span><strong>${p.id}</strong>: ${escapeHtml(p.customer_name)} - ${escapeHtml(p.medicine)} (${p.quantity} units)</span>
                                    <span>₹${Number(p.amount).toLocaleString()} (${escapeHtml(p.date)})</span>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;
            }

            if (data.sales.length > 0) {
                html += `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                        <h4 style="margin-bottom: 8px; color: #d97706;">💰 Invoices / Bills (${data.sales.length})</h4>
                        <ul style="list-style: none; padding-left: 0;">
                            ${data.sales.map(s => `
                                <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                    <span><strong>${s.id}</strong>: ${escapeHtml(s.customer_name)} (${s.items_count} items)</span>
                                    <span>₹${Number(s.amount).toFixed(2)} (${escapeHtml(s.payment_method)})</span>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;

        } catch (err) {
            msg.textContent = "Error executing database search.";
        }
    }, 250);
}

/* HELPER */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* PAGE INITIALIZATION */
document.addEventListener("DOMContentLoaded", function() {
    fetchDbStatus();
    showSection("dashboard");
});
