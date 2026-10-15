import { readFileSync } from "node:fs";
import vm from "node:vm";
import { before, test } from "node:test";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../../Source Code/extension/utils/popup/firestoreService.js", import.meta.url), "utf8");
const sandbox = { self: {}, URL, console };
sandbox.window = sandbox.self;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
// Inside the vm, `globalThis` is the sandbox object itself.
const svc = sandbox.__OFFERWARD_TEST__ ?? sandbox.self.STJPopup?.firestoreService;

const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8086";
const project = "demo-offerward";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// The emulator accepts unsigned tokens (as @firebase/rules-unit-testing does).
const token = (uid, verified = true) => {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, user_id: uid, iat: now, exp: now + 3600,
    auth_time: now, email: `${uid}@example.com`, email_verified: verified, firebase: { sign_in_provider: "password", identities: {} },
  })}.`;
};

// tests/rules/firebase.json has no rules file, so load the real rules into the emulator.
before(async () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const res = await fetch(`http://${host}/emulator/v1/projects/${project}:securityRules`, {
    method: "PUT", body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content: rules }] } }),
  });
  assert.equal(res.status, 200, "could not load firestore.rules into the emulator");
});

async function commit(uid, body, verified = true) {
  const res = await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents:commit`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token(uid, verified)}` },
    body: JSON.stringify(body),
  });
  return res.status;
}

const job = { title: "Firmware Intern", company: "Acme", location: "Phoenix, AZ", priority: "high",
              status: "applied", url: "https://www.linkedin.com/jobs/view/1" };

test("extension commit body is accepted by the rules", async () => {
  const body = svc.buildJobCommit({ job, uid: "u1", projectId: project, docId: "abc123", nowIso: new Date().toISOString() });
  assert.equal(await commit("u1", body), 200);
});
test("a saved (not applied) job is accepted too", async () => {
  const body = svc.buildJobCommit({ job: { ...job, status: "saved" }, uid: "u1", projectId: project, docId: "abc124", nowIso: new Date().toISOString() });
  assert.equal(await commit("u1", body), 200);
});
test("saving into another user's folder is rejected", async () => {
  const body = svc.buildJobCommit({ job, uid: "u2", projectId: project, docId: "x1", nowIso: new Date().toISOString() });
  assert.equal(await commit("u1", body), 403);
});
test("unverified email accounts are rejected", async () => {
  const body = svc.buildJobCommit({ job, uid: "u3", projectId: project, docId: "x2", nowIso: new Date().toISOString() });
  assert.equal(await commit("u3", body, false), 403);
});
test("empty title is rejected by the rules", async () => {
  const body = svc.buildJobCommit({ job: { ...job, title: "" }, uid: "u1", projectId: project, docId: "x3", nowIso: new Date().toISOString() });
  assert.equal(await commit("u1", body), 403);
});
