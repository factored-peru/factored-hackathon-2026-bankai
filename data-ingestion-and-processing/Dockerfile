# Offline KDD / graph pipeline for Cloud Run Jobs (ADR 0020).
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY pyproject.toml README.md ./
COPY src ./src
COPY config ./config
COPY scripts ./scripts

RUN python -m pip install --no-cache-dir -e .

# Cloud Run Job overrides args; default is help (fail closed without --run-id).
ENTRYPOINT ["bankai-pipeline"]
CMD ["--help"]
