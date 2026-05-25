CREATE TABLE sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    temp REAL,
    pressure REAL,
    airflow REAL,
    vibration REAL,
    power REAL
);

CREATE TABLE hvac_status (
    unit_id TEXT PRIMARY KEY,
    health_score INTEGER DEFAULT 100,
    status TEXT DEFAULT 'healthy',
    last_updated TEXT
);

CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    resolved INTEGER DEFAULT 0
);