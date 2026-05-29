# HVAC Monitoring API

Backend for an HVAC maintenance monitoring system. It ingests sensor readings, detects anomalies with machine learning, scores unit health, generates maintenance recommendations, raises alerts, and an AI assistant for technicians.

## Features

- **Sensor ingestion** — Record temperature, pressure, airflow, vibration, and power readings for five HVAC units
- **Anomaly detection** — Isolation Forest model flags unusual operating patterns across all sensor metrics
- **Health scoring** — Derives a 0–100 health score and status (`healthy`, `warning`, `critical`) from anomaly rates
- **Recommendations** — Rule-based maintenance guidance with evidence, confidence, and priority levels
- **Alerts** — Auto-generated alerts on new sensor events when priority exceeds threshold
- **Dashboard stats** — Fleet overview with unit counts, average health, active alerts, and anomaly trend
- **AI assistant** — GPT-powered explanations and chat grounded in recommendation data (via OpenRouter)
- **MCP server** — Exposes HVAC tools for AI agent integrations

## Tech Stack

- **FastAPI** + **Uvicorn** — REST API
- **SQLAlchemy** + **SQLite** — Data persistence
- **scikit-learn** — Isolation Forest anomaly detection
- **pandas** — Data preprocessing
- **OpenAI SDK** — AI assistant (OpenRouter)
- **FastMCP** — Model Context Protocol server

## Getting Started

### Prerequisites

- Python 3.10+

### Setup

```bash
# Clone and enter the project
cd softway-hvac-backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (required for AI assistant)
echo "OPENROUTER_API_KEY=your_key_here" > .env
```

### Run the API

```bash
uvicorn main:app --reload
```

### Run the MCP Server

```bash
python -m hvac_mcp.server
```

## API Endpoints

### HVAC

| Method | Path              | Description                                                    |
| ------ | ----------------- | -------------------------------------------------------------- |
| `GET`  | `/hvac`           | List all units with health scores, status, and recommendations |
| `GET`  | `/hvac/{unit_id}` | Detailed view for a single unit                                |

### Events

| Method | Path                        | Description                                         |
| ------ | --------------------------- | --------------------------------------------------- |
| `POST` | `/events`                   | Ingest a new sensor reading (auto-generates alerts) |
| `GET`  | `/events/latest/{unit_id}`  | Latest reading for a unit                           |
| `GET`  | `/events/history/{unit_id}` | Historical readings (default limit: 50)             |

### Alerts

| Method  | Path                         | Description               |
| ------- | ---------------------------- | ------------------------- |
| `GET`   | `/alerts`                    | All alerts                |
| `GET`   | `/alerts/active`             | Unresolved alerts only    |
| `GET`   | `/alerts/{alert_id}`         | Single alert by ID        |
| `PATCH` | `/alerts/{alert_id}/resolve` | Mark an alert as resolved |

### Stats

| Method | Path              | Description                                                                |
| ------ | ----------------- | -------------------------------------------------------------------------- |
| `GET`  | `/stats/overview` | Fleet overview (unit counts, average health, active alerts, anomaly trend) |

### Assistant

| Method | Path                           | Description                                           |
| ------ | ------------------------------ | ----------------------------------------------------- |
| `GET`  | `/assistant/explain/{unit_id}` | AI-generated explanation of a unit's condition        |
| `GET`  | `/assistant/context/{unit_id}` | Raw recommendation context (for debugging)            |
| `POST` | `/assistant/chat`              | Ask the maintenance assistant a question about a unit |

## Project Structure

```
├── api/                  # FastAPI route handlers
│   ├── hvac.py
│   ├── events.py
│   ├── alerts.py
│   ├── stats.py
│   └── assistant.py
├── services/             # Business logic
│   ├── anomaly_service.py
│   ├── scoring_service.py
│   ├── recommendation_service.py
│   ├── alert_service.py
│   ├── stats_service.py
│   ├── ai_service.py
│   └── preprocessing_service.py
├── db/                   # Database setup and seeding
│   ├── database.py
│   ├── schema.sql
│   └── seed.py
├── schemas/              # Pydantic request/response models
├── constants/            # System prompts for AI assistant
├── hvac_mcp/             # MCP server and tools
├── data/                 # CSV sensor dataset
└── main.py               # Application entry point
```

## How It Works

1. **Preprocessing** — Sensor data is cleaned (deduplicated, sorted, interpolated) before use.
2. **Anomaly detection** — An Isolation Forest model trained on all five sensor features flags readings that deviate from normal patterns.
3. **Health scoring** — Anomaly percentage is converted to a health score: `100 - (anomaly_percentage × 3)`.
4. **Recommendations** — Top anomalies per unit are analyzed for fault patterns (high vibration, low airflow, elevated power/temperature) and mapped to maintenance actions with evidence.
5. **Alerts** — When a new sensor event is recorded, alerts are generated for units with medium or higher priority, avoiding duplicates for already-active alerts.
6. **AI assistant** — Recommendation context is sent to GPT-4o-mini via OpenRouter to produce technician-friendly explanations and chat responses.

## Environment variables

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY= YOUR_OPENROUTER_KEY
```
