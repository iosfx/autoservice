import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface Car {
  id: string;
  clientId: string;
  licensePlate: string;
  vin?: string;
  currentMileage?: number;
  lastServiceDate?: string;
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editModal, setEditModal] = useState(false);
  const [addCarModal, setAddCarModal] = useState(false);
  const [editCarModal, setEditCarModal] = useState<Car | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', birthday: '' });
  const [carForm, setCarForm] = useState({
    licensePlate: '',
    vin: '',
    currentMileage: '',
    lastServiceDate: '',
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get<Client>(`/clients/${id}`),
    enabled: !!id,
  });

  const { data: cars } = useQuery({
    queryKey: ['cars', id],
    queryFn: () => api.get<Car[]>(`/cars?clientId=${id}`),
    enabled: !!id,
  });

  const updateClientMutation = useMutation({
    mutationFn: (data: typeof clientForm) => api.put(`/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      setEditModal(false);
      showToast('Client updated', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const addCarMutation = useMutation({
    mutationFn: (data: any) => api.post('/cars', { ...data, clientId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars', id] });
      setAddCarModal(false);
      setCarForm({ licensePlate: '', vin: '', currentMileage: '', lastServiceDate: '' });
      showToast('Car added', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateMileageMutation = useMutation({
    mutationFn: ({ carId, mileage }: { carId: string; mileage: number }) =>
      api.put(`/cars/${carId}/mileage`, { currentMileage: mileage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars', id] });
      setEditCarModal(null);
      showToast('Mileage updated', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const handleEditClient = () => {
    if (client) {
      setClientForm({
        name: client.name,
        phone: client.phone,
        birthday: client.birthday || '',
      });
      setEditModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{client?.name || 'Client Details'}</h1>
        <Button onClick={handleEditClient}>Edit Client</Button>
      </div>

      <Card>
        <div className="space-y-2">
          <div>
            <span className="text-neutral-600">Phone:</span> {client?.phone}
          </div>
          {client?.birthday && (
            <div>
              <span className="text-neutral-600">Birthday:</span> {client.birthday}
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cars</h2>
        <Button onClick={() => setAddCarModal(true)}>Add Car</Button>
      </div>

      <div className="space-y-3">
        {cars?.map((car) => (
          <Card key={car.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{car.licensePlate}</div>
                {car.vin && <div className="text-sm text-neutral-600">VIN: {car.vin}</div>}
                {car.currentMileage && (
                  <div className="text-sm text-neutral-600">
                    Mileage: {car.currentMileage.toLocaleString()} km
                  </div>
                )}
                {car.lastServiceDate && (
                  <div className="text-xs text-neutral-500">
                    Last service: {car.lastServiceDate}
                  </div>
                )}
              </div>
              <Button variant="secondary" onClick={() => setEditCarModal(car)}>
                Update Mileage
              </Button>
            </div>
          </Card>
        ))}
        {cars?.length === 0 && (
          <Card>
            <div className="text-center text-neutral-500 py-4">No cars added yet</div>
          </Card>
        )}
      </div>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Client">
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={clientForm.phone}
              onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Birthday</label>
            <input
              type="date"
              value={clientForm.birthday}
              onChange={(e) => setClientForm({ ...clientForm, birthday: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateClientMutation.mutate(clientForm)}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={addCarModal} onClose={() => setAddCarModal(false)} title="Add Car">
        <div className="space-y-4">
          <div>
            <label className="label">License Plate</label>
            <input
              type="text"
              value={carForm.licensePlate}
              onChange={(e) => setCarForm({ ...carForm, licensePlate: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">VIN (optional)</label>
            <input
              type="text"
              value={carForm.vin}
              onChange={(e) => setCarForm({ ...carForm, vin: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Current Mileage</label>
            <input
              type="number"
              value={carForm.currentMileage}
              onChange={(e) => setCarForm({ ...carForm, currentMileage: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Last Service Date</label>
            <input
              type="date"
              value={carForm.lastServiceDate}
              onChange={(e) =>
                setCarForm({ ...carForm, lastServiceDate: e.target.value })
              }
              className="input"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setAddCarModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                addCarMutation.mutate({
                  ...carForm,
                  currentMileage: carForm.currentMileage
                    ? parseInt(carForm.currentMileage)
                    : undefined,
                })
              }
              disabled={!carForm.licensePlate}
            >
              Add Car
            </Button>
          </div>
        </div>
      </Modal>

      {editCarModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditCarModal(null)}
          title={`Update Mileage - ${editCarModal.licensePlate}`}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Current Mileage</label>
              <input
                type="number"
                defaultValue={editCarModal.currentMileage}
                id="new-mileage"
                className="input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditCarModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const input = document.getElementById('new-mileage') as HTMLInputElement;
                  updateMileageMutation.mutate({
                    carId: editCarModal.id,
                    mileage: parseInt(input.value),
                  });
                }}
              >
                Update
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
