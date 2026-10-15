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
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  /** REST documents:commit body for a new job in users/{uid}/jobs (see firestore.rules). */
  function buildJobCommit({ job, uid, projectId, docId, nowIso }) {
    const name = `projects/${projectId}/databases/(default)/documents/users/${uid}/jobs/${docId}`;
    const s = (v, max) => ({ stringValue: String(v || "").trim().slice(0, max) });
    const fields = {
      company: s(job.company, 200),
      title: s(job.title, 200),
      location: s(job.location, 200),
      url: s(job.url, 2000),
      status: { stringValue: job.status },
      priority: { stringValue: job.priority },
      notes: s("", 5000),
      salary: s("", 100),
      source: { stringValue: "extension" },
      sourceSite: s(hostOf(job.url), 200),
      description: s("", 30000),
      deadlineAt: { nullValue: null },
      followedUpAt: { nullValue: null },
      fromDiscover: { nullValue: null },
      history: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  status: { stringValue: job.status },
                  at: { timestampValue: nowIso },
                },
              },
            },
          ],
        },
      },
      interviews: { arrayValue: { values: [] } },
    };
    const transforms = [
      { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
      { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
    ];
    if (job.status === "applied") {
      transforms.push({ fieldPath: "appliedAt", setToServerValue: "REQUEST_TIME" });
    } else {
      fields.appliedAt = { nullValue: null };
    }
    return {
      writes: [
        {
          update: { name, fields },
          currentDocument: { exists: false },
          updateTransforms: transforms,
        },
      ],
    };
  }

  function newDocId() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  }

  async function saveJob(job, session) {
    const config = assertConfig();
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:commit`;
    const body = buildJobCommit({
      job,
      uid: session.uid,
      projectId: config.projectId,
      docId: newDocId(),
      nowIso: new Date().toISOString(),
    });
    return postJson(url, body, session.idToken);
  }

  // Lets Node load buildJobCommit in tests (tests/extension/commit.test.mjs).
  globalThis.__OFFERWARD_TEST__ = { buildJobCommit };

  return {
    getConfigError,
    saveJob,
    buildJobCommit,
  };
})();
