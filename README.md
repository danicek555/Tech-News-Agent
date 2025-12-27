# Tech News Digest

Automated tech news aggregator that collects the latest tech news and sends it via email.

## Features

- 🔍 Web search for latest tech news
- 📧 Automated email delivery
- 📅 Scheduled runs (every 2 days at 8:00 AM Denver time)
- 🌍 Multi-language support (English/Czech)
- 🎯 Customizable topics and filters

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file with the following variables:

   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key_here

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password_here
   SMTP_FROM=your_email@gmail.com

   # Workflow Configuration (optional)
   LANGUAGE=en
   TOPICS=artificial intelligence,machine learning,programming
   RECENCY_HOURS=24
   MAX_ITEMS=10
   RECIPIENT_EMAIL=recipient@example.com
   ```

3. **For Gmail:**
   - Enable 2-Step Verification
   - Generate an App Password: https://myaccount.google.com/apppasswords?rapt=AEjHL4Nwaa6glzT81oUy24DmqdVh-jMBYh7bLKjnWDqGFAK5gXxjnvn4J1cjMkXwJMPP6dzQCb6mPTRi0vgl8HYoJRLHcHmfEv-SnNicHQngdvr1FhgHRn0
   - Use the App Password as `SMTP_PASSWORD`

## Usage

**Run manually:**

```bash
npm start
```

**Run with custom input:**

```bash
npm start "Find news about AI"
```

## GitHub Actions

The workflow is configured to run every 2 days at 8:00 AM Denver time (GMT-7, which is 3:00 PM UTC). To set up:

1. Push this repository to GitHub
2. Go to Settings → Secrets and variables → Actions
3. Add all your environment variables as secrets (see `.env.example` for reference)
4. The workflow will automatically run on schedule

## Project Structure

- `digest.ts` - Main workflow file
- `.github/workflows/schedule.yml` - GitHub Actions workflow
- `package.json` - Dependencies and scripts
