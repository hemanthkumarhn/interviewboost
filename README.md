# InterviewBoost

InterviewBoost is a minimal Phase 0 resume optimization app built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- Landing page
- Resume input page
- AI-powered JD matching API
- Improved resume preview
- PDF export
- Free watermark / Pro mock toggle
- Simple applied jobs tracker

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- jsPDF

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.local.example .env.local
```

3. Add one AI provider to `.env.local`:

```bash
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
```

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

or

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

4. Start the app:

```bash
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/resume`

Provider priority in the app:
1. Groq
2. OpenAI
3. Gemini

## Deploy to Vercel

InterviewBoost is a standard Next.js app, so Vercel deployment is zero-config.

### Option 1: Deploy from GitHub

1. Push this repo to GitHub.
2. Go to the Vercel dashboard.
3. Click `Add New...` -> `Project`.
4. Import `hemanthkumarhn/interviewboost`.
5. Keep the default Next.js settings.
6. Add the same environment variables from `.env.local`.
7. Click `Deploy`.

### Option 2: Deploy with Vercel CLI

1. Install the CLI:

```bash
npm i -g vercel
```

2. From the project root:

```bash
vercel
```

3. For production:

```bash
vercel --prod
```

## Connect the `interviewboost.in` Domain

After the project is deployed:

1. Open your Vercel project.
2. Go to `Settings` -> `Domains`.
3. Add:
   - `interviewboost.in`
   - `www.interviewboost.in` (recommended)
4. Update DNS based on Vercel’s instructions:
   - Apex domain usually points to `76.76.21.21`
   - `www` usually points to Vercel via CNAME
5. Wait for DNS verification to complete.
6. Set your preferred primary domain in Vercel.

If your domain is managed outside Vercel, copy the exact DNS records shown in the Vercel dashboard and add them at your domain registrar.

## Notes

- The job tracker uses browser `localStorage`.
- `Improve again` performs a second-pass refinement.
- PDF download adds a watermark in Free mode and removes it in Pro mode.
