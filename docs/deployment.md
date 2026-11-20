# Deployment

GitHub Pages hosts Miga at https://miga.realpace.app/.

## Repository setup

- In **Settings → Pages**, select **GitHub Actions** as the publishing source.
- In **Settings → Environments → github-pages**, allow tags matching `v*.*.*`
  under **Selected branches and tags**. Once the release workflow is on
  `main`, the environment only needs the tag rule.
- In **Settings → Secrets and variables → Actions**, add the repository secret
  `RELEASE_PLEASE_TOKEN`. A fine-grained personal access token scoped to this
  repository needs read and write access to **Contents**, **Issues**, and **Pull
  requests**. Release Please uses this token to create release PRs and publish
  releases that trigger other workflows.

## Publish a release

1. Release Please runs after pushes to `main` and proposes a version and
   changelog in a pull request. It updates `package.json` and the release
   manifest in that PR. The Release Please workflow can also run manually from
   `main`, for example after adding the token.
2. Review and merge the release PR when the changes are ready. Release Please
   creates the version tag and publishes the GitHub release.
3. Publishing a stable release runs the [required checks](testing.md) and
   builds the tagged commit. The tag must match the version in `package.json`
   with a leading `v`. Pages deploys the resulting build after the checks pass.

Branch pushes, tag pushes, and prereleases cannot deploy the site. The footer
shows the version from the running build, including in offline mode.
