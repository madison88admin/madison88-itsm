# Git history scrub and secret rotation

This document describes the recommended steps to remove leaked secrets from repository history and rotate them safely.

IMPORTANT: coordinate with all collaborators before rewrites. Force-pushing rewritten history will invalidate existing clones.

Prerequisites
- Install `git-filter-repo` (recommended) or `BFG Repo-Cleaner`.
- Have push access and be prepared to force-push to your protected branches (requires temporarily disabling branch protection or follow org workflow).

High-level steps (git-filter-repo)

1. Rotate credentials first
- Immediately revoke/rotate any exposed Brevo / Sendinblue keys (xkeysib-..., xsmtpsib-...).
- Create new keys and update production environment variables (Render, Netlify) BEFORE rewriting history if possible.

2. Mirror the repository locally (safe working copy)

```bash
# clone a fresh copy
git clone --mirror https://github.com/madison88admin/madison88-itsm.git
cd madison88-itsm.git
```

3. Run git-filter-repo to remove secrets

- Prepare a file `secrets-to-remove.txt` listing exact secret strings (one per line) that were leaked. DO NOT include patterns, use the exact values flagged by GitHub secret scanning.

```bash
# Example
cat > secrets-to-remove.txt <<EOF
xkeysib-EXAMPLETESTKEY
xsmtpsib-EXAMPLESMTPKEY
EOF

# Run filter
git filter-repo --invert-paths --paths-from-file secrets-to-remove.txt
```

Note: `--invert-paths` + `--paths-from-file` is for removing files. To rewrite content (redact strings) use `--replace-text` with a file mapping. Example `replacements.txt`:

```
# replace exact secret with REPLACED_SECRET
xkeysib-EXAMPLETESTKEY==>REDACTED_BREVO_KEY
xsmtpsib-EXAMPLESMTPKEY==>REDACTED_SMTP_KEY
```

Then run:

```bash
git filter-repo --replace-text replacements.txt
```

4. Verify results
- Inspect the reflog, run `git log --all --grep 'EXAMPLETESTKEY'` to ensure secrets no longer appear.

5. Force-push cleaned history

```bash
# force-push refs back to origin (coordinate with admins)
git push --force --all
git push --force --tags
```

6. Post-cleanup steps
- Ask all collaborators to reclone the repository (old clones will have the old history).
- Rotate any keys that were leaked again (rotate after push to be safe).
- Re-enable branch protections if you disabled them.

Alternatives
- BFG Repo-Cleaner: simpler to use for common removal tasks. See https://rtyley.github.io/bfg-repo-cleaner/ for examples.

Caveats
- Rewriting history is _destructive_ and will change commit SHAs. Coordinate carefully.
- GitHub may still flag leaked keys in the past for a short time; after rotation and scrub the alerts will eventually clear.

If you want, I can generate an exact `replacements.txt` if you provide the exact leaked strings (or I can scan the repo locally to list likely secrets). I will not accept or store secrets here; only work within your local repo.
