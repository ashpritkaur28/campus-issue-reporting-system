import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ISSUE_CATEGORIES, IssueCategory } from './ml/trainingData.ts';

export type ComplaintStatus = 'Pending' | 'Resolved';

export interface ComplaintRecord {
  id: number;
  complaint_code: string;
  student_name: string;
  student_id: string;
  category: IssueCategory;
  location: string;
  description: string;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
}

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'campus_issues',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function initDatabase(): Promise<void> {
  await pool.execute(`
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
      INDEX idx_complaints_category (category)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id TINYINT PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS count FROM complaints'
  );
  if (Number(rows[0]?.count ?? 0) > 0) {
    return;
  }

  const initialComplaints: Array<{
    code: string;
    studentName: string;
    studentId: string;
    category: IssueCategory;
    location: string;
    description: string;
    status: ComplaintStatus;
  }> = [
    {
      code: 'CMP-2026-0001',
      studentName: 'Rohan Sharma',
      studentId: 'EN23CS301018',
      category: 'Network & Wi-Fi',
      location: 'Block B, Computer Lab 2',
      description: 'Internet is not working in the computer lab and ethernet ports show disconnected.',
      status: 'Pending',
    },
    {
      code: 'CMP-2026-0002',
      studentName: 'Ananya Verma',
      studentId: 'EN23CS301042',
      category: 'IT & Lab Equipment',
      location: 'Academic Block A, Room 204',
      description: 'Classroom overhead projector is not turning on and HDMI cable connector is loose.',
      status: 'Resolved',
    },
    {
      code: 'CMP-2026-0003',
      studentName: 'Kabir Patel',
      studentId: 'EN23ME302009',
      category: 'Plumbing & Water',
      location: 'Mechanical Wing, Ground Floor',
      description: 'Drinking water cooler near the staircase is leaking water continuously onto the floor.',
      status: 'Pending',
    },
    {
      code: 'CMP-2026-0004',
      studentName: 'Meera Nair',
      studentId: 'EN23EC304051',
      category: 'Electrical & Lighting',
      location: 'Lecture Theatre 3',
      description: 'Two ceiling tube lights are flickering and the back row power socket is sparking.',
      status: 'Resolved',
    },
    {
      code: 'CMP-2026-0005',
      studentName: 'Siddharth Joshi',
      studentId: 'EN23CS301077',
      category: 'Cleanliness & Sanitation',
      location: 'Block C, 2nd Floor Washroom',
      description: 'Washroom floor is dirty, soap dispenser is empty, and dustbin is overflowing.',
      status: 'Pending',
    },
    {
      code: 'CMP-2026-0006',
      studentName: 'Priya Deshmukh',
      studentId: 'EN23IT305023',
      category: 'Infrastructure & Furniture',
      location: 'Classroom 105',
      description: 'Two wooden desk benches have broken legs and the window latch is jammed.',
      status: 'Pending',
    },
    {
      code: 'CMP-2026-0007',
      studentName: 'Vikram Singh',
      studentId: 'EN23CE306014',
      category: 'Library & Academic',
      location: 'Central Library, Quiet Reading Zone',
      description: 'OPAC search terminal is frozen and two Data Structures reference books are missing.',
      status: 'Resolved',
    },
    {
      code: 'CMP-2026-0008',
      studentName: 'Neha Kulkarni',
      studentId: 'EN23CS301089',
      category: 'Security & Safety',
      location: 'East Gate Parking Walkway',
      description: 'Security floodlight near the parking gate is out and CCTV camera appears offline.',
      status: 'Pending',
    },
    {
      code: 'CMP-2026-0009',
      studentName: 'Aditya Tiwari',
      studentId: 'EN23EE307033',
      category: 'Hostel & Mess',
      location: 'Boys Hostel Block 2, Wing B',
      description: 'Hot water geyser in the second floor bathroom is not heating since yesterday morning.',
      status: 'Pending',
    },
  ];

  for (const item of initialComplaints) {
    await pool.execute(
      `INSERT INTO complaints (
        complaint_code, student_name, student_id, category, location, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.code,
        item.studentName,
        item.studentId,
        item.category,
        item.location,
        item.description,
        item.status,
      ]
    );
  }
}

export async function createComplaint(input: {
  studentName: string;
  studentId: string;
  category: IssueCategory;
  location: string;
  description: string;
}): Promise<ComplaintRecord> {
  const year = new Date().getUTCFullYear();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [maxRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(id), 0) AS maxId FROM complaints FOR UPDATE'
    );
    const nextNumber = Number(maxRows[0]?.maxId ?? 0) + 1;
    const complaintCode = `CMP-${year}-${String(nextNumber).padStart(4, '0')}`;

    const [insertRes] = await conn.execute<ResultSetHeader>(
      `INSERT INTO complaints (
        complaint_code, student_name, student_id, category, location, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        complaintCode,
        input.studentName,
        input.studentId,
        input.category,
        input.location,
        input.description,
      ]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT * FROM complaints WHERE id = ?',
      [insertRes.insertId]
    );
    await conn.commit();
    return rows[0] as ComplaintRecord;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listComplaints(filters: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<ComplaintRecord[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.status && (filters.status === 'Pending' || filters.status === 'Resolved')) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.category && ISSUE_CATEGORIES.includes(filters.category as IssueCategory)) {
    conditions.push('category = ?');
    params.push(filters.category);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      '(complaint_code LIKE ? OR student_name LIKE ? OR student_id LIKE ? OR location LIKE ? OR description LIKE ?)'
    );
    params.push(term, term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM complaints ${whereClause} ORDER BY created_at DESC, id DESC`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as ComplaintRecord[];
}

export async function updateComplaintStatus(
  id: number,
  status: ComplaintStatus
): Promise<ComplaintRecord | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE complaints SET status = ? WHERE id = ?',
    [status, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM complaints WHERE id = ?',
    [id]
  );
  return (rows[0] as ComplaintRecord) ?? null;
}

export async function deleteComplaintById(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM complaints WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

export interface DashboardStats {
  total: number;
  pending: number;
  resolved: number;
  resolutionRate: number;
  byCategory: Array<{
    category: IssueCategory;
    total: number;
    pending: number;
    resolved: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [summaryRows] = await pool.execute<RowDataPacket[]>(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved
    FROM complaints
  `);

  const summary = {
    total: Number(summaryRows[0]?.total ?? 0),
    pending: Number(summaryRows[0]?.pending ?? 0),
    resolved: Number(summaryRows[0]?.resolved ?? 0),
  };

  const [categoryRows] = await pool.execute<RowDataPacket[]>(`
    SELECT
      category,
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved
    FROM complaints
    GROUP BY category
  `);

  const rowMap = new Map(
    categoryRows.map((row) => [
      String(row.category),
      {
        total: Number(row.total ?? 0),
        pending: Number(row.pending ?? 0),
        resolved: Number(row.resolved ?? 0),
      },
    ])
  );

  const byCategory = ISSUE_CATEGORIES.map((category) => {
    const match = rowMap.get(category);
    return {
      category,
      total: match?.total ?? 0,
      pending: match?.pending ?? 0,
      resolved: match?.resolved ?? 0,
    };
  });

  const resolutionRate =
    summary.total > 0 ? Math.round((summary.resolved / summary.total) * 100) : 0;

  return {
    total: summary.total,
    pending: summary.pending,
    resolved: summary.resolved,
    resolutionRate,
    byCategory,
  };
}