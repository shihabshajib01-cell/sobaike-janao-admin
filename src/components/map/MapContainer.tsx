import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapComplaint } from '@/types/Map';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/themes/ThemeProvider';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  MapPin,
  ExternalLink,
  X,
  Layers,
  Sparkles,
  Calendar,
  Navigation,
} from 'lucide-react';
import { cn } from '@/utils';

export interface MapContainerProps {
  complaints: MapComplaint[];
  selectedComplaint: MapComplaint | null;
  onSelectComplaint: (complaint: MapComplaint | null) => void;
  loading?: boolean;
  className?: string;
}

// Prototype-only Dhaka visualization retained for future redesign. Do not use with production complaint coordinates.
const DHAKA_BOUNDS = {
  minLat: 23.685,
  maxLat: 23.895,
  minLng: 90.335,
  maxLng: 90.455,
};

// Major landmarks and ward center anchors for cartographic context (Prototype-only)
const DISTRICT_ANCHORS = [
  { nameEn: 'Uttara', nameBn: 'উত্তরা', lat: 23.872, lng: 90.395, zone: 'Zone 1' },
  { nameEn: 'Mirpur', nameBn: 'মিরপুর', lat: 23.805, lng: 90.365, zone: 'Zone 4' },
  { nameEn: 'Gulshan', nameBn: 'গুলশান', lat: 23.792, lng: 90.415, zone: 'Zone 3' },
  { nameEn: 'Banani', nameBn: 'বনানী', lat: 23.793, lng: 90.402, zone: 'Zone 3' },
  { nameEn: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', lat: 23.762, lng: 90.36, zone: 'Zone 5' },
  { nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি', lat: 23.746, lng: 90.375, zone: 'Zone 3' },
  { nameEn: 'Farmgate', nameBn: 'ফার্মগেট', lat: 23.757, lng: 90.388, zone: 'Zone 5' },
  { nameEn: 'Mohakhali', nameBn: 'মহাখালী', lat: 23.778, lng: 90.405, zone: 'Zone 3' },
  { nameEn: 'Agargaon', nameBn: 'আগারগাঁও', lat: 23.776, lng: 90.378, zone: 'Zone 4' },
  { nameEn: 'Ramna / Kakrail', nameBn: 'রমনা / কাকরাইল', lat: 23.738, lng: 90.405, zone: 'Zone 1' },
  { nameEn: 'Jatrabari', nameBn: 'যাত্রাবাড়ী', lat: 23.71, lng: 90.432, zone: 'Zone 10' },
];

export const MapContainer: React.FC<MapContainerProps> = ({
  complaints,
  selectedComplaint,
  onSelectComplaint,
  loading = false,
  className,
}) => {
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isBn = language === 'bn';
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan and Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // SVG coordinate projection (ViewBox 0 0 1000 1000)
  const projectCoordinates = useCallback((lat: number, lng: number) => {
    const latSpan = DHAKA_BOUNDS.maxLat - DHAKA_BOUNDS.minLat;
    const lngSpan = DHAKA_BOUNDS.maxLng - DHAKA_BOUNDS.minLng;

    // Normalizing (0 to 1) and scaling to SVG viewBox (1000x1000)
    // Longitude maps to X (West to East)
    const x = ((lng - DHAKA_BOUNDS.minLng) / lngSpan) * 860 + 70;
    // Latitude maps to Y (North to South, inverted because SVG Y is down)
    const y = ((DHAKA_BOUNDS.maxLat - lat) / latSpan) * 860 + 70;

    return { x, y };
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.3, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.3, 0.7));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Center on selected complaint
  useEffect(() => {
    if (selectedComplaint) {
      const { x, y } = projectCoordinates(
        selectedComplaint.latitude,
        selectedComplaint.longitude
      );
      // Pan so that (x, y) is roughly in center of the view (500, 500)
      const targetPanX = (500 - x) * zoom;
      const targetPanY = (500 - y) * zoom;
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [selectedComplaint, projectCoordinates, zoom]);

  // Mouse Drag / Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only pan on left click and not on a marker element
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.6), 4.5));
  };

  // Status Color Helper
  const getStatusColor = (status: MapComplaint['status']) => {
    switch (status) {
      case 'submitted':
        return '#f59e0b'; // amber-500
      case 'published':
        return '#0ea5e9'; // sky-500
      case 'unpublished':
        return '#64748b'; // slate-500
      case 'rejected':
        return '#ef4444'; // red-500
      case 'edited':
        return '#8b5cf6'; // violet-500
      default:
        return '#64748b'; // slate-500
    }
  };

  const getStatusBadge = (status: MapComplaint['status']) => {
    const map: Record<MapComplaint['status'], { badgeStatus: BadgeStatus; labelEn: string; labelBn: string }> = {
      submitted: { badgeStatus: 'pending', labelEn: 'Submitted', labelBn: 'দাখিলকৃত' },
      published: { badgeStatus: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত' },
      unpublished: { badgeStatus: 'default', labelEn: 'Unpublished', labelBn: 'অপ্রকাশিত' },
      rejected: { badgeStatus: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
      edited: { badgeStatus: 'info', labelEn: 'Edited', labelBn: 'সম্পাদিত' },
    };

    const cfg = map[status] || { badgeStatus: 'default', labelEn: status, labelBn: status };
    return (
      <Badge status={cfg.badgeStatus} size="sm">
        {isBn ? cfg.labelBn : cfg.labelEn}
      </Badge>
    );
  };

  return (
    <div
      className={cn(
        'relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 select-none shadow-xs flex flex-col',
        'h-[540px] sm:h-[580px] lg:h-[660px]',
        className
      )}
    >
      {/* Map Interactive Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        className={cn(
          'w-full h-full cursor-grab active:cursor-grabbing transition-colors duration-200',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.05)'}
              strokeWidth="0.8"
            />
          </pattern>

          {/* Pulse animation filter for selected marker */}
          <radialGradient id="marker-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.6)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
          </radialGradient>

          {/* Water Body Pattern */}
          <linearGradient id="water-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#0f2942' : '#bae6fd'} />
            <stop offset="100%" stopColor={isDark ? '#0a1d30' : '#7dd3fc'} />
          </linearGradient>
        </defs>

        {/* Dynamic Zoom & Pan Wrapper */}
        <g
          transform={`translate(${500 + pan.x}, ${500 + pan.y}) scale(${zoom}) translate(-500, -500)`}
          className="transition-transform duration-75 ease-out"
        >
          {/* Base Background Area */}
          <rect x="0" y="0" width="1000" height="1000" fill={isDark ? '#0f172a' : '#f8fafc'} />
          <rect x="0" y="0" width="1000" height="1000" fill="url(#map-grid)" />

          {/* --- Cartographic Geographic Base Features (Dhaka Geometry) --- */}

          {/* 1. Rivers & Water Bodies (Buriganga, Turag, Hatirjheel, Gulshan Lake, Dhanmondi Lake) */}
          <g className="water-features opacity-85">
            {/* Turag River / West Water Corridor */}
            <path
              d="M 120 0 C 140 180, 110 320, 170 480 C 210 580, 190 700, 240 850 C 260 920, 290 1000, 310 1000 L 260 1000 C 240 920, 160 830, 140 680 C 90 490, 110 310, 80 0 Z"
              fill="url(#water-gradient)"
              stroke={isDark ? '#1e3a5f' : '#38bdf8'}
              strokeWidth="1.5"
            />

            {/* Buriganga River (South) */}
            <path
              d="M 260 1000 C 360 920, 520 900, 680 940 C 800 970, 920 950, 1000 980 L 1000 1000 L 260 1000 Z"
              fill="url(#water-gradient)"
              stroke={isDark ? '#1e3a5f' : '#38bdf8'}
              strokeWidth="2"
            />

            {/* Hatirjheel Lake (Central Waterway) */}
            <path
              d="M 520 540 C 580 525, 640 535, 710 515 C 740 508, 770 525, 760 545 C 720 560, 640 565, 540 565 C 505 565, 490 548, 520 540 Z"
              fill={isDark ? '#133352' : '#bae6fd'}
              stroke={isDark ? '#2563eb' : '#0284c7'}
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Gulshan & Banani Lakes */}
            <path
              d="M 690 320 C 705 380, 695 440, 715 500 C 725 490, 735 440, 725 380 C 715 320, 700 310, 690 320 Z"
              fill={isDark ? '#133352' : '#bae6fd'}
              stroke={isDark ? '#2563eb' : '#0284c7'}
              strokeWidth="1"
            />

            {/* Dhanmondi Lake */}
            <path
              d="M 370 660 C 385 690, 420 710, 420 740 C 410 750, 380 730, 360 690 C 355 675, 360 655, 370 660 Z"
              fill={isDark ? '#133352' : '#bae6fd'}
              stroke={isDark ? '#2563eb' : '#0284c7'}
              strokeWidth="1"
            />
          </g>

          {/* 2. Arterial Road Network (Major Avenues & Expressways) */}
          <g className="road-network">
            {/* North-South Primary Spine: Airport Road -> Pragati Sarani */}
            <path
              d="M 580 0 L 590 220 L 630 380 L 680 510 L 740 700 L 820 950"
              fill="none"
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth="4.5"
            />
            <path
              d="M 580 0 L 590 220 L 630 380 L 680 510 L 740 700 L 820 950"
              fill="none"
              stroke={isDark ? '#475569' : '#e2e8f0'}
              strokeWidth="2.5"
            />

            {/* Mirpur Road & Begum Rokeya Sarani */}
            <path
              d="M 350 180 L 370 380 L 440 550 L 410 680 L 430 830 L 480 920"
              fill="none"
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth="4"
            />
            <path
              d="M 350 180 L 370 380 L 440 550 L 410 680 L 430 830 L 480 920"
              fill="none"
              stroke={isDark ? '#475569' : '#e2e8f0'}
              strokeWidth="2"
            />

            {/* East-West Connectors (Manik Mia / Bijoy Sarani / Mohakhali Flyover) */}
            <path
              d="M 230 450 L 370 460 L 520 465 L 680 440 L 850 430"
              fill="none"
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth="3.5"
            />
            <path
              d="M 230 450 L 370 460 L 520 465 L 680 440 L 850 430"
              fill="none"
              stroke={isDark ? '#475569' : '#e2e8f0'}
              strokeWidth="1.5"
            />

            {/* South Link to Jatrabari */}
            <path
              d="M 550 720 L 650 780 L 770 850 L 830 920"
              fill="none"
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth="3.5"
            />
          </g>

          {/* 3. District / Ward Anchors & Subtle Labels */}
          {showLabels && (
            <g className="district-labels pointer-events-none">
              {DISTRICT_ANCHORS.map((anchor) => {
                const { x, y } = projectCoordinates(anchor.lat, anchor.lng);
                return (
                  <g key={anchor.nameEn} transform={`translate(${x}, ${y})`}>
                    <circle r="3" fill={isDark ? '#64748b' : '#94a3b8'} opacity="0.7" />
                    <text
                      x="0"
                      y="-8"
                      textAnchor="middle"
                      fill={isDark ? '#94a3b8' : '#334155'}
                      fontSize="10"
                      fontWeight="600"
                      letterSpacing="0.5"
                      className="font-sans select-none"
                    >
                      {isBn ? anchor.nameBn : anchor.nameEn}
                    </text>
                    <text
                      x="0"
                      y="14"
                      textAnchor="middle"
                      fill={isDark ? '#475569' : '#64748b'}
                      fontSize="8"
                      className="font-mono select-none"
                    >
                      {anchor.zone}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 4. Interactive Complaint Markers */}
          <g className="complaint-markers">
            {complaints.map((item) => {
              const { x, y } = projectCoordinates(item.latitude, item.longitude);
              const isSelected = selectedComplaint?.id === item.id;
              const color = getStatusColor(item.status);

              return (
                <g
                  key={item.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectComplaint(isSelected ? null : item);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Selected Ripple Glow */}
                  {isSelected && (
                    <>
                      <circle
                        r="28"
                        fill={color}
                        opacity="0.25"
                        className="animate-ping"
                      />
                      <circle
                        r="20"
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="4,4"
                      />
                    </>
                  )}

                  {/* Marker Outer Base Ring */}
                  <circle
                    r={isSelected ? '14' : '10'}
                    fill="#0f172a"
                    stroke={color}
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-all duration-200 group-hover:scale-125"
                  />

                  {/* Marker Core Indicator */}
                  <circle
                    r={isSelected ? '7' : '4.5'}
                    fill={color}
                    className="transition-all duration-200"
                  />

                  {/* Mini Tooltip on Hover */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <rect
                      x="-50"
                      y="-36"
                      width="100"
                      height="20"
                      rx="4"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-22"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="bold"
                      className="font-mono"
                    >
                      {item.id}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* --- Overlay HUD Top Bar: Controls & Status --- */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Left: Viewport Status Pill */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/85 backdrop-blur-xs border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs text-slate-300 shadow-sm">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono font-medium">
            {complaints.length} {isBn ? 'পয়েন্ট চিহ্নিত' : 'Locations Mapped'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400 font-mono">
            Zoom: {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Right: Map Action Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/85 backdrop-blur-xs border border-slate-700/70 rounded-lg p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setShowLabels((prev) => !prev)}
            className={cn(
              'p-1.5 rounded text-xs transition-colors',
              showLabels
                ? 'bg-slate-800 text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            )}
            title={isBn ? 'এলাকার নাম দেখান/লুকান' : 'Toggle Ward Labels'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isBn ? 'জুম ইন' : 'Zoom In (+)'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isBn ? 'জুম আউট' : 'Zoom Out (-)'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isBn ? 'ডিফল্ট ভিউ রিসেট' : 'Reset View'}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* --- Overlay Selected Complaint Preview Card --- */}
      {selectedComplaint && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-xl z-20 text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header Row: ID, Close, Status */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-sky-400">
                {selectedComplaint.id}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(selectedComplaint.status)}
              <button
                type="button"
                onClick={() => onSelectComplaint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-slate-100 mb-1 leading-snug">
            {isBn ? selectedComplaint.titleBn : selectedComplaint.titleEn}
          </h4>

          {/* Description snippet */}
          {selectedComplaint.descriptionEn && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2.5 font-light">
              {isBn ? selectedComplaint.descriptionBn : selectedComplaint.descriptionEn}
            </p>
          )}

          {/* Location & Taxonomy metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-800 text-slate-300">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                {isBn ? 'অবস্থান / ওয়ার্ড:' : 'Location / Ward:'}
              </span>
              <span className="font-medium text-slate-200 truncate block">
                {selectedComplaint.location.ward}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                {isBn ? 'শ্রেণি / উপ-শ্রেণি:' : 'Category / Sub:'}
              </span>
              <span className="font-medium text-slate-200 truncate block">
                {isBn ? selectedComplaint.categoryBn : selectedComplaint.categoryEn}
              </span>
            </div>
          </div>

          {/* Address full line */}
          <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1.5 border-t border-slate-800/60 mb-3">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <span className="truncate">
              {isBn ? selectedComplaint.location.addressBn : selectedComplaint.location.addressEn}
              {' • '}
              {selectedComplaint.location.zone}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>
                {new Date(selectedComplaint.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/complaints/${selectedComplaint.id}`)}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              className="h-7 text-xs px-3"
            >
              {isBn ? 'ওয়ার্কস্পেস খুলুন' : 'Open Complaint'}
            </Button>
          </div>
        </div>
      )}

      {/* Map Hint Footer */}
      <div className="absolute bottom-2 right-2 hidden sm:flex items-center gap-2 text-[10px] text-slate-500 pointer-events-none">
        <span>{isBn ? 'ড্র্যাগ করে সরান • স্ক্রল করে জুম করুন' : 'Drag to pan • Scroll to zoom'}</span>
      </div>
    </div>
  );
};

export default MapContainer;
