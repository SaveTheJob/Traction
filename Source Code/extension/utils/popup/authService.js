window.STJPopup = window.STJPopup || {};

window.STJPopup.authService = (() => {
  const SESSION_KEY = "stjAuthSession";
  const AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";
  const TOKEN_BASE_URL = "https://securetoken.googleapis.com/v1";

  const AUTH_ERROR_MESSAGES = {
    EMAIL_EXISTS: "This email is already in use.",
    EMAIL_NOT_FOUND: "No account found for this email.",
    INVALID_PASSWORD: "Invalid email or password.",
    INVALID_LOGIN_CREDENTIALS: "Invalid email or password.",
    USER_DISABLED: "This account has been disabled.",
    INVALID_IDP_RESPONSE: "Google sign-in failed. Please try again.",
    USER_NOT_FOUND: "User account not found.",
    TOKEN_EXPIRED: "Session expired. Please sign in again.",
    INVALID_REFRESH_TOKEN: "Session expired. Please sign in again.",
  };

  let currentSession = null;

  function getConfig() {
    return window.STJ_CONFIG || {};
  }

  function getConfigError() {
    const config = getConfig();
    if (!config.apiKey || !config.projectId || !config.authDomain) {
      return "Extension config is missing. Please reload the extension.";
    }

    return null;
  }

  function assertConfig() {
    const error = getConfigError();
    if (error) {
      const configError = new Error(error);
      configError.code = "MISSING_CONFIG";
      throw configError;
    }

    return getConfig();
  }

  function mapAuthError(errorCode, fallbackMessage) {
    if (typeof errorCode !== "string") {
      return fallbackMessage;
    }

    return AUTH_ERROR_MESSAGES[errorCode] || fallbackMessage;
  }

  function getStorageValue(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(result[key] || null);
      });
    });
  }

  function setStorageValue(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      });
    });
  }

  function removeStorageValue(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      });
    });
  }

  function getGoogleAccessToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(
            new Error(
              chrome.runtime.lastError?.message || "No Google token returned.",
            ),
          );
          return;
        }

        resolve(token);
      });
    });
  }

  function clearCachedGoogleTokens() {
    return new Promise((resolve) => {
      if (!chrome.identity.clearAllCachedAuthTokens) {
        resolve();
        return;
      }

      chrome.identity.clearAllCachedAuthTokens(() => resolve());
    });
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorCode =
        payload?.error?.message ||
        payload?.error?.status ||
        `HTTP_${response.status}`;
      const error = new Error(errorCode);
      error.code = errorCode;
      throw error;
    }

    return payload;
  }

  async function refreshSession(refreshToken) {
    const config = assertConfig();
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(
      `${TOKEN_BASE_URL}/token?key=${config.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorCode =
        payload?.error?.message || payload?.error || `HTTP_${response.status}`;
      const error = new Error(errorCode);
      error.code = errorCode;
      throw error;
    }

    return {
      idToken: payload.id_token,
      refreshToken: payload.refresh_token,
      uid: payload.user_id,
      email: currentSession?.email || "",
      expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    };
  }

  function normalizeAuthSession(authPayload, fallbackEmail) {
    return {
      idToken: authPayload.idToken,
      refreshToken: authPayload.refreshToken,
      uid: authPayload.localId,
      email: authPayload.email || fallbackEmail || "",
      expiresAt: Date.now() + Number(authPayload.expiresIn || 3600) * 1000,
    };
  }

  async function storeSession(session) {
    currentSession = session;
    await setStorageValue(SESSION_KEY, session);
  }

  async function clearSession() {
    currentSession = null;
    await removeStorageValue(SESSION_KEY);
  }

  async function ensureValidSession() {
    if (!currentSession) {
      currentSession = await getStorageValue(SESSION_KEY);
    }

    if (!currentSession || !currentSession.idToken || !currentSession.uid) {
      return null;
    }

    const refreshWindowMs = 60 * 1000;
    if (
      currentSession.expiresAt &&
      Date.now() < currentSession.expiresAt - refreshWindowMs
    ) {
      return currentSession;
    }

    try {
      const refreshed = await refreshSession(currentSession.refreshToken);
      await storeSession(refreshed);
      return refreshed;
    } catch (error) {
      console.warn("Session refresh failed:", error);
      await clearSession();
      return null;
    }
  }

  async function signUpWithEmailPassword(email, password) {
    const config = assertConfig();
    const response = await postJson(
      `${AUTH_BASE_URL}/accounts:signUp?key=${config.apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
    );

    await storeSession(normalizeAuthSession(response, email));
    return currentSession;
  }

  async function signInWithEmailPassword(email, password) {
    const config = assertConfig();
    const response = await postJson(
      `${AUTH_BASE_URL}/accounts:signInWithPassword?key=${config.apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
    );

    await storeSession(normalizeAuthSession(response, email));
    return currentSession;
  }

  async function signInWithGoogle() {
    const config = assertConfig();
    const accessToken = await getGoogleAccessToken();
    const requestUri = `https://${config.authDomain}/__/auth/handler`;
    const postBody =
      `access_token=${encodeURIComponent(accessToken)}` +
      "&providerId=google.com";

    const response = await postJson(
      `${AUTH_BASE_URL}/accounts:signInWithIdp?key=${config.apiKey}`,
      {
        postBody,
        requestUri,
        returnSecureToken: true,
        returnIdpCredential: true,
      },
    );

    await storeSession(normalizeAuthSession(response));
    return currentSession;
  }

  async function signOut() {
    await clearSession();
    await clearCachedGoogleTokens();
  }

  return {
    getConfigError,
    mapAuthError,
    ensureValidSession,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInWithGoogle,
    signOut,
  };
})();
