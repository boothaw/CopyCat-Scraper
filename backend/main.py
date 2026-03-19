import asyncio
import json
import uuid
from io import BytesIO

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from scraper import scrape_article
from sitemap import discover_articles
from exporter import build_docx

app = FastAPI(title="Content Scraper API")

# CORS — allow all origins (no credentials used, so this is safe)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for generated .docx files keyed by UUID
file_store: dict[str, BytesIO] = {}


# ---------- MODELS ----------

class DiscoverRequest(BaseModel):
    url: str

class ScrapeRequest(BaseModel):
    urls: list[str]


# ---------- ROUTES ----------

@app.get("/")
def root():
    return {"status": "ok", "message": "Content Scraper API is running"}


@app.post("/discover")
def discover(req: DiscoverRequest):
    """
    Auto-detect sitemap from the given URL and return a list of article URLs.
    """
    articles, method = discover_articles(req.url)
    if not articles:
        raise HTTPException(
            status_code=404,
            detail="No articles found. The site may block crawlers, or try pasting URLs manually."
        )
    return {"articles": articles, "count": len(articles), "method": method}


@app.post("/scrape")
async def scrape(req: ScrapeRequest):
    """
    Scrape a list of URLs, stream progress via SSE, and store the resulting .docx.
    """
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
            # Run blocking scrape in thread pool so we don't block the event loop
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
            # Small yield to allow other async tasks to run
            await asyncio.sleep(0)

        # Build the docx and stash it
        if scraped_articles:
            docx_buf = await asyncio.to_thread(build_docx, scraped_articles)
            file_store[file_id] = docx_buf

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
    """
    Return the generated .docx file and remove it from memory.
    """
    buf = file_store.pop(file_id, None)
    if buf is None:
        raise HTTPException(status_code=404, detail="File not found or already downloaded")

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="scraped-content-{file_id[:8]}.docx"'},
    )
