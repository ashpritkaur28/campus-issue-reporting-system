export type IssueCategory =
  | 'Network & Wi-Fi'
  | 'IT & Lab Equipment'
  | 'Electrical & Lighting'
  | 'Plumbing & Water'
  | 'Cleanliness & Sanitation'
  | 'Infrastructure & Furniture'
  | 'Hostel & Mess'
  | 'Library & Academic'
  | 'Security & Safety';

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

export interface CategoryPrediction {
  suggestedCategory: IssueCategory;
  confidence: number;
  preprocessedTokens: string[];
  matchedKeywords: string[];
  topScores: Array<{
    category: IssueCategory;
    probability: number;
  }>;
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

export type AppView = 'report' | 'admin' | 'ml' | 'docs';
