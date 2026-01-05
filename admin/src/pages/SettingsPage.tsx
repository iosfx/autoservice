import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { api } from '../api/client';
import { format } from 'date-fns';

interface Summary {
  lastCalendarSyncAt?: string;
}

export function SettingsPage() {
  const { data: summary } = useQuery({
    queryKey: ['retention-summary'],
    queryFn: () => api.get<Summary>('/dashboard/retention-summary'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Garage Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">Last Calendar Sync:</span>
            <span>
              {summary?.lastCalendarSyncAt
                ? format(new Date(summary.lastCalendarSyncAt), 'PPp')
                : 'Never'}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Future Settings</h2>
        <div className="text-neutral-500 text-sm">
          Additional settings for quiet hours, message provider configuration, and more will be
          available in future updates.
        </div>
      </Card>
    </div>
  );
}
