-- Migration number: 0002
-- Create substitutions table for tracking substitute teachers
-- Schema: stores one record per absent teacher per date with period_1 to period_9 columns

CREATE TABLE IF NOT EXISTS substitutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER NOT NULL,
    absent_teacher_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday

    -- Period columns: stores teacher_id of substitute teacher for each period (NULL if no substitute)
    period_1 INTEGER,
    period_2 INTEGER,
    period_3 INTEGER,
    period_4 INTEGER,
    period_5 INTEGER,
    period_6 INTEGER,
    period_7 INTEGER,
    period_8 INTEGER,
    period_9 INTEGER,

    -- Additional info
    reason TEXT, -- Reason for absence (not used yet, reserved for future)
    details TEXT, -- Additional details

    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Indexes for performance
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_substitutions_semester ON substitutions(semester_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_absent_teacher ON substitutions(absent_teacher_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_date ON substitutions(date);
CREATE INDEX IF NOT EXISTS idx_substitutions_semester_date ON substitutions(semester_id, date);

-- Composite index for common query pattern (by semester and teacher)
CREATE INDEX IF NOT EXISTS idx_substitutions_semester_teacher ON substitutions(semester_id, absent_teacher_id);
