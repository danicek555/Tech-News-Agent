# GitHub Setup Guide

Follow these steps to set up your Tech News Digest on GitHub with automated scheduling.

## Step 1: Initialize Git Repository

```bash
cd /Users/danielmitka/Desktop/Programování/techNews
git init
git add .
git commit -m "Initial commit: Tech News Digest"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `tech-news-digest`)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)

## Step 3: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/tech-news-digest.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 4: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

### Required Secrets:

- `OPENAI_API_KEY` - Your OpenAI API key
- `SMTP_HOST` - Email server host (e.g., `smtp.gmail.com`)
- `SMTP_PORT` - Email server port (e.g., `587`)
- `SMTP_SECURE` - `false` for port 587, `true` for port 465
- `SMTP_USER` - Your email address
- `SMTP_PASSWORD` - Your email app password (for Gmail, use App Password)
- `SMTP_FROM` - Sender email address
- `RECIPIENT_EMAIL` - Where to send the digest

### Optional Secrets (with defaults):

- `LANGUAGE` - `en` or `cs` (default: `en`)
- `TOPICS` - Comma-separated topics (e.g., `artificial intelligence,machine learning`)
- `RECENCY_HOURS` - How many hours back to search (default: `24`)
- `MAX_ITEMS` - Maximum news items (default: `24`)

## Step 5: Verify Workflow

1. Go to **Actions** tab in your repository
2. You should see "Tech News Digest" workflow
3. Click on it and you can manually trigger it with "Run workflow" button
4. The workflow will automatically run every 2 days at 8:00 AM UTC

## Schedule Timezone

The workflow runs at **8:00 AM UTC**. To convert to your timezone:

- UTC+1 (CET): 9:00 AM
- UTC+2 (CEST): 10:00 AM
- UTC-5 (EST): 3:00 AM
- UTC-8 (PST): 12:00 AM (midnight)

To change the time, edit `.github/workflows/schedule.yml` and modify the cron schedule.

## Troubleshooting

- **Workflow not running?** Check the Actions tab for errors
- **Email not sending?** Verify all SMTP secrets are set correctly
- **No news found?** Check your TOPICS secret and adjust if needed
