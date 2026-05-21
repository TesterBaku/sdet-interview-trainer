# Start Here

> **Status (2026-05-21):** ✅ **Historical.** These were the original kickoff instructions for setting up an empty project. The app is now built and deployed. For current setup steps see the "Local development" section of [README.md](README.md).


## Your Project Path

```text
C:\Rufat_docs\Projects\interview_prep_app
```

## Step 1 — Create Folder

Open PowerShell and run:

```powershell
mkdir "C:\Rufat_docs\Projects\interview_prep_app"
cd "C:\Rufat_docs\Projects\interview_prep_app"
```

If the folder already exists:

```powershell
cd "C:\Rufat_docs\Projects\interview_prep_app"
```

## Step 2 — Copy These Docs

Copy all generated `.md` files into:

```text
C:\Rufat_docs\Projects\interview_prep_app
```

## Step 3 — Initialize Next.js

From inside the folder:

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*"
```

When prompted, use reasonable defaults.

## Step 4 — Start App

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## Step 5 — Give Codex This Instruction

Tell Codex:

```text
Read README.md, PROJECT_REQUIREMENTS.md, CODEX_IMPLEMENTATION_PLAN.md, APP_ARCHITECTURE.md, DATA_SCHEMA.md, CONTENT_PLAN.md, and MVP_ROADMAP.md.

Build the MVP exactly according to CODEX_IMPLEMENTATION_PLAN.md.
Start with the app skeleton, static JSON content, and 3 sample questions per topic.
Do not add login, backend, AI, or payment features.
```
