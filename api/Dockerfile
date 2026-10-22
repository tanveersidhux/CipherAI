# =============================================================================
# CIPHER AI Backend: Production Dockerfile
# Multi-stage, non-root user, lightweight Debian slim base
# =============================================================================

FROM python:3.12-slim as builder

WORKDIR /build

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies to wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -r requirements.txt

# Final runner stage
FROM python:3.12-slim as runner

WORKDIR /app

# Create unprivileged application user
RUN groupadd -r cipher && useradd -r -g cipher -u 10001 cipher

# Install wheels from builder stage
COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir /wheels/* && \
    rm -rf /wheels

# Copy application source
COPY app ./app

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    PORT=8000

# Grant non-root user ownership
RUN chown -R cipher:cipher /app

USER cipher

EXPOSE 8000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

# Launch ASGI server
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
