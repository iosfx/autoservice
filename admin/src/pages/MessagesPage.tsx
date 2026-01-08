import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { api } from '../api/client';
import { format } from 'date-fns';

interface Message {
  id: string;
  clientId: string;
  type: string;
  content: string;
  status: string;
  sentAt?: string;
  errorMessage?: string;
}

export function MessagesPage() {
  const [filter, setFilter] = useState('');

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.get<Message[]>('/messages/history'),
  });

  const filteredMessages = messages?.filter((m) =>
    m.content.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Message History</h1>

      <Card>
        <input
          type="search"
          placeholder="Search messages..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input"
        />
      </Card>

      <div className="space-y-3">
        {filteredMessages?.map((message) => (
          <Card key={message.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge badge-primary">{message.type}</span>
                  <span
                    className={`badge ${
                      message.status === 'SENT' ? 'badge-success' : 'badge-error'
                    }`}
                  >
                    {message.status}
                  </span>
                  {message.sentAt && (
                    <span className="text-xs text-neutral-500">
                      {format(new Date(message.sentAt), 'PPp')}
                    </span>
                  )}
                </div>
                <div className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3">
                  {message.content}
                </div>
                {message.errorMessage && (
                  <div className="text-sm text-red-600 mt-2">{message.errorMessage}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filteredMessages?.length === 0 && (
          <Card>
            <div className="text-center text-neutral-500 py-8">No messages found</div>
          </Card>
        )}
      </div>
    </div>
  );
}
