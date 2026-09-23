import React, { useState, useEffect } from 'react';
import servicesApi from '../api/services';
import { Service } from '../types';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/axios';
import {
  Wrench,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  Droplet,
  AirVent,
  Tv,
  CheckCircle2,
  Loader2,
  Calendar,
} from 'lucide-react';

export const ServicesList: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Direct create request modal with preselected service
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Add new service modal
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [submittingService, setSubmittingService] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await servicesApi.getServices();
      setServices(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceDesc.trim()) {
      toastError('Please fill in service name and description.');
      return;
    }

    setSubmittingService(true);
    try {
      await servicesApi.createService({
        name: newServiceName.trim(),
        description: newServiceDesc.trim(),
        base_price: newServicePrice ? parseFloat(newServicePrice) : undefined,
      });
      success(`Service "${newServiceName}" added to catalog`);
      setIsAddServiceOpen(false);
      setNewServiceName('');
      setNewServiceDesc('');
      setNewServicePrice('');
      fetchServices();
    } catch (err) {
      toastError(getErrorMessage(err), 'Failed to create service');
    } finally {
      setSubmittingService(false);
    }
  };

  const getServiceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('ac') || lower.includes('air')) return AirVent;
    if (lower.includes('clean')) return Sparkles;
    if (lower.includes('elect')) return Zap;
    if (lower.includes('plumb') || lower.includes('water')) return Droplet;
    if (lower.includes('appliance') || lower.includes('tv')) return Tv;
    return Wrench;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Service Catalog</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Active service offerings, operational categories, and pricing tiers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchServices}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddServiceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6 space-y-3 animate-pulse">
              <div className="w-10 h-10 bg-neutral-200 rounded-xl" />
              <div className="h-5 bg-neutral-200 rounded-md w-1/2" />
              <div className="h-12 bg-neutral-100 rounded-md w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center">
          <p className="text-sm font-semibold text-rose-600 mb-2">Error loading services</p>
          <p className="text-xs text-neutral-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchServices}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center">
          <Wrench className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-900 mb-1">No services registered</h3>
          <p className="text-xs text-neutral-500 mb-4">Add your first service to publish it to customers.</p>
          <button
            type="button"
            onClick={() => setIsAddServiceOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
          >
            Add Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => {
            const Icon = getServiceIcon(svc.name);
            return (
              <div
                key={svc.id}
                className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-neutral-900 mb-1.5">{svc.name}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                    {svc.description || 'Standard on-demand service fulfillment by verified technicians.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div className="text-xs font-medium text-neutral-700">
                    {svc.base_price !== undefined ? (
                      <span>
                        Starting at <strong className="text-neutral-900 font-bold">${svc.base_price}</strong>
                      </span>
                    ) : (
                      <span className="text-neutral-400">Fixed rate quotation</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Request</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Service Modal */}
      <Modal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        title="Add New Service"
        description="Register a new service category in the QuickServe catalog."
        size="md"
      >
        <form onSubmit={handleCreateService} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Service Name *
            </label>
            <input
              type="text"
              required
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="e.g. Carpentry & Furniture Repair"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <textarea
              rows={3}
              required
              value={newServiceDesc}
              onChange={(e) => setNewServiceDesc(e.target.value)}
              placeholder="Provide a clear description of what is included in this service..."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Estimated Base Price (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              placeholder="e.g. 49.99"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsAddServiceOpen(false)}
              disabled={submittingService}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingService}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {submittingService ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add Service</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          success('Service request created successfully');
        }}
      />
    </div>
  );
};

export default ServicesList;
