"""API v1 master router."""

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.scans import router as scans_router

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health_router)
v1_router.include_router(scans_router)
