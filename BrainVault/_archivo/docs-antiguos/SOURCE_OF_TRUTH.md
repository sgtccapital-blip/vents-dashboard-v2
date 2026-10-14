# Source of Truth

## Decision
The official source of truth for the Command Center is:

`/Users/admin/Documents/Dashboard Events`

## Status
- This root contains the live application, documentation, BrainVault, operational workspace, and current Antigravity changes.
- The nested folder `repo_git/` is a legacy repository snapshot.
- `repo_git/` must not be treated as the active working directory.
- `repo_git/` is ignored by the root repository and is preserved temporarily for historical reference.

## Git policy
- New work is tracked from the root `Dashboard Events/` directory.
- Secrets and local runtime data remain ignored through `.gitignore`.
- `db.json` remains local/dynamic and is not committed.
- Strategic documents under `docs/` are part of the source of truth.
- BrainVault is part of the operating knowledge base and can be versioned unless a future privacy rule says otherwise.

## Remote policy
The legacy remote is:

`https://github.com/sgtccapital-blip/vents-dashboard-v2.git`

The new root repository is initialized locally first. A remote migration/push should happen only after reviewing the new root history and deciding whether to replace or preserve the remote history.
