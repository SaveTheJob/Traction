document.addEventListener("DOMContentLoaded", () => {
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
  const signOutBtn = document.getElementById("signout-btn");
  const openAppLink = document.getElementById("open-app-link");

  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const btnAuthSubmit = document.getElementById("btn-auth-submit");
  const btnGoogle = document.getElementById("btn-google");
  const authToggle = document.getElementById("auth-toggle");

  const popupServices = window.STJPopup || {};
  const authService = popupServices.authService;
  const firestoreService = popupServices.firestoreService;
  const scrapeService = popupServices.scrapeService;

  let isSignUp = false;

  // The site URL lives in config.js with the other project values.
  const appUrl = (window.STJ_CONFIG || {}).appUrl;
  if (appUrl) openAppLink.href = `${appUrl}/pipeline`;
  else openAppLink.classList.add("hidden");

  function showMainView() {
    authView.classList.add("hidden");
    mainView.classList.remove("hidden");
    successView.classList.add("hidden");
    scrapePage();
  }

  function showAuthView() {
    authView.classList.remove("hidden");
    mainView.classList.add("hidden");
    successView.classList.add("hidden");
  }

  function showSuccessView() {
    mainView.classList.add("hidden");
    successView.classList.remove("hidden");
  }

  function showError(message) {
    errorMsg.innerText = message;
    errorMsg.classList.remove("hidden");
  }

  function showAuthError(message) {
    authErrorMsg.innerText = message;
    authErrorMsg.classList.remove("hidden");
  }

  function fillScrapedFields(scrapedData) {
    titleInput.value = scrapedData.title || "";
    companyInput.value = scrapedData.company || "";
    locationInput.value = scrapedData.location || "";
    linkInput.value = scrapedData.url || "";
  }

  function resetSaveButton() {
    saveBtn.disabled = false;
    saveBtn.innerText = "Save Application";
  }

  if (!authService || !firestoreService || !scrapeService) {
    showAuthError(
      "Extension failed to initialize. Please reload the extension.",
    );
    showAuthView();
    return;
  }

  const configError =
    authService.getConfigError() || firestoreService.getConfigError();
  if (configError) {
    showAuthError(configError);
    showAuthView();
    return;
  }

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
        await authService.signUpWithEmailPassword(email, password);
      } else {
        await authService.signInWithEmailPassword(email, password);
      }

      showMainView();
    } catch (error) {
      console.error("Auth error:", error);
      showAuthError(
        authService.mapAuthError(
          error.code || error.message,
          "Authentication failed.",
        ),
      );
    } finally {
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = isSignUp ? "Sign Up" : "Sign In";
    }
  });

  btnGoogle.addEventListener("click", async () => {
    btnGoogle.disabled = true;
    authErrorMsg.classList.add("hidden");

    try {
      await authService.signInWithGoogle();
      showMainView();
    } catch (error) {
      if (error.message && /OAuth2 request failed/i.test(error.message)) {
        showAuthError(
          "Google sign-in failed. Did you configure the OAuth Client ID in manifest.json?",
        );
      } else {
        console.error("Google sign-in error:", error);
        showAuthError(
          authService.mapAuthError(
            error.code || error.message,
            "Google sign-in failed.",
          ),
        );
      }
    } finally {
      btnGoogle.disabled = false;
    }
  });

  signOutBtn.addEventListener("click", async () => {
    try {
      await authService.signOut();
      showAuthView();
    } catch (error) {
      console.error("Sign Out error:", error);
    }
  });

  saveBtn.addEventListener("click", async () => {
    if (!titleInput.value.trim() || !companyInput.value.trim()) {
      showError("Job Title and Company are required.");
      return;
    }

    const session = await authService.ensureValidSession();
    if (!session || !session.uid) {
      showError("You must be logged in to save jobs.");
      showAuthView();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";
    errorMsg.classList.add("hidden");

    try {
      const newJob = {
        title: titleInput.value.trim(),
        company: companyInput.value.trim(),
        location: locationInput.value.trim(),
        priority: prioritySelect.value,
        status: statusSelect.value,
        url: linkInput.value || "",
      };

      await firestoreService.saveJob(newJob, session);
      showSuccessView();
    } catch (error) {
      console.error("Save job failed:", error);
      showError(
        error.status === 403
          ? "Couldn't save. Check that your email is verified and your device clock is right."
          : "Couldn't save. Try again.",
      );
      resetSaveButton();
    }
  });

  closeBtn.addEventListener("click", () => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "STJ_CLOSE_POPUP" }, "*");
      return;
    }

    window.close();
  });

  async function initializeAuthState() {
    const session = await authService.ensureValidSession();
    if (session && session.uid) {
      showMainView();
      return;
    }

    showAuthView();
  }

  async function scrapePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTabId = urlParams.get("tabId");
    const tabId = paramTabId ? parseInt(paramTabId, 10) : null;

    const scrapedData = await scrapeService.scrapeFromTabId(
      Number.isInteger(tabId) ? tabId : null,
    );
    fillScrapedFields(scrapedData);
  }

  initializeAuthState().catch((error) => {
    console.error("Failed to initialize auth state:", error);
    showAuthView();
  });
});
