export interface Student {
  id: string;
  wallet_address: string;
  student_name: string;
  grade_level: number;
  learning_points: number;
  created_at: string;
  total_activities: number;
}

export interface ActivityScore {
  id: string;
  wallet_address: string;
  total_score: number;
  participation_score: number;
  engagement_score: number;
  consistency_score: number;
  duration_score: number;
  active_days: number;
  total_points: number;
  activity_count: number;
  engagement_level: 'LOW' | 'MODERATE' | 'HIGH';
  engagement_factors: any[];
  learning_progress: number;
  peer_interactions_count: number;
  collaborative_activities_count: number;
  first_activity_date: string;
  last_activity_date: string;
  calculated_at: string;
}

export interface LearningActivity {
  id: string;
  student_address: string;
  resource_address: string;
  points_earned: number;
  activity_type: string;
  timestamp: string;
}