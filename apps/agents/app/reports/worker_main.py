"""Entrada do arq: somente configurações do Worker, sem chave de IA."""

import logging

from app.reports.config import ReportWorkerConfig
from app.reports.worker import worker_options

logging.basicConfig(level=logging.INFO)
WorkerSettings = type("WorkerSettings", (), worker_options(ReportWorkerConfig()))
