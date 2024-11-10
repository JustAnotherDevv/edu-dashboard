import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Users,
  Trophy,
  Clock,
  Activity,
  BarChart3,
} from 'lucide-react';
import type { Student, ActivityScore } from '@/types/student';

interface StudentDetailsProps {
  student: Student;
  activityScore: ActivityScore;
}

export function StudentDetails({ student, activityScore }: StudentDetailsProps) {
  const mockChartData = [
    { name: 'Mon', score: 65 },
    { name: 'Tue', score: 75 },
    { name: 'Wed', score: 85 },
    { name: 'Thu', score: 70 },
    { name: 'Fri', score: 90 },
  ];

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-green-500';
      case 'MODERATE':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {student.student_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Grade {student.grade_level} · {student.wallet_address}
          </p>
        </div>
        <Badge
          className={`${getEngagementColor(
            activityScore.engagement_level
          )} text-white`}
        >
          {activityScore.engagement_level} Engagement
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-medium">Learning Progress</h3>
          </div>
          <Progress
            value={activityScore.learning_progress}
            className="mt-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {activityScore.learning_progress}% Complete
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-medium">Peer Interactions</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {activityScore.peer_interactions_count}
          </p>
          <p className="text-xs text-muted-foreground">Total interactions</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-medium">Learning Points</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">{student.learning_points}</p>
          <p className="text-xs text-muted-foreground">Total earned</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-medium">Active Days</h3>
          </div>
          <p className="mt-2 text-2xl font-bold">{activityScore.active_days}</p>
          <p className="text-xs text-muted-foreground">Days of activity</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Engagement Trend</h3>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Performance Metrics</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span>Participation Score</span>
              <span className="font-medium">
                {activityScore.participation_score.toFixed(1)}
              </span>
            </div>
            <Progress
              value={activityScore.participation_score}
              className="mt-2"
            />
          </div>
          <Separator />
          <div>
            <div className="flex justify-between text-sm">
              <span>Engagement Score</span>
              <span className="font-medium">
                {activityScore.engagement_score.toFixed(1)}
              </span>
            </div>
            <Progress
              value={activityScore.engagement_score}
              className="mt-2"
            />
          </div>
          <Separator />
          <div>
            <div className="flex justify-between text-sm">
              <span>Consistency Score</span>
              <span className="font-medium">
                {activityScore.consistency_score.toFixed(1)}
              </span>
            </div>
            <Progress
              value={activityScore.consistency_score}
              className="mt-2"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}