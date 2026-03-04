// Scrape logic to extract Job Title and Company from standard pages

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeJob") {
    const jobData = getJobDetails();
    sendResponse(jobData);
  } else if (request.action === "checkIfJobPage") {
    const jobData = getJobDetails();

    // Stricter check for generic pages to avoid false positives
    let isLikelyJobPage = false;

    // If we used a specific scraper (LinkedIn, Indeed, etc), trust the result more
    const hostname = window.location.hostname;
    const knownSites = [
      "linkedin.com",
      "indeed.com",
      "joinhandshake.com",
      "glassdoor.com",
      "ziprecruiter.com",
      "workday.com",
      "greenhouse.io",
      "lever.co",
    ];

    if (knownSites.some((site) => hostname.includes(site))) {
      isLikelyJobPage = !!(jobData.title && jobData.company);
    } else {
      // For generic sites, attempt intelligent JSON-LD extraction first
      const metadata = extractJobMetadata();
      if (
        metadata &&
        metadata.title &&
        (metadata.company || metadata.location)
      ) {
        isLikelyJobPage = true;
      }

      // Fallback to text heuristics
      const hasJobKeywords =
        /job|career|opening|position|apply/i.test(document.title) ||
        /job|career|opening|position/i.test(window.location.href);

      const hasApplyButton = !!document.querySelector(
        'a[href*="apply"], button[class*="apply"], input[value*="Apply"]',
      );

      isLikelyJobPage =
        isLikelyJobPage ||
        !!(
          jobData.title &&
          jobData.company &&
          (hasJobKeywords || hasApplyButton)
        );
    }

    sendResponse({ isJobPage: isLikelyJobPage });
  } else if (request.action === "showSaveButton") {
    if (!document.getElementById("save-button")) {
      createSaveButton();
    }
  }
});

let popupIframe = null;

function createSaveButton() {
  // Check if we have job details first
  const jobData = getJobDetails();
  if (!jobData.title) return; // Don't show if we failed to get a title

  const btn = document.createElement("button");
  btn.id = "save-button";
  btn.className = "overlay-button";
  btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      <span>SaveTheJob</span>
    `;

  btn.onclick = (e) => {
    e.stopPropagation();

    if (popupIframe) {
      if (popupIframe.classList.contains("show")) {
        popupIframe.classList.remove("show");
      } else {
        popupIframe.classList.add("show");
      }
    } else {
      popupIframe = document.createElement("iframe");
      popupIframe.id = "popup-iframe";
      popupIframe.className = "popup-iframe";
      popupIframe.src = chrome.runtime.getURL("popup.html?isIframe=true");
      // Allow it to have camera access or whatever is needed later
      popupIframe.setAttribute("allow", "clipboard-write");

      document.body.appendChild(popupIframe);

      // Trigger animation next frame
      requestAnimationFrame(() => {
        popupIframe.classList.add("show");
      });
    }
  };

  // Close popup if clicking outside
  document.addEventListener("click", (e) => {
    // Only close if the click is outside both the button and the iframe
    if (
      popupIframe &&
      popupIframe.classList.contains("show") &&
      !btn.contains(e.target)
    ) {
      popupIframe.classList.remove("show");
    }
  });

  // Listen for close message from iframe
  window.addEventListener("message", (event) => {
    if (event.data === "closeSaveTheJobPopup" && popupIframe) {
      popupIframe.classList.remove("show");
    }
  });

  document.body.appendChild(btn);
}

function extractJobMetadata() {
  let jobData = {
    title: "",
    company: "",
    location: "",
    url: window.location.href,
    description: "",
  };

  // 1. Try JSON-LD (Standard for Jobs)
  const jsonLdScripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : data["@graph"] || [data];
      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          jobData.title = item.title || "";

          if (item.hiringOrganization) {
            if (typeof item.hiringOrganization === "string") {
              jobData.company = item.hiringOrganization;
            } else {
              jobData.company = item.hiringOrganization.name || "";
            }
          }

          /* Location detection disabled by user request - manual entry only
          if (item.jobLocation) {
             // ... code omitted ...
          }
          */

          jobData.description = item.description || "";
          // If we found a valid JobPosting, we stop and use it
          if (jobData.title && jobData.company) return jobData;
        }
      }
    } catch (e) {}
  }

  // 2. Meta Tag Fallback
  if (!jobData.title)
    jobData.title =
      document.querySelector('meta[property="og:title"]')?.content || "";
  if (!jobData.company)
    jobData.company =
      document.querySelector('meta[property="og:site_name"]')?.content || "";

  // Location detection disabled
  jobData.location = "";

  return jobData;
}

function getJobDetails() {
  // Use smart metadata extraction first
  let jobData = extractJobMetadata();

  // Initialize with what we found
  let title = jobData.title || "";
  let company = jobData.company || "";
  let location = jobData.location || "";
  let url = window.location.href;
  const hostname = window.location.hostname;

  // Site-Specific Scrapers (Only overwrite if we find something better/specific)
  if (hostname.includes("linkedin.com")) {
    const titleElement = document.querySelector(
      ".job-details-jobs-unified-top-card__job-title, .top-card-layout__title",
    );
    if (titleElement) title = titleElement.innerText.trim();

    const companyElement = document.querySelector(
      ".job-details-jobs-unified-top-card__company-name, .topcard__org-name-link",
    );
    if (companyElement) company = companyElement.innerText.trim();
  } else if (hostname.includes("indeed.com")) {
    const titleElement = document.querySelector(
      ".jobsearch-JobInfoHeader-title",
    );
    if (titleElement) title = titleElement.innerText.trim();

    const companyElement = document.querySelector(
      '[data-testid="inlineHeader-companyName"]',
    );
    if (companyElement) company = companyElement.innerText.trim();
  } else if (hostname.includes("joinhandshake.com")) {
    const titleElement = document.querySelector(
      "h1.style__job-title___H1111, h1",
    );
    if (titleElement) title = titleElement.innerText.trim();

    const companyElement = document.querySelector("a[href*='/employers/']");
    if (companyElement) company = companyElement.innerText.trim();
  } else {
    // Generic Fallback (Only use if metadata missed it)
    if (!title) {
      const h1 = document.querySelector("h1");
      title = h1
        ? h1.innerText.trim()
        : document.title.split("-")[0].split("|")[0].trim();
    }

    if (!company) {
      const ogSiteName = document.querySelector(
        'meta[property="og:site_name"]',
      );
      if (ogSiteName) {
        company = ogSiteName.getAttribute("content");
      } else {
        company = hostname.replace("www.", "").split(".")[0];
        company = company.charAt(0).toUpperCase() + company.slice(1);
      }
    }
  }

  // Universal Location Fallback removed per user request

  return { title, company, location, url, date: new Date().toISOString() };
}
