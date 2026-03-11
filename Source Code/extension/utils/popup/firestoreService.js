window.STJPopup = window.STJPopup || {};

window.STJPopup.firestoreService = (() => {
  function getConfig() {
    return window.STJ_CONFIG || {};
  }

  function getConfigError() {
    const config = getConfig();
    if (!config.projectId) {
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

  async function postJson(url, body, authToken) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
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

  function toFirestoreFields(job) {
    return {
      title: { stringValue: job.title },
      company: { stringValue: job.company },
      location: { stringValue: job.location || "" },
      priority: { stringValue: job.priority },
      status: { stringValue: job.status },
      link: job.link ? { stringValue: job.link } : { nullValue: null },
      userId: { stringValue: job.userId },
      dateApplied: { stringValue: job.dateApplied },
      createdAt: { timestampValue: new Date().toISOString() },
    };
  }

  async function saveJob(job, idToken) {
    const config = assertConfig();
    const url =
      `https://firestore.googleapis.com/v1/projects/${config.projectId}` +
      "/databases/(default)/documents/jobs";

    return postJson(
      url,
      {
        fields: toFirestoreFields(job),
      },
      idToken,
    );
  }

  return {
    getConfigError,
    saveJob,
  };
})();
