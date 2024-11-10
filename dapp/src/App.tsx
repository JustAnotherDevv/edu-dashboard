import { useState } from 'react';
import { StudentList } from '@/components/dashboard/StudentList';
import { StudentDetails } from '@/components/dashboard/StudentDetails';
import type { Student, ActivityScore } from '@/types/student';

// Mock data for demonstration
const mockStudents: Student[] = [
  {
    id: '1',
    wallet_address: '0x1234567890abcdef',
    student_name: 'Alice Johnson',
    grade_level: 10,
    learning_points: 850,
    created_at: '2024-01-15',
    total_activities: 45,
  },
  {
    id: '2',
    wallet_address: '0xabcdef1234567890',
    student_name: 'Bob Smith',
    grade_level: 11,
    learning_points: 720,
    created_at: '2024-01-10',
    total_activities: 38,
  },
];

const mockActivityScore: ActivityScore = {
  id: '1',
  wallet_address: '0x1234567890abcdef',
  total_score: 85,
  participation_score: 90,
  engagement_score: 85,
  consistency_score: 80,
  duration_score: 85,
  active_days: 28,
  total_points: 850,
  activity_count: 45,
  engagement_level: 'HIGH',
  engagement_factors: [],
  learning_progress: 75,
  peer_interactions_count: 23,
  collaborative_activities_count: 15,
  first_activity_date: '2024-01-15',
  last_activity_date: '2024-02-15',
  calculated_at: '2024-02-15',
};

function App() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-1/3 min-w-[400px] border-r p-6">
          <h1 className="mb-6 text-2xl font-bold">Students</h1>
          <StudentList
            students={mockStudents}
            onSelectStudent={setSelectedStudent}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {selectedStudent ? (
            <StudentDetails
              student={selectedStudent}
              activityScore={mockActivityScore}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a student to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;