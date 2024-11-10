import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import type { Student } from '@/types/student';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

export function StudentList({ students, onSelectStudent }: StudentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Student;
    direction: 'asc' | 'desc';
  }>({ key: 'learning_points', direction: 'desc' });

  const filteredStudents = students.filter((student) =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    }
    return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
  });

  const handleSort = (key: keyof Student) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('grade_level')}
                  className="flex items-center space-x-1"
                >
                  Grade Level
                  {sortConfig.key === 'grade_level' &&
                    (sortConfig.direction === 'asc' ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('learning_points')}
                  className="flex items-center space-x-1"
                >
                  Learning Points
                  {sortConfig.key === 'learning_points' &&
                    (sortConfig.direction === 'asc' ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead>Activities</TableHead>
              <TableHead>Wallet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map((student) => (
              <TableRow
                key={student.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectStudent(student)}
              >
                <TableCell className="font-medium">
                  {student.student_name}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Grade {student.grade_level}</Badge>
                </TableCell>
                <TableCell>{student.learning_points}</TableCell>
                <TableCell>{student.total_activities}</TableCell>
                <TableCell className="font-mono text-sm">
                  {student.wallet_address.slice(0, 6)}...
                  {student.wallet_address.slice(-4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}