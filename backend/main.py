import asyncio
import ipaddress
import json
import os
import time
import uuid
from contextlib import asynccontextmanager
from io import BytesIO
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from scraper import scrape_article
from sitemap import discover_articles
from exporter import build_docx


# ---------- SECURITY ----------

API_KEY = os.getenv("API_KEY", "")

def verify_api_key(x_api_key: str = Header(default="")):
    """Reject requests that don't carry the correct X-API-Key header."""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

# IP ranges that must never be fetched (SSRF protection)
_PRIVATE_NETS = [
    ipaddress.ip_network(r) for r in (
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "169.254.0.0/16",   # AWS/GCP metadata
        "100.64.0.0/10",    # Carrier-grade NAT
        "::1/128",
        "fc00::/7",
    )
]

def assert_safe_url(url: str) -> None:
    """Raise 400 if the URL targets localhost or a private network."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError
        hostname = (parsed.hostname or "").lower()
        if not hostname or hostname == "localhost":
            raise ValueError
        try:
            ip = ipaddress.ip_address(hostname)
            if any(ip in net for net in _PRIVATE_NETS):
                raise ValueError
        except ValueError as exc:
            # Re-raise only if it came from our private-net check
            if "private" in str(exc) or not hostname:
                raise
            # It's a regular domain name — fine
    except ValueError:
        raise HTTPException(status_code=400, detail="URL not allowed")


# ---------- FILE STORE (with TTL cleanup) ----------

# {file_id: (buffer, created_at_epoch)}
file_store: dict[str, tuple[BytesIO, float]] = {}
FILE_TTL = 1800  # 30 minutes


async def _cleanup_loop():
    """Background task: purge files older than FILE_TTL every 5 minutes."""
    while True:
        await asyncio.sleep(300)
        cutoff = time.time() - FILE_TTL
        expired = [k for k, (_, ts) in file_store.items() if ts < cutoff]
        for k in expired:
            del file_store[k]


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()


# ---------- APP ----------

app = FastAPI(title="Content Scraper API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- MODELS ----------

class DiscoverRequest(BaseModel):
    url: str

class ScrapeRequest(BaseModel):
    urls: list[str]


# ---------- ROUTES ----------

@app.get("/")
def root():
    return {"status": "ok", "message": "Content Scraper API is running"}


@app.post("/discover", dependencies=[Depends(verify_api_key)])
def discover(req: DiscoverRequest):
    """Auto-detect sitemap from the given URL and return a list of article URLs."""
    assert_safe_url(req.url)
    articles, method = discover_articles(req.url)
    if not articles:
        raise HTTPException(
            status_code=404,
            detail="No articles found. The site may block crawlers, or try pasting URLs manually."
        )
    return {"articles": articles, "count": len(articles), "method": method}


@app.post("/scrape", dependencies=[Depends(verify_api_key)])
async def scrape(req: ScrapeRequest):
    """Scrape a list of URLs, stream progress via SSE, and store the resulting .docx."""
    for url in req.urls:
        assert_safe_url(url)

    urls = req.urls
    total = len(urls)
    file_id = str(uuid.uuid4())
    scraped_articles = []
    errors = []

    async def event_generator():
        nonlocal scraped_articles, errors
        # Fire immediately so the client knows the stream is live
        yield {
            "data": json.dumps({
                "type": "progress",
                "current": 0,
                "total": total,
                "title": "Starting…",
            })
        }
        await asyncio.sleep(0)

        for i, url in enumerate(urls, start=1):
            article = await asyncio.to_thread(scrape_article, url)
            if article:
                scraped_articles.append(article)
                yield {
                    "data": json.dumps({
                        "type": "progress",
                        "current": i,
                        "total": total,
                        "title": article["title"],
                    })
                }
            else:
                errors.append(url)
                yield {
                    "data": json.dumps({
                        "type": "error",
                        "url": url,
                        "message": "Failed to extract content",
                    })
                }
            await asyncio.sleep(0)

        if scraped_articles:
            docx_buf = await asyncio.to_thread(build_docx, scraped_articles)
            file_store[file_id] = (docx_buf, time.time())

        yield {
            "data": json.dumps({
                "type": "done",
                "file_id": file_id if scraped_articles else None,
                "success_count": len(scraped_articles),
                "error_count": len(errors),
                "errors": errors,
            })
        }

    return EventSourceResponse(event_generator())


@app.get("/download/{file_id}")
def download(file_id: str):
    """Return the generated .docx file and remove it from memory."""
    entry = file_store.pop(file_id, None)
    if entry is None:
        raise HTTPException(status_code=404, detail="File not found or already downloaded")

    buf, _ = entry
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="scraped-content-{file_id[:8]}.docx"'},
    )
