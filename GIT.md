# Pushing to Git

Algorithy lives in `apps/app`, but the repo itself is the monorepo root (the
folder that holds `apps/`). Run all of this from there. There is no repo yet, so
start with the one-time setup, then use the loop below.

## One-time setup

- `git init` - creates an empty repository in the current folder.
- `git add -A` - stages every file, honouring `.gitignore`.
- `git commit -m "Initial commit"` - saves the staged files as the first snapshot.
- `git branch -M main` - renames the default branch to `main`.
- `git remote add origin <url>` - points the local repo at the empty GitHub repo you created.
- `git push -u origin main` - uploads `main` and remembers `origin` for next time.

## Everyday loop

- `git status` - shows what changed and what is staged.
- `git add -A` - stages everything you changed.
- `git commit -m "message"` - records the staged changes as a snapshot.
- `git push` - uploads your new commits to `origin`.

## Notes

- Commit `bun.lock` and `.gitignore`; never commit `node_modules/` or `dist/`.
- If `git push` is rejected, run `git pull --rebase` then `git push` again.
- Check what you are about to commit with `git status` before `git commit`.
