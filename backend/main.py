"""
SnapFlow Backend — FastAPI + Playwright
Deploy on Railway: https://railway.app
"""

from __future__ import annotations

import asyncio
import base64
import io
import re
import sys
import zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright

# On Windows, uvicorn may install a SelectorEventLoop policy, but Playwright's
# subprocess transport requires the Proactor loop. Force it process-wide.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# FastAPI/uvicorn and Playwright conflict on Windows when sharing the same
# asyncio loop. Run each Playwright job in a worker thread that owns a fresh
# event loop via asyncio.run(), fully isolated from uvicorn's loop.
_executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VIEWPORT_W   = 1440
VIEWPORT_H   = 900
SCROLL_STEP  = 700
SCROLL_DELAY = 700
FINAL_DELAY  = 2000

class CaptureRequest(BaseModel):
    url: str

def safe_name(url: str) -> str:
    host = urlparse(url).netloc.replace("www.", "")
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", host)

@app.get("/health")
async def health():
    return {"status": "ok"}

async def _capture_task(url: str) -> list[bytes]:
    """Playwright capture. Runs inside a fresh event loop on a worker thread."""
    shots: list[bytes] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H}
        )

        await page.goto(url, wait_until="networkidle", timeout=40_000)

        # Pass 1: scroll to trigger lazy images
        total_height = await page.evaluate("document.body.scrollHeight")
        scrolled = 0
        while scrolled < total_height:
            scrolled += SCROLL_STEP
            await page.evaluate(f"window.scrollTo(0, {scrolled})")
            await page.wait_for_timeout(SCROLL_DELAY)
            total_height = await page.evaluate("document.body.scrollHeight")

        await page.wait_for_timeout(FINAL_DELAY)

        # Pass 2: scroll back, take shots
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(400)
        total_height = await page.evaluate("document.body.scrollHeight")

        position = 0
        while True:
            await page.evaluate(f"window.scrollTo(0, {position})")
            await page.wait_for_timeout(200)
            png = await page.screenshot(full_page=False)
            shots.append(png)
            if position + VIEWPORT_H >= total_height:
                break
            position += SCROLL_STEP

        await browser.close()

    return shots

@app.post("/capture")
async def capture(req: CaptureRequest):
    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        # Run Playwright in a worker thread with its own event loop.
        loop = asyncio.get_event_loop()
        shots: list[bytes] = await loop.run_in_executor(
            _executor, lambda: asyncio.run(_capture_task(url))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Build ZIP in memory
    zip_buffer = io.BytesIO()
    base = safe_name(url)
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, data in enumerate(shots, 1):
            zf.writestr(f"{base}_shot{i:02d}.png", data)
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={base}_screenshots.zip"},
    )

async def _preview_task(url: str) -> list[str]:
    """Playwright preview. Runs inside a fresh event loop on a worker thread."""
    shots: list[str] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H}
        )

        await page.goto(url, wait_until="networkidle", timeout=40_000)

        total_height = await page.evaluate("document.body.scrollHeight")
        scrolled = 0
        while scrolled < total_height:
            scrolled += SCROLL_STEP
            await page.evaluate(f"window.scrollTo(0, {scrolled})")
            await page.wait_for_timeout(SCROLL_DELAY)
            total_height = await page.evaluate("document.body.scrollHeight")

        await page.wait_for_timeout(FINAL_DELAY)
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(400)
        total_height = await page.evaluate("document.body.scrollHeight")

        position = 0
        while True:
            await page.evaluate(f"window.scrollTo(0, {position})")
            await page.wait_for_timeout(200)
            png = await page.screenshot(full_page=False)
            shots.append(base64.b64encode(png).decode())
            if position + VIEWPORT_H >= total_height:
                break
            position += SCROLL_STEP

        await browser.close()

    return shots

@app.post("/preview")
async def preview(req: CaptureRequest):
    """Returns base64 thumbnails for preview before download."""
    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        # Run Playwright in a worker thread with its own event loop.
        loop = asyncio.get_event_loop()
        shots: list[str] = await loop.run_in_executor(
            _executor, lambda: asyncio.run(_preview_task(url))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"shots": shots, "count": len(shots)}
