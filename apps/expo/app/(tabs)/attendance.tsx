import { useEffect, useState } from 'react';
import { View, Text } from '@sams/ui';
import { SplitPaneAttendance } from '@sams/ui';
import { attendanceApi } from '@sams/api';
import type { AttendanceSession } from '@sams/api';

export default function AttendanceTab() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  useEffect(() => { attendanceApi.getSessions().then(setSessions).catch(() => {}); }, []);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950 p-4">
      <Text className="text-xl font-black text-slate-900 dark:text-white mb-4">Attendance</Text>
      {sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 text-sm">No sessions available</Text>
        </View>
      ) : (
        <SplitPaneAttendance
          sessions={sessions}
          getAttendance={attendanceApi.getSessionAttendance}
          onMark={attendanceApi.markAttendance}
        />
      )}
    </View>
  );
}
