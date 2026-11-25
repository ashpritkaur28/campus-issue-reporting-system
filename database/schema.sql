-- Campus Issue Reporting System - MySQL Schema
-- Matches SRS Section 3.3 (Complaint Storage and Database Management)

CREATE DATABASE IF NOT EXISTS campus_issue_reporting;
USE campus_issue_reporting;

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_code VARCHAR(24) NOT NULL UNIQUE,
  student_name VARCHAR(120) NOT NULL,
  student_id VARCHAR(40) NOT NULL,
  category VARCHAR(80) NOT NULL,
  location VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_category (category),
  INDEX idx_complaints_created_at (created_at DESC)
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id TINYINT PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO complaints (
  complaint_code, student_name, student_id, category, location, description, status
) VALUES
  ('CMP-2026-0001', 'Rohan Sharma', 'EN23CS301018', 'Network & Wi-Fi', 'Block B, Computer Lab 2', 'Internet is not working in the computer lab and ethernet ports show disconnected.', 'Pending'),
  ('CMP-2026-0002', 'Ananya Verma', 'EN23CS301042', 'IT & Lab Equipment', 'Academic Block A, Room 204', 'Classroom overhead projector is not turning on and HDMI cable connector is loose.', 'Resolved'),
  ('CMP-2026-0003', 'Kabir Patel', 'EN23ME302009', 'Plumbing & Water', 'Mechanical Wing, Ground Floor', 'Drinking water cooler near the staircase is leaking water continuously onto the floor.', 'Pending'),
  ('CMP-2026-0004', 'Meera Nair', 'EN23EC304051', 'Electrical & Lighting', 'Lecture Theatre 3', 'Two ceiling tube lights are flickering and the back row power socket is sparking.', 'Resolved'),
  ('CMP-2026-0005', 'Siddharth Joshi', 'EN23CS301077', 'Cleanliness & Sanitation', 'Block C, 2nd Floor Washroom', 'Washroom floor is dirty, soap dispenser is empty, and dustbin is overflowing.', 'Pending'),
  ('CMP-2026-0006', 'Priya Deshmukh', 'EN23IT305023', 'Infrastructure & Furniture', 'Classroom 105', 'Two wooden desk benches have broken legs and the window latch is jammed.', 'Pending'),
  ('CMP-2026-0007', 'Vikram Singh', 'EN23CE306014', 'Library & Academic', 'Central Library, Quiet Reading Zone', 'OPAC search terminal is frozen and two Data Structures reference books are missing.', 'Resolved'),
  ('CMP-2026-0008', 'Neha Kulkarni', 'EN23CS301089', 'Security & Safety', 'East Gate Parking Walkway', 'Security floodlight near the parking gate is out and CCTV camera appears offline.', 'Pending'),
  ('CMP-2026-0009', 'Aditya Tiwari', 'EN23EE307033', 'Hostel & Mess', 'Boys Hostel Block 2, Wing B', 'Hot water geyser in the second floor bathroom is not heating since yesterday morning.', 'Pending');
