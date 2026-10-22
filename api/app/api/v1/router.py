"""API v1 master router."""

from fastapi import APIRouter, Depends

from app.api.v1.batches import router as batches_router
from app.api.v1.cases import router as cases_router
from app.api.v1.config import router as config_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.email_scans import router as email_scans_router
from app.api.v1.explanations import router as explanations_router
from app.api.v1.exports import router as exports_router
from app.api.v1.health import router as health_router
from app.api.v1.me import router as me_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.scans import (
    analyze_message_endpoint,
    analyze_url_endpoint,
)
from app.api.v1.scans import (
    router as scans_router,
)
from app.api.v1.scans_history import router as scans_history_router
from app.core.rate_limit import rate_limit_dependency
from app.schemas.threat_report import ThreatReport

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health_router)
v1_router.include_router(config_router)
v1_router.include_router(scans_router)
v1_router.include_router(email_scans_router)
v1_router.include_router(batches_router)
v1_router.include_router(scans_history_router)
v1_router.include_router(dashboard_router)
v1_router.include_router(cases_router)
v1_router.include_router(exports_router)
v1_router.include_router(me_router)
v1_router.include_router(explanations_router)
v1_router.include_router(metrics_router)

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
