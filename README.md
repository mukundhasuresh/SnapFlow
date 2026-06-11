# SnapFlow 📸

> Paste a URL. Get every scroll position captured and zipped in seconds.

Clean SaaS-style web app — black background, white text, Apple aesthetic.  
Frontend on **Vercel**, backend on **Railway**.

---

## Project Structure

```
snapflow/
├── frontend/     → Next.js app (deploy to Vercel)
└── backend/      → FastAPI + Playwright (deploy to Railway)
```

---

## Deploy Backend → Railway

1. Go to [railway.app](https://railway.app) and sign up (free)
2. Click **New Project → Deploy from GitHub repo**
3. Select this repo, set **root directory** to `backend`
4. Railway auto-detects the Dockerfile and builds it
5. Once deployed, copy your Railway URL e.g. `https://snapflow-backend.up.railway.app`

---

## Deploy Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New Project → Import from GitHub**
3. Select this repo, set **root directory** to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Railway URL from above
5. Click Deploy

---

## Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m playwright install chromium
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`

---

## How It Works

1. User pastes a URL on the website
2. Frontend calls `/preview` on the backend
3. Backend launches headless Chromium, slowly scrolls the full page (triggering lazy images), then captures a viewport screenshot every 700px
4. Thumbnails shown in the UI for preview
5. User clicks Download → backend runs `/capture`, returns a ZIP of all screenshots
