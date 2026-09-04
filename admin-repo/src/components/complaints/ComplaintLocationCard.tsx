import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { ComplaintLocation } from '@/types/Complaint';
import {
  MapPin,
  Compass,
  Copy,
  Check,
  Building,
} from 'lucide-react';
import { cn } from '@/utils';
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface ComplaintLocationCardProps {
  location: ComplaintLocation;
  className?: string;
}

/**
 * Ensures Leaflet centers and invalidates container size upon rendering
 */
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
};

export const ComplaintLocationCard: React.FC<ComplaintLocationCardProps> = ({
  location,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [copied, setCopied] = useState<boolean>(false);

  const hasCoords = Boolean(
    location.coordinates &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    typeof location.coordinates[0] === 'number' &&
    typeof location.coordinates[1] === 'number' &&
    !isNaN(location.coordinates[0]) &&
    !isNaN(location.coordinates[1]) &&
    (location.coordinates[0] !== 0 || location.coordinates[1] !== 0)
  );

  const lat = hasCoords ? location.coordinates![0] : null;
  const lng = hasCoords ? location.coordinates![1] : null;

  const incidentMarkerIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-incident-pin',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:#e11d48;color:#ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid #ffffff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }, []);

  const handleCopyCoords = () => {
    if (!hasCoords || lat === null || lng === null) return;
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card variant="default" className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>{isBn ? 'ভৌগোলিক অবস্থান ও এলাকা' : 'Location & Jurisdictional Area'}</span>
        </CardTitle>

        <Badge variant="subtle" size="sm">
          <Building className="w-3 h-3 mr-1 text-slate-500 dark:text-slate-400" />
          <span>{location.ward}</span>
        </Badge>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Address Lines */}
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isBn ? 'দাখিলকৃত ঠিকানা' : 'Submitted Address'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {location.addressBn || location.addressEn}
            </p>
          </div>

          {location.addressEn && location.addressBn !== location.addressEn && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {isBn ? 'ইংরেজি ঠিকানা' : 'English Civic Address'}
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {location.addressEn}
              </p>
            </div>
          )}
        </div>

        {/* Administrative Area/Upazila and District breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {isBn ? 'এলাকা / উপজেলা বা থানা' : 'Area / Upazila'}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {location.ward}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {isBn ? 'জেলা' : 'District'}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">
              {location.zone}
            </span>
          </div>
        </div>

        {/* Incident Location Map Preview */}
        {hasCoords && lat !== null && lng !== null && (
          <div className="w-full h-48 sm:h-56 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 relative z-0 shadow-inner">
            <LeafletMapContainer
              center={[lat, lng]}
              zoom={14}
              zoomControl={false}
              scrollWheelZoom={false}
              className="w-full h-full z-0 outline-none"
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <MapRecenter center={[lat, lng]} />
              <Marker position={[lat, lng]} icon={incidentMarkerIcon}>
                <Popup className="custom-map-popup">
                  <div className="p-0.5 text-xs text-slate-800 dark:text-slate-100">
                    <p className="font-semibold">
                      {location.addressBn || location.addressEn || (isBn ? 'ঘটনাস্থল' : 'Incident Location')}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </LeafletMapContainer>
          </div>
        )}

        {/* Coordinates Preview (Coordinate Card with Copy) */}
        {hasCoords && (
          <div className="p-3 rounded-lg bg-slate-900 text-slate-100 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  {isBn ? 'জিপিএস স্থানাঙ্ক (GPS)' : 'GPS Coordinates'}
                </span>
                <span className="font-mono text-xs text-slate-200 font-semibold truncate block">
                  {lat?.toFixed(5)}, {lng?.toFixed(5)}
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCoords}
              className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400 mr-1" />
                  <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1 text-slate-400" />
                  <span>{isBn ? 'কপি' : 'Copy'}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplaintLocationCard;
