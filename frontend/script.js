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

    document.getElementById("pageTitle").textContent =
        titles[sectionId];


    // Change active navigation
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(function(item) {
        item.classList.remove("active");
    });


    // Find clicked navigation item
    navItems.forEach(function(item) {

        if (item.getAttribute("onclick") ===
            "showSection('" + sectionId + "')") {

            item.classList.add("active");
        }

    });


    // Close sidebar on mobile
    document.getElementById("sidebar").classList.remove("show");

}


/* SIDEBAR */

function toggleSidebar() {

    const sidebar = document.getElementById("sidebar");

    sidebar.classList.toggle("show");

}


/* TABLE SEARCH */

function searchTable(input, tableId) {

    const searchText = input.value.toLowerCase();

    const table = document.getElementById(tableId);

    const rows = table
        .getElementsByTagName("tbody")[0]
        .getElementsByTagName("tr");


    for (let i = 0; i < rows.length; i++) {

        const rowText = rows[i].textContent.toLowerCase();

        if (rowText.includes(searchText)) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }

    }

}


/* GLOBAL SEARCH */

function globalSearch() {

    const input =
        document.getElementById("globalSearch");

    const searchText =
        input.value.toLowerCase();

    const message =
        document.getElementById("searchMessage");


    if (searchText === "") {

        message.textContent =
            "Start typing to search records.";

        return;
    }


    let results = [];


    // Search customer table
    const customerTable =
        document.getElementById("customerTable");

    if (customerTable) {

        const rows =
            customerTable
                .getElementsByTagName("tbody")[0]
                .getElementsByTagName("tr");

        for (let i = 0; i < rows.length; i++) {

            if (rows[i].textContent
                .toLowerCase()
                .includes(searchText)) {

                results.push("Customer record found");
                break;
            }

        }

    }


    // Search medicine table
    const medicineTable =
        document.getElementById("medicineTable");

    if (medicineTable) {

        const rows =
            medicineTable
                .getElementsByTagName("tbody")[0]
                .getElementsByTagName("tr");

        for (let i = 0; i < rows.length; i++) {

            if (rows[i].textContent
                .toLowerCase()
                .includes(searchText)) {

                results.push("Medicine record found");
                break;
            }

        }

    }


    // Search purchase table
    const purchaseTable =
        document.getElementById("purchaseTable");

    if (purchaseTable) {

        const rows =
            purchaseTable
                .getElementsByTagName("tbody")[0]
                .getElementsByTagName("tr");

        for (let i = 0; i < rows.length; i++) {

            if (rows[i].textContent
                .toLowerCase()
                .includes(searchText)) {

                results.push("Purchase record found");
                break;
            }

        }

    }


    if (results.length > 0) {

        message.innerHTML =
            "<strong>" +
            results.length +
            " record type(s) found.</strong><br>" +
            results.join("<br>");

    } else {

        message.textContent =
            "No matching records found.";

    }

}


/* PAGE LOAD */

document.addEventListener("DOMContentLoaded", function() {

    showSection("dashboard");

});