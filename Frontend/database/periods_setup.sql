-- Create periods table for school schedule system
-- คาบเรียน - Period Management

-- Drop table if exists (for testing purposes)
DROP TABLE IF EXISTS periods;

-- Create periods table
CREATE TABLE IF NOT EXISTS periods (
  period_no INT PRIMARY KEY,                 -- 1..12 (หรือมากกว่า)
  period_name TEXT NOT NULL,                 -- 'คาบที่ 1', 'คาบที่ 2', 'พักเที่ยง', 'เรียนพิเศษ'
  start_time TIME NOT NULL,                  -- เวลาเริ่ม เช่น '08:00'
  end_time   TIME NOT NULL,                  -- เวลาสิ้นสุด เช่น '08:50'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data สำหรับโรงเรียนมัธยมปกติ
INSERT INTO periods (period_no, period_name, start_time, end_time) VALUES
-- คาบเรียนปกติ
(1, 'คาบที่ 1', '08:00', '08:50'),
(2, 'คาบที่ 2', '08:50', '09:40'),
(3, 'คาบที่ 3', '09:40', '10:30'),
(4, 'คาบที่ 4', '10:30', '11:20'),

-- พักกลางวัน
(5, 'พักเที่ยง', '11:20', '12:20'),

-- คาบบ่าย
(6, 'คาบที่ 5', '12:20', '13:10'),
(7, 'คาบที่ 6', '13:10', '14:00'),
(8, 'คาบที่ 7', '14:00', '14:50'),
(9, 'คาบที่ 8', '14:50', '15:40'),

-- คาบพิเศษ
(10, 'เรียนเสริม', '15:40', '16:30'),
(11, 'กิจกรรมลูกเสือ', '16:30', '17:20'),
(12, 'ศึกษาเพิ่มเติม', '17:20', '18:10');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_periods_time ON periods(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_periods_name ON periods(period_name);

-- ตรวจสอบข้อมูล
SELECT 
    period_no,
    period_name,
    start_time,
    end_time,
    TIMEDIFF(end_time, start_time) AS duration
FROM periods 
ORDER BY period_no;
