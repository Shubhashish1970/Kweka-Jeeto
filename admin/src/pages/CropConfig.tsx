/**
 * CropConfig — list all states with crop count + "Manage" button.
 * UI_STANDARDS: teal left bar card, GlobalMessageBar.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import GlobalMessageBar from '../components/shared/GlobalMessageBar';
import Button from '../components/shared/Button';
import { PAGE_INFO_BANNERS } from '../constants/pageInfoBanners';

interface StateCrop {
  _id: string;
  state: string;
  stateLabel: string;
  crops: { id: string; title: string; description: string }[];
}

export default function CropConfig() {
  const navigate = useNavigate();
  const [stateCrops, setStateCrops] = useState<StateCrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<StateCrop[]>('/state-crops')
      .then(setStateCrops)
      .catch(() => setError('Failed to load state crop data.'))
      .finally(() => setLoading(false));
  }, []);

  const banner = PAGE_INFO_BANNERS.cropConfig;

  return (
    <div className="mx-[15px] pb-8">
      <GlobalMessageBar title={banner.title} description={banner.description} className="mb-6" />

      <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-primary shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">States & Crops</h2>
          <span className="text-sm text-slate-500">{stateCrops.length} states</span>
        </div>

        {loading && (
          <div className="px-6 py-10 text-sm text-slate-500 text-center">Loading…</div>
        )}

        {error && (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && stateCrops.length === 0 && (
          <div className="px-6 py-10 text-sm text-slate-500 text-center">
            No state crop data found. Deploy the backend to seed initial data.
          </div>
        )}

        {!loading && !error && stateCrops.length > 0 && (
          <div className="divide-y divide-slate-100">
            {stateCrops.map((sc) => (
              <div
                key={sc.state}
                className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold text-slate-900">{sc.stateLabel}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {sc.crops.length} crop{sc.crops.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/crop-config/${sc.state}`)}
                >
                  Manage
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
