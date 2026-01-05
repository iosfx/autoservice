import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { api } from '../api/client';

interface Template {
  id: string;
  templateKey: string;
  triggerType: string;
  channel: string;
  name: string;
  body: string;
  enabled: boolean;
}

export function TemplatesPage() {
  const [editModal, setEditModal] = useState<Template | null>(null);
  const previewVariables = {
    clientName: 'John Doe',
    carLicensePlate: 'ABC-123',
    garageName: 'Demo Garage',
  };
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<Template[]>('/templates'),
  });

  const { data: preview, refetch: refetchPreview } = useQuery({
    queryKey: ['template-preview', editModal?.body, previewVariables],
    queryFn: () =>
      api.post<{ rendered: string }>('/templates/preview', {
        body: editModal?.body,
        variables: previewVariables,
      }),
    enabled: !!editModal,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Template>) => api.put(`/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setEditModal(null);
      showToast('Template updated', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/templates/seed-defaults', { overwrite: false }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showToast(`Created ${data.created} templates`, 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const groupedTemplates = templates?.reduce((acc, t) => {
    const key = t.triggerType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Message Templates</h1>
        <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
          {seedMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
        </Button>
      </div>

      {Object.entries(groupedTemplates || {}).map(([triggerType, temps]) => (
        <div key={triggerType}>
          <h2 className="text-xl font-semibold mb-3">{triggerType}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {temps.map((template) => (
              <Card key={template.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-xs text-neutral-500">
                      {template.channel} • {template.templateKey}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      template.enabled ? 'badge-success' : 'badge-neutral'
                    }`}
                  >
                    {template.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3 mb-3 line-clamp-3">
                  {template.body}
                </div>
                <Button variant="secondary" onClick={() => setEditModal(template)}>
                  Edit
                </Button>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {editModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditModal(null)}
          title={`Edit Template - ${editModal.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Enabled</label>
              <input
                type="checkbox"
                checked={editModal.enabled}
                onChange={(e) => setEditModal({ ...editModal, enabled: e.target.checked })}
                className="w-5 h-5"
              />
            </div>
            <div>
              <label className="label">Message Body</label>
              <textarea
                value={editModal.body}
                onChange={(e) => {
                  setEditModal({ ...editModal, body: e.target.value });
                  setTimeout(() => refetchPreview(), 500);
                }}
                className="input min-h-[150px]"
                rows={6}
              />
            </div>
            <div>
              <label className="label">Preview</label>
              <div className="bg-neutral-100 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {preview?.rendered || 'Loading preview...'}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditModal(null)}>
                Cancel
              </Button>
              <Button onClick={() => updateMutation.mutate(editModal)}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
