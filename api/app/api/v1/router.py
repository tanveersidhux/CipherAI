"""API v1 master router."""

from fastapi import APIRouter

from app.api.v1.explanations import router as explanations_router
from app.api.v1.health import router as health_router
from app.api.v1.scans import (
    analyze_message_endpoint,
    analyze_url_endpoint,
    router as scans_router,
)
from app.core.rate_limit import rate_limit_dependency
from app.schemas.threat_report import ThreatReport
from fastapi import Depends

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health_router)
v1_router.include_router(scans_router)
v1_router.include_router(explanations_router)

# Singular /scan alias router for contract flexibility
scan_alias_router = APIRouter(prefix="/scan", tags=["Scans"])
scan_alias_router.add_api_route(
    "/url",
    analyze_url_endpoint,
    methods=["POST"],
    response_model=ThreatReport,
    dependencies=[Depends(rate_limit_dependency)],
    include_in_schema=False,
)
scan_alias_router.add_api_route(
    "/message",
    analyze_message_endpoint,
    methods=["POST"],
    response_model=ThreatReport,
    dependencies=[Depends(rate_limit_dependency)],
    include_in_schema=False,
)
v1_router.include_router(scan_alias_router)
