// Shared job parser loaded before content.js in content scripts.
(function () {
  function getMeta(property) {
    const meta = document.querySelector(
      `meta[property="${property}"], meta[name="${property}"]`,
    );
    return meta ? meta.getAttribute("content") : "";
  }

  const isJobPosting = (node) =>
    [].concat(node?.["@type"] || []).includes("JobPosting");

  // Walks arrays and @graph to find the first JobPosting node.
  function findJobPosting(node) {
    if (!node || typeof node !== "object") {
      return null;
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findJobPosting(child);
        if (found) {
          return found;
        }
      }
      return null;
    }
    if (isJobPosting(node)) {
      return node;
    }
    return findJobPosting(node["@graph"]);
  }

  function locationOf(item) {
    const places = [].concat(item.jobLocation || []);
    for (const place of places) {
      const address = place?.address;
      const text = [address?.addressLocality, address?.addressRegion]
        .filter(Boolean)
        .join(", ");
      if (text) {
        return text;
      }
    }
    return item.jobLocationType === "TELECOMMUTE" ? "Remote" : "";
  }

  function extractJobMetadata() {
    const jobData = {
      title: "",
      company: "",
      location: "",
      url: window.location.href,
      description: "",
      datePosted: "",
    };

    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    for (const script of jsonLdScripts) {
      try {
        const item = findJobPosting(JSON.parse(script.textContent));
        if (!item) {
          continue;
        }

        jobData.title = item.title || jobData.title;

        if (item.hiringOrganization) {
          if (typeof item.hiringOrganization === "string") {
            jobData.company = item.hiringOrganization;
          } else {
            jobData.company = item.hiringOrganization.name || jobData.company;
          }
        }

        jobData.location = locationOf(item) || jobData.location;
        jobData.description = item.description || jobData.description;
        jobData.datePosted = item.datePosted || jobData.datePosted;
        break;
      } catch (error) {
        // Ignore malformed JSON-LD blocks.
      }
    }

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

    if (!jobData.title) {
      const h1 = document.querySelector("h1");
      if (h1) {
        jobData.title = h1.innerText.trim();
      }
    }

    if (jobData.title) {
      jobData.title = jobData.title.split("|")[0].split(" - ")[0].trim();
    }

    if (!jobData.company) {
      const domain = window.location.hostname.replace("www.", "").split(".")[0];
      jobData.company = domain.charAt(0).toUpperCase() + domain.slice(1);
    }

    return jobData;
  }

  window.STJJobParser = Object.freeze({
    extractJobMetadata,
  });
})();
