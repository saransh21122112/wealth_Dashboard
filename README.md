# Aurelia Wealth Dashboard

Aurelia is an AI-powered wealth dashboard designed to be deployed as a subscription-ready web product. The app serves a static frontend through a small Node server, and all OpenAI calls are handled server-side through environment variables.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Add your OpenAI key to `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

4. Start the app:

```bash
npm start
```

5. Open `http://localhost:3000`.

## Structure

- `server.js`: thin server entrypoint
- `server/app.js`: Express app wiring
- `server/routes`: API and health routes
- `server/services`: OpenAI integration layer
- `server/config`: environment loading
- `app/main.js`: dashboard browser entrypoint
- `app/`: state, auth, admin, rendering, forms, and UI modules
- `ai/main.js`: AI browser entrypoint
- `ai/`: prompt, config, tools, API, and UI modules

## Deploy on Render

1. Push this project to a Git repository.
2. Create a new Web Service on Render from that repository.
3. Render will detect the included `Dockerfile`.
4. Add the environment variable `OPENAI_API_KEY` in the Render dashboard.
5. Optionally set `OPENAI_MODEL=gpt-4o-mini`.

## Docker

Build locally:

```bash
docker build -t aurelia-wealth-dashboard .
```

Run locally:

```bash
docker run --env-file .env -p 3000:3000 aurelia-wealth-dashboard
```