import { Download, FileImage, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppFrame from '../components/AppFrame';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import LlmRichText from '../components/LlmRichText';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { downloadReportPdf } from '../services/pdfService';
import { formatDate } from '../utils/formatters';

function Reports() {
  const { reports, farms } = useAuth();
  const [filters, setFilters] = useState({ query: '', crop: 'All', severity: 'All' });
  const [selected, setSelected] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return undefined;
    const timer = window.setTimeout(() => setShowToast(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => (filters.crop === 'All' ? true : report.crop === filters.crop))
      .filter((report) => (filters.severity === 'All' ? true : report.severity === filters.severity))
      .filter((report) => {
        const haystack = `${report.id} ${report.crop} ${report.disease} ${report.locationName} ${report.reportDate}`.toLowerCase();
        return haystack.includes(filters.query.toLowerCase());
      });
  }, [filters, reports]);

  const getFarmForReport = (report) => {
    return farms.find((farm) =>
      String(farm.location ?? '').toLowerCase().includes(String(report.locationName ?? '').toLowerCase()) ||
      String(report.locationName ?? '').toLowerCase().includes(String(farm.location ?? '').toLowerCase()),
    );
  };

  const matchedFarm = selected ? getFarmForReport(selected) : null;

  const handleDownload = (report) => {
    downloadReportPdf(report);
    setShowToast(true);
  };

  return (
    <AppFrame title="Reports Center" subtitle="Search, inspect, export, and share crop disease reports across your farms.">
      <Card>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.6fr_0.6fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              className="field pl-11"
              placeholder="Search by report ID, crop, disease, or location"
            />
          </div>
          <select value={filters.crop} onChange={(event) => setFilters((current) => ({ ...current, crop: event.target.value }))} className="field">
            {['All', 'Tomato', 'Apple', 'Grape'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))} className="field">
            {['All', 'High', 'Moderate', 'Low'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        {filteredReports.map((report) => {
          const farmForReport = getFarmForReport(report);
          return (
            <Card key={report.id}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm uppercase tracking-[0.2em] text-text-muted">{report.id}</p>
                    <Badge variant="info">{report.status ?? 'Completed'}</Badge>
                  </div>
                  <div>
                    <h3 className="text-3xl">{report.crop} Disease Report</h3>
                    <p className="mt-2 text-sm text-text-mid">{formatDate(report.reportDate)} - {report.locationName ?? 'Unknown location'}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-text-mid">
                    <span className="rounded-full bg-beige px-3 py-1.5">{report.disease ?? 'Unknown disease'}</span>
                    <span className="rounded-full bg-beige px-3 py-1.5">{report.confidence ?? 0}% confidence</span>
                    {report.imageName && <span className="rounded-full bg-beige px-3 py-1.5">{report.imageName}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={report.severity === 'High' ? 'danger' : report.severity === 'Moderate' ? 'warning' : 'success'}>
                    {report.severity}
                  </Badge>
                  {farmForReport?.email && (
                    <a href={`mailto:${farmForReport.email}?subject=${encodeURIComponent(`${report.crop} disease report`)}&body=${encodeURIComponent(report.summary ?? '')}`}>
                      <Button variant="secondary">Send email</Button>
                    </a>
                  )}
                  {farmForReport?.phone && (
                    <a href={`https://wa.me/${farmForReport.phone.replace(/\D/g, '')}?text=${encodeURIComponent(report.summary ?? '')}`} target="_blank" rel="noreferrer">
                      <Button variant="secondary">WhatsApp</Button>
                    </a>
                  )}
                  <Button variant="secondary" onClick={() => setSelected(report)}>View</Button>
                  <Button onClick={() => handleDownload(report)}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {!filteredReports.length && (
          <Card>
            <p className="text-sm text-text-mid">No reports match the current filters.</p>
          </Card>
        )}
      </div>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.id} - ${selected.crop} Report` : 'Report details'}>
        {selected && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-beige p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Disease</p>
                <p className="mt-2 text-lg font-semibold text-text-dark">{selected.disease ?? 'Unknown'}</p>
              </div>
              <div className="rounded-2xl bg-moss-pale p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Confidence</p>
                <p className="mt-2 text-lg font-semibold text-moss">{selected.confidence ?? 0}%</p>
              </div>
              <div className="rounded-2xl bg-earth-50 p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Severity</p>
                <p className="mt-2 text-lg font-semibold text-text-dark">{selected.severity ?? 'Unknown'}</p>
              </div>
              <div className="rounded-2xl border border-[#e8e1d7] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Location</p>
                <p className="mt-2 truncate text-sm font-semibold text-text-dark">{selected.locationName ?? 'Unknown'}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[28px] border border-[#ddd1bf] bg-white p-4 shadow-[0_18px_40px_-32px_rgba(49,82,55,0.45)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <FileImage className="h-4 w-4" />
                  Uploaded image
                </div>
                <div className="mt-4 overflow-hidden rounded-[24px] border border-dashed border-[#d8c9b5] bg-[#f9f5ee] p-3">
                  {selected.imagePreviewUrl ? (
                    <img
                      src={selected.imagePreviewUrl}
                      alt={selected.imageName ?? `${selected.crop} upload`}
                      className="h-64 w-full rounded-[18px] object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-[18px] bg-beige text-sm text-text-muted">
                      Uploaded image preview not available
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-2xl bg-beige px-4 py-3 text-sm text-text-dark">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Image name</p>
                  <p className="mt-1 truncate font-medium">{selected.imageName ?? 'Unknown image'}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-3 rounded-[28px] bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-muted">Report ID</p>
                    <p className="font-mono text-sm font-medium">{selected.id}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <p className="text-sm text-text-muted">Date</p>
                    <p className="text-sm font-medium">{formatDate(selected.reportDate)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <p className="text-sm text-text-muted">Crop</p>
                    <p className="text-sm font-medium">{selected.crop}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <p className="text-sm text-text-muted">Field</p>
                    <p className="text-sm font-medium">{selected.locationName ?? 'Unknown location'}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-moss-pale p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-moss">
                      <ShieldCheck className="h-4 w-4" />
                      Severity
                    </div>
                    <p className="mt-3 text-lg font-semibold text-text-dark">{selected.severity ?? 'Unknown'}</p>
                  </div>
                  <div className="rounded-2xl bg-beige p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
                      <Sparkles className="h-4 w-4" />
                      AI confidence
                    </div>
                    <p className="mt-3 text-lg font-semibold text-text-dark">{selected.confidence ?? 0}%</p>
                  </div>
                  <div className="rounded-2xl bg-earth-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-text-dark">
                      <MapPin className="h-4 w-4" />
                      Source
                    </div>
                    <p className="mt-3 text-sm font-semibold text-text-dark">{selected.imageName ?? 'Mobile upload'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Analysis & Recommendation</p>
              <div className="rounded-2xl bg-moss-pale p-4">
                <LlmRichText text={selected.summary ?? selected.recommendation ?? 'No analysis available.'} compact />
              </div>
            </div>

            {matchedFarm && (matchedFarm.email || matchedFarm.phone) && (
              <div className="rounded-2xl bg-[#f7f2e8] p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">Share with farmer</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {matchedFarm.email && (
                    <a href={`mailto:${matchedFarm.email}?subject=${encodeURIComponent(`${selected.crop} disease report`)}&body=${encodeURIComponent(selected.summary ?? '')}`}>
                      <Button variant="secondary">Email report</Button>
                    </a>
                  )}
                  {matchedFarm.phone && (
                    <a href={`https://wa.me/${matchedFarm.phone.replace(/\D/g, '')}?text=${encodeURIComponent(selected.summary ?? '')}`} target="_blank" rel="noreferrer">
                      <Button variant="secondary">WhatsApp report</Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => handleDownload(selected)} className="flex-1">
                <Download className="h-4 w-4" />
                Download PDF Report
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Toast message="PDF download started." show={showToast} />
    </AppFrame>
  );
}

export default Reports;
