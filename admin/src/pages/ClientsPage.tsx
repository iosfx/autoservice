import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { api } from '../api/client';

interface Client {
  id: string;
  name: string;
  phone: string;
  birthday?: string;
}

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', birthday: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setCreateModal(false);
      setFormData({ name: '', phone: '', birthday: '' });
      showToast('Client created successfully', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const filteredClients = clients?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button onClick={() => setCreateModal(true)}>Add Client</Button>
      </div>

      <Card>
        <input
          type="search"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients?.map((client) => (
          <div
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="cursor-pointer"
          >
            <Card className="hover:shadow-md transition-shadow">
              <div className="font-semibold text-lg">{client.name}</div>
              <div className="text-sm text-neutral-600">{client.phone}</div>
              {client.birthday && (
                <div className="text-xs text-neutral-500 mt-2">
                  Birthday: {client.birthday}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>

      {filteredClients?.length === 0 && (
        <Card>
          <div className="text-center text-neutral-500 py-8">No clients found</div>
        </Card>
      )}

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Add Client">
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Birthday (optional)</label>
            <input
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending || !formData.name || !formData.phone}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
