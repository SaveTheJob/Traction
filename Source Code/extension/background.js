// Listen for URL changes or page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.active) {
    // We now proactively check if the page looks like a job application
    // Using simple URL heuristics first to avoid spamming every single page
    const probableJobUrl =
      /job|career|opening|position|apply|vacancy|workday|greenhouse|lever|bamboohr/i.test(
        tab.url,
      );

    // Or if it matches known major job boards (even if URL doesn't say "job")
    const isMajorBoard =
      /linkedin\.com|indeed\.com|glassdoor\.com|monster\.com|ziprecruiter\.com|handshake\.com/i.test(
        tab.url,
      );

    if (probableJobUrl || isMajorBoard) {
      chrome.tabs.sendMessage(
        tabId,
        { action: "checkIfJobPage" },
        (response) => {
          if (chrome.runtime.lastError) {
            // Ignore errors from tabs that don't have the content script
            return;
          }
          if (response && response.isJobPage) {
            chrome.tabs.sendMessage(tabId, { action: "showSaveButton" });
          }
        },
      );
    }
  }
});

// Handle manual open
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action !== "openPopup") {
    return;
  }

  if (!sender.tab || typeof sender.tab.id !== "number") {
    return;
  }

  const width = 450;
  const height = 650;

  chrome.windows.getCurrent((win) => {
    const left = Math.round((win.width - width) / 2 + win.left);
    const top = Math.round((win.height - height) / 2 + win.top);

    chrome.windows.create({
      url: `popup.html?tabId=${sender.tab.id}`,
      type: "popup",
      width: width,
      height: height,
      left: left,
      top: top,
      focused: true,
    });
  });
});
