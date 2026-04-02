import { Download, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppFrame from '../components/AppFrame';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import LlmRichText from '../components/LlmRichText';
import { useAuth } from '../context/AuthContext';
import { downloadReportPdf } from '../services/pdfService';

function Profile() {
  const { previewProfile, reports, updateProfile, uploads } = useAuth();
  const [tab, setTab] = useState('uploads');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: previewProfile?.name ?? '',
    email: previewProfile?.email ?? '',
    farmName: previewProfile?.farmName ?? '',
    location: previewProfile?.location ?? '',
  });

  useEffect(() => {
    setForm({
      name: previewProfile?.name ?? '',
      email: previewProfile?.email ?? '',
      farmName: previewProfile?.farmName ?? '',
      location: previewProfile?.location ?? '',
    });
  }, [previewProfile]);

  const handleSave = async () => {
    await updateProfile(form);
    setEdit(false);
  };

  const getInitials = (name) =>
    String(name ?? 'AV')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AV';

  const findReportForUpload = (upload) =>
    reports.find((report) => report.sessionId && report.sessionId === upload.id) ??
    reports.find(
      (report) =>
        report.crop === upload.crop &&
        report.disease === upload.disease &&
        report.locationName === upload.locationName,
    ) ??
    null;

  const getShortLocation = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return 'Location not available';

    const parts = text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }

    return parts[0] || 'Location not available';
  };

  return (
    <AppFrame title="Profile" subtitle="Manage your account details, uploads, and report history.">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            {previewProfile?.avatar ? (
              <img
                src={previewProfile.avatar}
                alt={previewProfile?.name ?? 'Profile'}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-moss text-2xl font-semibold text-white">
                {getInitials(previewProfile?.name)}
              </div>
            )}
            <div>
              <h2 className="text-4xl">{previewProfile?.name ?? 'Aarav Patel'}</h2>
              <p className="mt-2 text-text-mid">{previewProfile?.email ?? 'aarav@agrivision.ai'}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => (edit ? handleSave() : setEdit(true))}>
            <Pencil className="h-4 w-4" />
            {edit ? 'Save' : 'Edit'}
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['Name', previewProfile?.name ?? 'Aarav Patel'],
            ['Email', previewProfile?.email ?? 'aarav@agrivision.ai'],
            ['Farm Name', previewProfile?.farmName ?? 'Green Horizon Farms'],
            ['Location', previewProfile?.location ?? 'Nashik, Maharashtra'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-beige p-4">
              <p className="text-sm text-text-muted">{label}</p>
              {edit ? (
                <input
                  value={form[label === 'Name' ? 'name' : label === 'Email' ? 'email' : label === 'Farm Name' ? 'farmName' : 'location']}
                  onChange={(event) => {
                    const key = label === 'Name' ? 'name' : label === 'Email' ? 'email' : label === 'Farm Name' ? 'farmName' : 'location';
                    setForm((current) => ({ ...current, [key]: event.target.value }));
                  }}
                  className="field mt-2"
                />
              ) : (
                <p className="mt-2 text-lg text-text-dark">{value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-8 flex gap-3">
        <Button variant={tab === 'uploads' ? 'primary' : 'secondary'} onClick={() => setTab('uploads')}>
          Upload History
        </Button>
        <Button variant={tab === 'reports' ? 'primary' : 'secondary'} onClick={() => setTab('reports')}>
          My Reports
        </Button>
      </div>

      {tab === 'uploads' ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {uploads.map((item) => {
            const linkedReport = findReportForUpload(item);

            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex h-32 items-center justify-center rounded-3xl bg-beige px-5 text-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Place</p>
                    <p className="mt-3 text-lg font-semibold text-text-dark">
                      {getShortLocation(item.locationName ?? linkedReport?.locationName)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium text-text-dark">{item.crop} scan</p>
                    <p className="mt-1 text-sm text-text-muted">{new Date(item.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <Badge>{item.severity}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-base font-semibold text-text-dark">{item.disease ?? 'Disease not available'}</p>
                  <div className="max-h-56 overflow-y-auto pr-1">
                    <LlmRichText
                      text={linkedReport?.summary ?? 'Upload details are available. Generate or open the report for full treatment guidance.'}
                      compact
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {linkedReport && (
                    <Button variant="secondary" onClick={() => downloadReportPdf(linkedReport)}>
                      <Download className="h-4 w-4" />
                      Download report
                    </Button>
                  )}
                  {item.imageName && <p className="text-sm text-text-muted">{item.imageName}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-text-muted">{report.id}</p>
                  <h3 className="mt-2 text-3xl">{report.crop} disease report</h3>
                  <p className="mt-2 text-sm text-text-mid">{report.disease ?? 'Unknown disease'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="info">Saved</Badge>
                  <Button variant="secondary" onClick={() => downloadReportPdf(report)}>
                    <Download className="h-4 w-4" />
                    Download report
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppFrame>
  );
}

export default Profile;

