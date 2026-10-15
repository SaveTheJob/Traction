# Extension commit test

Checks that the request body the extension builds (`buildJobCommit`) is accepted by `firestore.rules`.

From `tests/rules`, with the Firestore emulator running (`firebase emulators:start --only firestore --project demo-offerward`):

    node --test ../extension/commit.test.mjs

The test loads the repo-root `firestore.rules` into the emulator itself (`PUT /emulator/v1/projects/demo-offerward:securityRules`), because `tests/rules/firebase.json` has no rules file.
