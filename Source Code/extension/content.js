// Scrape logic to extract Job Title and Company from standard pages

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeJob") {
        let title = "";
        let company = "";
        let location = "";
        let url = window.location.href;

        const hostname = window.location.hostname;

        if (hostname.includes("linkedin.com")) {
            // LinkedIn specific scraping
            const titleElement = document.querySelector(".job-details-jobs-unified-top-card__job-title, .top-card-layout__title");
            if (titleElement) title = titleElement.innerText.trim();

            const companyElement = document.querySelector(".job-details-jobs-unified-top-card__company-name, .topcard__org-name-link");
            if (companyElement) company = companyElement.innerText.trim();

            const locElement = document.querySelector(".job-details-jobs-unified-top-card__bullet");
            if (locElement) location = locElement.innerText.trim();

        } else if (hostname.includes("indeed.com")) {
            // Indeed specific scraping
            const titleElement = document.querySelector(".jobsearch-JobInfoHeader-title");
            if (titleElement) title = titleElement.innerText.trim();

            const companyElement = document.querySelector('[data-testid="inlineHeader-companyName"]');
            if (companyElement) company = companyElement.innerText.trim();

            const locElement = document.querySelector('[data-testid="inlineHeader-companyLocation"]');
            if (locElement) location = locElement.innerText.trim();

        } else if (hostname.includes("joinhandshake.com")) {
            // Handshake specific scraping
            const titleElement = document.querySelector("h1.style__job-title___H1111, h1"); // Handshake class names change, fallback to h1
            if (titleElement) title = titleElement.innerText.trim();

            const companyElement = document.querySelector("a[href*='/employers/']");
            if (companyElement) company = companyElement.innerText.trim();

            // Handshake location is usually in a div with a specific class or nearby
            const detailsElement = document.querySelector(".style__details-container___11111");
            if (detailsElement) location = detailsElement.innerText.split('\\n')[0].trim();

        } else {
            // Generic Fallback (best effort)
            const h1 = document.querySelector('h1');
            title = h1 ? h1.innerText.trim() : document.title.split('-')[0].split('|')[0].trim();

            // Try to find company name based on meta properties or hostname
            const ogSiteName = document.querySelector('meta[property="og:site_name"]');
            if (ogSiteName) {
                company = ogSiteName.getAttribute('content');
            } else {
                company = hostname.replace('www.', '').split('.')[0];
                company = company.charAt(0).toUpperCase() + company.slice(1);
            }
        }

        sendResponse({ title, company, location, url });
    }
});
