<!-- iteration: 2 -->
## Task-016: Deploy pipeline — GitHub Pages (build, test, golden gate, publish)
**Assigned to:** SW Engineer (unassigned until Director confirms team size)
**Depends on:** Task-010
**Can run in parallel with:** Task-013
**Estimated complexity:** S
**Deliverable:** A CI/CD workflow that builds the Vite SPA, runs unit + golden tests + the independent QASM gate + a dependency license/audit check, and on green publishes the static assets to GitHub Pages over HTTPS. (Host is reversible to S3+CloudFront — Director to confirm, HLD OQ-1.)
**Unit test requirement:** The pipeline fails on a red golden test and succeeds on green; the published URL serves the app over HTTPS.
