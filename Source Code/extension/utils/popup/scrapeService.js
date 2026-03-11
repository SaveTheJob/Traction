window.STJPopup = window.STJPopup || {};

window.STJPopup.scrapeService = (() => {
  function getTabById(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          resolve(null);
          return;
        }

        resolve(tab);
      });
    });
  }

  function getActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  function injectContentScripts(tabId) {
    return new Promise((resolve) => {
      chrome.scripting.executeScript(
        {
          target: { tabId },
          // Keep the same order as manifest content_scripts.
          files: ["utils/jobParser.js", "content.js"],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Script injection note:",
              chrome.runtime.lastError.message,
            );
          }

          resolve();
        },
      );
    });
  }

  function requestScrape(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "scrapeJob" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            response: null,
            error: chrome.runtime.lastError.message || "Unknown message error",
          });
          return;
        }

        resolve({ response: response || null, error: null });
      });
    });
  }

  function needsInjection(errorMessage) {
    if (!errorMessage) {
      return false;
    }

    return (
      /receiving end does not exist/i.test(errorMessage) ||
      /could not establish connection/i.test(errorMessage)
    );
  }

  function fallbackFromTab(tab) {
    return {
      title: tab?.title || "",
      company: "",
      location: "",
      url: tab?.url || "",
    };
  }

  async function scrapeFromTabId(tabId) {
    const tab = Number.isInteger(tabId)
      ? await getTabById(tabId)
      : await getActiveTab();

    if (!tab || !tab.id) {
      return fallbackFromTab(tab);
    }

    const initial = await requestScrape(tab.id);
    let scraped = initial.response;

    if (!scraped && needsInjection(initial.error)) {
      await injectContentScripts(tab.id);
      const retry = await requestScrape(tab.id);
      scraped = retry.response;
    }

    if (!scraped) {
      if (initial.error && !needsInjection(initial.error)) {
        console.warn(
          "Could not scrape page (maybe it's a restricted Chrome URL?). Defaulting to empty.",
          initial.error,
        );
      }

      return fallbackFromTab(tab);
    }

    return {
      title: scraped.title || tab.title || "",
      company: scraped.company || "",
      location: scraped.location || "",
      url: scraped.url || tab.url || "",
    };
  }

  return {
    scrapeFromTabId,
  };
})();
