document.addEventListener("DOMContentLoaded", () => {
  // Grab references to all DOM elements we need
  const authView = document.getElementById("auth-view");
  const mainView = document.getElementById("main-view");
  const successView = document.getElementById("success-view");
  const errorMsg = document.getElementById("error-msg");
  const authErrorMsg = document.getElementById("auth-error-msg");

  const titleInput = document.getElementById("title");
  const companyInput = document.getElementById("company");
  const locationInput = document.getElementById("location");
  const prioritySelect = document.getElementById("priority");
  const statusSelect = document.getElementById("status");
  const linkInput = document.getElementById("link");
  const saveBtn = document.getElementById("save-btn");
  const closeBtn = document.getElementById("close-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // Theme elements
  const themeToggle = document.getElementById("theme-toggle");
  const sunIcon = themeToggle ? themeToggle.querySelector(".sun-icon") : null;
  const moonIcon = themeToggle ? themeToggle.querySelector(".moon-icon") : null;

  function setTheme(isDark) {
    if (isDark) {
      document.body.classList.add("dark");
      if (sunIcon) sunIcon.classList.remove("hidden");
      if (moonIcon) moonIcon.classList.add("hidden");
    } else {
      document.body.classList.remove("dark");
      if (sunIcon) sunIcon.classList.add("hidden");
      if (moonIcon) moonIcon.classList.remove("hidden");
    }
  }

  // Initial Theme Load
  chrome.storage.local.get(["theme"], (result) => {
    const isSystemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    // Default to system preference if no stored theme
    const storedTheme = result.theme;

    let isDark;
    if (storedTheme === "dark") {
      isDark = true;
    } else if (storedTheme === "light") {
      isDark = false;
    } else {
      isDark = isSystemDark;
    }

    setTheme(isDark);
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      // Toggle based on current state of body class
      const isDark = document.body.classList.contains("dark");
      const newTheme = !isDark;

      setTheme(newTheme);
      // Save preference
      chrome.storage.local.set({ theme: newTheme ? "dark" : "light" }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error saving theme preference:",
            chrome.runtime.lastError,
          );
        }
      });
    });
  }
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const btnAuthSubmit = document.getElementById("btn-auth-submit");
  const btnGoogle = document.getElementById("btn-google");
  const authToggle = document.getElementById("auth-toggle");

  let isSignUp = false;
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user && !user.isAnonymous) {
      authView.classList.add("hidden");
      mainView.classList.remove("hidden");
      successView.classList.add("hidden");
      scrapePage();
    } else {
      authView.classList.remove("hidden");
      mainView.classList.add("hidden");
      successView.classList.add("hidden");
    }
  });

  // Toggle between Sign In and Sign Up
  authToggle.addEventListener("click", () => {
    isSignUp = !isSignUp;
    if (isSignUp) {
      btnAuthSubmit.innerText = "Sign Up";
      authToggle.innerText = "Already have an account? Sign in";
    } else {
      btnAuthSubmit.innerText = "Sign In";
      authToggle.innerText = "Don't have an account? Sign up";
    }
    authErrorMsg.classList.add("hidden");
  });

  // Handle Email/Password Auth
  btnAuthSubmit.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email || !password) {
      showAuthError("Please enter email and password.");
      return;
    }

    btnAuthSubmit.disabled = true;
    btnAuthSubmit.innerText = "Loading...";
    authErrorMsg.classList.add("hidden");

    try {
      if (isSignUp) {
        await auth.createUserWithEmailAndPassword(email, password);
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      showAuthError(err.message || "Authentication failed.");
    } finally {
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = isSignUp ? "Sign Up" : "Sign In";
    }
  });

  // Handle Google Auth
  btnGoogle.addEventListener("click", async () => {
    btnGoogle.disabled = true;
    authErrorMsg.classList.add("hidden");

    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
      if (chrome.runtime.lastError) {
        console.error("Chrome Identity error:", chrome.runtime.lastError);
        showAuthError(
          "Google sign-in failed. Did you configure the OAuth Client ID in manifest.json?",
        );
        btnGoogle.disabled = false;
        return;
      }

      try {
        const credential = firebase.auth.GoogleAuthProvider.credential(
          null,
          token,
        );
        await auth.signInWithCredential(credential);
      } catch (err) {
        console.error("Firebase Auth error:", err);
        showAuthError(err.message || "Firebase sign-in failed.");
      } finally {
        btnGoogle.disabled = false;
      }
    });
  });

  // Handle Logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    }
  });

  // 1. On load, inject content.js into the active tab to scrape data
  function scrapePage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        // Execute the scraper in the context of the webpage
        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            files: ["content.js"],
          },
          () => {
            // Send message to the scraper
            chrome.tabs.sendMessage(
              activeTab.id,
              { action: "scrapeJob" },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.warn(
                    "Could not scrape page (maybe it's a restricted Chrome URL?). Defaulting to empty.",
                    chrome.runtime.lastError.message,
                  );
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
              },
            );
          },
        );
      }
    });
  }

  // 2. Handle Save Button click (Push to Firestore)
  saveBtn.addEventListener("click", async () => {
    // Basic validation
    if (!titleInput.value || !companyInput.value) {
      showError("Job Title and Company are required.");
      return;
    }

    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      showError("You must be logged in to save jobs.");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";
    errorMsg.classList.add("hidden");

    try {
      const newJob = {
        title: titleInput.value,
        company: companyInput.value,
        location: locationInput.value,
        priority: prioritySelect.value,
        status: statusSelect.value,
        link: linkInput.value || null,
        userId: user.uid,
        dateApplied: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date()),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("jobs").add(newJob);

      // Success State
      mainView.classList.add("hidden");
      successView.classList.remove("hidden");
    } catch (err) {
      console.error("Firebase save failed:", err);
      showError("Failed to save to database.");
      saveBtn.disabled = false;
      saveBtn.innerText = "Save this application";
    }
  });

  // 3. Helper Functions
  function showError(msg) {
    errorMsg.innerText = msg;
    errorMsg.classList.remove("hidden");
  }

  function showAuthError(msg) {
    authErrorMsg.innerText = msg;
    authErrorMsg.classList.remove("hidden");
  }

  // Close popup
  closeBtn.addEventListener("click", () => {
    window.close();
  });
});
