document.addEventListener("DOMContentLoaded", () => {
    // Grab references to all DOM elements we need
    const mainView = document.getElementById("main-view");
    const successView = document.getElementById("success-view");
    const errorMsg = document.getElementById("error-msg");

    const titleInput = document.getElementById("title");
    const companyInput = document.getElementById("company");
    const locationInput = document.getElementById("location");
    const prioritySelect = document.getElementById("priority");
    const statusSelect = document.getElementById("status");
    const linkInput = document.getElementById("link");
    const saveBtn = document.getElementById("save-btn");
    const closeBtn = document.getElementById("close-btn");
    const settingsToggle = document.getElementById("settings-toggle");
    const settingsView = document.getElementById("settings-view");
    const uidInput = document.getElementById("user-uid");

    // Load saved UID from extension local storage
    chrome.storage.local.get(['tractionUid'], function (result) {
        if (result.tractionUid) {
            uidInput.value = result.tractionUid;
        } else {
            // Auto open settings if no UID found to prompt user
            settingsView.classList.remove("hidden");
        }
    });

    // Toggle settings panel
    settingsToggle.addEventListener("click", () => {
        settingsView.classList.toggle("hidden");
    });

    // 1. On load, inject content.js into the active tab to scrape data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
            // Execute the scraper in the context of the webpage
            chrome.scripting.executeScript(
                {
                    target: { tabId: activeTab.id },
                    files: ["content.js"]
                },
                () => {
                    // Send message to the scraper
                    chrome.tabs.sendMessage(activeTab.id, { action: "scrapeJob" }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn("Could not scrape page (maybe it's a restricted Chrome URL?). Defaulting to empty.", chrome.runtime.lastError.message);
                            // We can try to use standard tab info as fallback
                            titleInput.value = activeTab.title || "";
                            linkInput.value = activeTab.url || "";
                            return;
                        }

                        if (response) {
                            // Pre-fill fields
                            titleInput.value = response.title || activeTab.title || "";
                            companyInput.value = response.company || "";
                            locationInput.value = response.location || "";
                            linkInput.value = response.url || activeTab.url || "";
                        } else {
                            // If no content script response (e.g. non-supported page), still save the URL
                            titleInput.value = activeTab.title || "";
                            linkInput.value = activeTab.url || "";
                        }
                    });
                }
            );
        }
    });

    // 2. Handle Save Button click (Push to Firestore)
    saveBtn.addEventListener("click", async () => {
        // Basic validation
        if (!titleInput.value || !companyInput.value) {
            showError("Job Title and Company are required.");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";
        errorMsg.classList.add("hidden");

        try {
            // You must have `firebase` defined globally from the legacy compat scripts
            // We assume config.js initialized the firebase app.
            const auth = firebase.auth();
            const db = firebase.firestore();

            // Because the Chrome Extension runs in a separate context, we cannot
            // reuse the React app's session automatically unless they share cookies (they don't).
            // Here, we grab the UID the user pasted into the settings.
            const manualUid = uidInput.value.trim();

            // Save the UID to storage for next time if they provided one
            if (manualUid) {
                chrome.storage.local.set({ tractionUid: manualUid });
            }

            let finalUid = manualUid;

            // Optional Fallback to Anonymous ONLY if they didn't provide a manual UID
            if (!finalUid) {
                let user = auth.currentUser;
                if (!user) {
                    const cred = await auth.signInAnonymously();
                    user = cred.user;
                }
                finalUid = user.uid;
            }

            const newJob = {
                title: titleInput.value,
                company: companyInput.value,
                location: locationInput.value,
                priority: prioritySelect.value,
                status: statusSelect.value,
                link: linkInput.value || null,
                userId: finalUid,
                dateApplied: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection("jobs").add(newJob);

            // Success State
            mainView.classList.add("hidden");
            successView.classList.remove("hidden");

        } catch (err) {
            console.error("Firebase save failed:", err);
            showError("Failed to save to database. Have you enabled Anonymous Auth?");
            saveBtn.disabled = false;
            saveBtn.innerText = "Save to Pipeline";
        }
    });

    // 3. Helper Functions
    function showError(msg) {
        errorMsg.innerText = msg;
        errorMsg.classList.remove("hidden");
    }

    // Close popup
    closeBtn.addEventListener("click", () => {
        window.close();
    });
});
