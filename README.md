# Campus Issue Reporting System

Full-stack web application implementing the **Software Requirements Specification (SRS)** for the **Campus Issue Reporting System (Software Engineering [CS3CO40])**.

## Features Implemented

- **Student Complaint Submission (`FR-1.1` – `FR-1.9`)**: Validated online form collecting Student Name, Student ID, Campus Location, Issue Description, and Issue Category with unique reference ID generation (`CMP-YYYY-XXXX`) and confirmation summary.
- **ML Category Suggestion (`FR-2.1` – `FR-2.9`)**: Deterministic text preprocessing (lowercasing, punctuation stripping, stopword filtering, normalization, bigrams) and Multinomial Naive Bayes classification trained on labeled campus issue descriptions. Predicts only the category (no priority prediction) with one-click suggestion acceptance or manual override.
- **MySQL Database Persistence (`FR-3.1` – `FR-3.12`)**: Persistent MySQL relational database (`campus_issue_reporting`) using `mysql2/promise` with parameterized prepared statements. Full MySQL schema and seed script are provided in `database/schema.sql`.
- **Administrator Dashboard (`FR-4.1` – `FR-4.12`)**: Password-protected Admin Console with first-run password setup (or `ADMIN_PASSCODE` env var), search/status/category filters, detailed complaint inspection modal, status transitions (`Pending` / `Resolved`), deletion, and CSV export.
- **Live Chart.js Analytics (`FR-5.1` – `FR-5.8`)**: Real-time Total, Pending, Resolved, and Resolution Rate KPIs paired with interactive Chart.js Category-Wise Bar and Status Doughnut charts.

## Running Locally in VS Code

1. Open the project folder in **Visual Studio Code**.
2. Open the integrated terminal and install dependencies:
   ```bash
   npm install