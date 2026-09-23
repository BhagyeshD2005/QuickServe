import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import servicesApi from '../../api/services';
import requestsApi from '../../api/requests';
import { RequestPriority, Service } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';
import { Plus, Loader2 } from 'lucide-react';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [serviceId, setServiceId] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [address, setAddress] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('MEDIUM');

  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Set default preferred date to tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setPreferredDate(`${yyyy}-${mm}-${dd} 10:00:00`);

      const loadServices = async () => {
        setLoadingServices(true);
        try {
          const list = await servicesApi.getServices();
          setServices(list);
          if (list.length > 0) {
            setServiceId(list[0].id);
          }
        } catch (err) {
          toastError(getErrorMessage(err), 'Failed to load services');
        } finally {
          setLoadingServices(false);
        }
      };
      loadServices();
    }
  }, [isOpen, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !description.trim() || !preferredDate.trim() || !address.trim()) {
      toastError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestsApi.createRequest({
        service_id: serviceId,
        description: description.trim(),
        preferred_at: preferredDate.trim(),
        address: address.trim(),
        priority,
      });

      success(`Request ${res.request_number} created successfully`, 'Success');
      setDescription('');
      setAddress('');
      onSuccess();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err), 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="create-request-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Create Service Request"
      description="Create a new customer service request in the QuickServe system."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="service-select"
              className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
            >
              Service Type *
            </label>
            {loadingServices ? (
              <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
            ) : (
              <select
                id="service-select"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="priority-select"
              className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
            >
              Priority *
            </label>
            <select
              id="priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequestPriority)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="preferred-schedule"
            className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
          >
            Preferred Date & Time *
          </label>
          <input
            type="text"
            id="preferred-schedule"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            placeholder="YYYY-MM-DD HH:MM:SS"
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        <div>
          <label
            htmlFor="service-address"
            className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
          >
            Service Address *
          </label>
          <input
            type="text"
            id="service-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 123 Main Street, Suite 400, Mumbai"
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        <div>
          <label
            htmlFor="service-description"
            className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
          >
            Description / Requirements *
          </label>
          <textarea
            id="service-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue or requested maintenance..."
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingServices}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Create Request</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateRequestModal;
