# GitHub → Netlify + VPS sync

The workflow in `.github/workflows/deploy.yml` runs backend tests, deploys the
backend to the isolated `m88-itsm.service` on port `3011`, and deploys the
frontend to Netlify after every push to `main`.

Add these GitHub repository secrets:

- `VPS_HOST`: `5.223.78.194`
- `VPS_USER`: the dedicated VPS deploy user (recommended; avoid root)
- `VPS_SSH_KEY`: private key matching the deploy user's authorized key
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The VPS must already have `/opt/m88-itsm-integration/.env` containing the
production database, JWT, Redis, and mail settings, plus a systemd unit named
`m88-itsm.service` listening on port `3011`. The workflow never touches the
existing application services or unrelated database schemas.
