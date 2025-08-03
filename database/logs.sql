DROP TABLE IF EXISTS Logs;
CREATE TABLE IF NOT EXISTS Logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT,
    message TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO Logs (command, message, created) VALUES
    ('pwd', '~', '2024-01-15 10:30:00');
