// Smart Job Parser using Meta Tags, JSON-LD, and Microdata

export function extractJobMetadata() {
  let jobData = {
    title: "",
    company: "",
    location: "",
    url: window.location.href,
    description: "",
    datePosted: "",
  };

  // 1. JSON-LD (Most reliable standard)
  const jsonLdScripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      // Data might be an array or nested in @graph
      const items = Array.isArray(data) ? data : data["@graph"] || [data];

      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          jobData.title = item.title || jobData.title;
          jobData.company = item.hiringOrganization?.name || jobData.company;
          const address = item.jobLocation?.address;
          if (address) {
            jobData.location =
              [address.addressLocality, address.addressRegion]
                .filter(Boolean)
                .join(", ") || jobData.location;
          }
          jobData.description = item.description || jobData.description;
          jobData.datePosted = item.datePosted || jobData.datePosted;
          break; // Found it
        }
      }
    } catch (e) {
      console.warn("Failed to parse JSON-LD", e);
    }
  }

  // 2. Open Graph / Twitter Cards (Social Media Fallback)
  if (!jobData.title) {
    jobData.title =
      getMeta("og:title") || getMeta("twitter:title") || document.title;
  }
  if (!jobData.company) {
    jobData.company = getMeta("og:site_name") || getMeta("twitter:site");
  }
  if (!jobData.description) {
    jobData.description = getMeta("og:description") || getMeta("description");
  }

  // 3. Heuristic Text Parsing (Last Resort)
  if (!jobData.title) {
    const h1 = document.querySelector("h1");
    if (h1) jobData.title = h1.innerText.trim();
  }

  // Clean up title (remove " | Company Name" etc)
  if (jobData.title) {
    jobData.title = jobData.title.split("|")[0].split(" - ")[0].trim();
  }

  // Clean company name from domain if missing
  if (!jobData.company) {
    const domain = window.location.hostname.replace("www.", "").split(".")[0];
    jobData.company = domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  return jobData;
}

function getMeta(property) {
  const meta = document.querySelector(
    `meta[property="${property}"], meta[name="${property}"]`,
  );
  return meta ? meta.getAttribute("content") : "";
}
