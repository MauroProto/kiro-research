"""
Research Agent - Professional Hypothesis Validation System

A sophisticated research agent that validates or refutes hypotheses using:
- Adversarial search (evidence FOR and AGAINST)
- Source reliability scoring
- Conflict detection and resolution
- Confidence-based reporting
"""

from .graph.workflow import app, build_workflow
from .schemas.hypothesis import Hypothesis
from .schemas.claim import Claim
from .schemas.evidence import Evidence
from .schemas.finding import Finding
from .schemas.report import Report

__version__ = "0.1.0"

__all__ = [
    "app",
    "build_workflow",
    "Hypothesis",
    "Claim",
    "Evidence",
    "Finding",
    "Report",
]

