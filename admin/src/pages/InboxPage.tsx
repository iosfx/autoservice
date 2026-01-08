import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { format } from 'date-fns';

type QueueStatus = 'DUE' | 'SCHEDULED' | 'BLOCKED' | 'FAILED' | 'SENT';

interface RetentionSummary {
  dueCount: number;
  scheduledCount: number;
  failedCount: number;
  blockedCount: number;
  sentLast24hCount: number;
}

interface QueueItem {
  id: string;
  clientName: string;
  clientPhone: string;
  carLicensePlate: string;
  triggerType: string;
  channel: string;
  scheduledFor: string;
  renderedPreview: string | null;
  status: QueueStatus;
  blockedReason?: string;
  carId?: string;
  clientId?: string;
}

export function InboxPage() {
  const [activeTab, setActiveTab] = useState<QueueStatus>('DUE');
  const [lookaheadDays, setLookaheadDays] = useState('14');
  const [dispatchLimit, setDispatchLimit] = useState('100');
  const [rescheduleModal, setRescheduleModal] = useState<{ id: string; current: string } | null>(null);
  const [newScheduledFor, setNewScheduledFor] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: summary } = useQuery({
    queryKey: ['retention-summary'],
    queryFn: () => api.get<RetentionSummary>('/dashboard/retention-summary'),
  });

  const { data: queueData } = useQuery({
    queryKey: ['retention-queue', activeTab],
    queryFn: () => api.get<{ queue: QueueItem[] }>(`/retention/queue?status=${activeTab}`),
  });

  const runRetentionMutation = useMutation({
    mutationFn: () => api.post('/retention/run', { lookaheadDays: parseInt(lookaheadDays) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention-summary'] });
      queryClient.invalidateQueries({ queryKey: ['retention-queue'] });
      showToast('Retention generation completed', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const dispatchMutation = useMutation({
    mutationFn: () => api.post('/messages/dispatch', { limit: parseInt(dispatchLimit) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['retention-summary'] });
      queryClient.invalidateQueries({ queryKey: ['retention-queue'] });
      showToast(`Sent ${data.sent} messages, ${data.failed} failed`, 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const sendNowMutation = useMutation({
    mutationFn: (id: string) => api.post(`/retention/queue/${id}/send-now`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention-queue'] });
      showToast('Message sent', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/retention/queue/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention-queue'] });
      showToast('Message cancelled', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledFor }: { id: string; scheduledFor: string }) =>
      api.post(`/retention/queue/${id}/reschedule`, { scheduledFor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention-queue'] });
      setRescheduleModal(null);
      showToast('Message rescheduled', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleReschedule = () => {
    if (rescheduleModal && newScheduledFor) {
      rescheduleMutation.mutate({
        id: rescheduleModal.id,
        scheduledFor: new Date(newScheduledFor).toISOString(),
      });
    }
  };

  const tabs: { status: QueueStatus; label: string; count?: number }[] = [
    { status: 'DUE', label: 'Due', count: summary?.dueCount },
    { status: 'SCHEDULED', label: 'Scheduled', count: summary?.scheduledCount },
    { status: 'BLOCKED', label: 'Blocked', count: summary?.blockedCount },
    { status: 'FAILED', label: 'Failed', count: summary?.failedCount },
    { status: 'SENT', label: 'Sent' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Retention Inbox</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-neutral-600">Due Now</div>
          <div className="text-3xl font-bold text-primary-600">{summary?.dueCount || 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-600">Scheduled</div>
          <div className="text-3xl font-bold">{summary?.scheduledCount || 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-600">Blocked</div>
          <div className="text-3xl font-bold text-yellow-600">{summary?.blockedCount || 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-600">Sent (24h)</div>
          <div className="text-3xl font-bold text-green-600">{summary?.sentLast24hCount || 0}</div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={lookaheadDays}
              onChange={(e) => setLookaheadDays(e.target.value)}
              className="input w-20"
              placeholder="Days"
            />
            <Button
              onClick={() => runRetentionMutation.mutate()}
              disabled={runRetentionMutation.isPending}
            >
              {runRetentionMutation.isPending ? 'Running...' : 'Run Retention'}
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={dispatchLimit}
              onChange={(e) => setDispatchLimit(e.target.value)}
              className="input w-20"
              placeholder="Limit"
            />
            <Button
              onClick={() => dispatchMutation.mutate()}
              disabled={dispatchMutation.isPending}
            >
              {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Due'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.status
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-sm">({tab.count})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {queueData?.queue.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-lg">{item.clientName}</div>
                  <span className="badge badge-neutral">{item.carLicensePlate}</span>
                  <span className="badge badge-primary">{item.channel}</span>
                </div>
                <div className="text-sm text-neutral-600">
                  {item.clientPhone} • {item.triggerType}
                </div>
                {item.renderedPreview && (
                  <div className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3">
                    {item.renderedPreview}
                  </div>
                )}
                {item.blockedReason && (
                  <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    Blocked: {item.blockedReason}
                  </div>
                )}
                <div className="text-xs text-neutral-500">
                  Scheduled: {format(new Date(item.scheduledFor), 'PPp')}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {item.status === 'DUE' && (
                  <Button
                    variant="primary"
                    onClick={() => sendNowMutation.mutate(item.id)}
                    disabled={sendNowMutation.isPending}
                  >
                    Send Now
                  </Button>
                )}
                {(item.status === 'DUE' || item.status === 'SCHEDULED') && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRescheduleModal({ id: item.id, current: item.scheduledFor });
                        setNewScheduledFor(format(new Date(item.scheduledFor), "yyyy-MM-dd'T'HH:mm"));
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => cancelMutation.mutate(item.id)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {queueData?.queue.length === 0 && (
          <Card>
            <div className="text-center text-neutral-500 py-8">No items in this tab</div>
          </Card>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <Modal
          isOpen={true}
          onClose={() => setRescheduleModal(null)}
          title="Reschedule Message"
        >
          <div className="space-y-4">
            <div>
              <label className="label">New scheduled time</label>
              <input
                type="datetime-local"
                value={newScheduledFor}
                onChange={(e) => setNewScheduledFor(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setRescheduleModal(null)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending}>
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
