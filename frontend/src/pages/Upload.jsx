import { motion } from 'framer-motion';
import { Calendar, Download, MapPin, NotebookText } from 'lucide-react';
import { useState } from 'react';
import AppFrame from '../components/AppFrame';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import LlmRichText from '../components/LlmRichText';
import Modal from '../components/Modal';
import UploadZone from '../components/UploadZone';
import { useAuth } from '../context/AuthContext';
import { generateReport, uploadLeafImage } from '../services/api';
import { downloadReportPdf } from '../services/pdfService';

function getFriendlyUploadError(message) {
  if (!message) return 'Unable to analyze this image. Please try another leaf image.';

  let parsedMessage = message;

  try {
    const parsed = JSON.parse(message);
    parsedMessage = parsed?.detail || parsed?.message || message;
  } catch {
    parsedMessage = message;
  }

  const normalizedMessage = String(parsedMessage).toLowerCase();

  if (normalizedMessage.includes('blur')) {
    return 'Image is blurry. Please upload another sharper leaf image.';
  }

  if (
    normalizedMessage.includes('not a leaf') ||
    normalizedMessage.includes('non-leaf') ||
    normalizedMessage.includes('not leaf') ||
    normalizedMessage.includes('leaf image') ||
    normalizedMessage.includes('plant image')
  ) {
    return 'This does not look like a leaf image. Please upload a clear leaf image.';
  }

  return String(parsedMessage);
}

function Upload() {
  const { addReport, addUploadResult, farms } = useAuth();
  const locationOptions = Array.from(
    new Set([
      ...farms.map((farm) => farm.location).filter(Boolean),
      'Mangaluru, Karnataka',
      'Shimla, Himachal Pradesh',
      'Nashik, Maharashtra',
      'Pune, Maharashtra',
      'Bengaluru, Karnataka',
    ]),
  );
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [form, setForm] = useState({ crop: 'Tomato', location: '', date: '', notes: '' });

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload an image first.');
      setPopupMessage('Please upload a clear leaf image before running analysis.');
      return;
    }

    setLoading(true);
    setError('');
    setPopupMessage('');

    try {
      const imagePreviewUrl = URL.createObjectURL(file);
      const imageName = file.name || 'uploaded-image';
      const formData = new FormData();
      formData.append('image', file);
      formData.append('location', form.location);

      const response = await uploadLeafImage(formData);

      const uploadRecord = {
        id: response.session_id,
        crop: response.crop,
        disease: response.disease,
        severity: response.severity,
        confidence: Number((response.confidence * 100).toFixed(2)),
        locationName: response.location || form.location || 'Unknown',
        coordinates: [response?.lat ?? null, response?.lon ?? null],
        uploadedAt: new Date().toISOString(),
        imageName,
        imagePreviewUrl,
      };
      addUploadResult(uploadRecord);

      const generatedReport = await generateReport({
        crop: response.crop,
        disease: response.disease,
        severity: response.severity,
        confidence: Number((response.confidence * 100).toFixed(2)),
        locationName: response.location || form.location || 'Unknown',
        recommendation: response.recommendation,
        summary: response.recommendation,
        sessionId: response.session_id,
      });
      const reportRecord = {
        ...generatedReport,
        imageName,
        imagePreviewUrl,
      };
      addReport(reportRecord);

      window.localStorage.setItem('agrivision_last_session_id', response.session_id);
      setResult({
        ...reportRecord,
        confidence: Number((response.confidence * 100).toFixed(2)),
        confidencePercent: Number((response.confidence * 100).toFixed(2)),
        healthScore: response.health_score,
        weather: response.weather,
        coordinates: [response?.lat ?? null, response?.lon ?? null],
        recommendation: response.recommendation,
        summary: response.recommendation,
      });
      setSubmitted(true);
    } catch (apiError) {
      const nextError = getFriendlyUploadError(apiError.message || 'Failed to analyze image.');
      setError(nextError);
      setPopupMessage(nextError);
      setSubmitted(false);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppFrame
      title="Upload & Analyze"
      subtitle="Add field imagery and metadata, then review AI predictions in a structured flow."
      chatPosition="bottom-left"
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <UploadZone file={file} onFileSelect={setFile} />

        <Card>
          <h2 className="text-4xl">Image details</h2>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-mid">Crop type</span>
              <select className="field">
                <option>Tomato</option>
                <option>Apple</option>
                <option>Grape</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-text-mid">
                <MapPin className="h-4 w-4" />
                Location
              </span>
              <div className="space-y-2">
                <input
                  list="location-options"
                  className="field"
                  placeholder="Choose or type a location"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
                <datalist id="location-options">
                  {locationOptions.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
              </div>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-text-mid">
                <Calendar className="h-4 w-4" />
                Capture date
              </span>
              <input
                type="date"
                className="field"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-text-mid">
                <NotebookText className="h-4 w-4" />
                Notes
              </span>
              <textarea
                rows="5"
                className="field resize-none"
                placeholder="Add crop observations or context..."
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <Button className="w-full" onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing...' : 'Submit for AI analysis'}
            </Button>
          </div>
        </Card>
      </div>

      {submitted && result && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <Card className="max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-text-muted">{result.crop}</p>
                <h3 className="mt-3 text-3xl">{result.disease}</h3>
              </div>
              <Badge variant={String(result.severity).toLowerCase() === 'moderate' ? 'warning' : 'success'}>{result.severity}</Badge>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.4fr] auto-rows-fr">
              <div className="flex flex-col rounded-2xl bg-beige p-4">
                <p className="text-sm text-text-muted">Confidence</p>
                <p className="mt-2 text-3xl text-moss">{result.confidencePercent}%</p>
              </div>
              <div className="flex flex-col rounded-2xl bg-beige p-4">
                <p className="text-sm text-text-muted">Recommended action</p>
                <LlmRichText
                  text={result.recommendation}
                  className="mt-2 flex-1"
                  compact
                />
              </div>
            </div>
          </Card>
          <Button className="mt-6" onClick={() => downloadReportPdf(result)}>
            <Download className="h-4 w-4" />
            Download PDF report
          </Button>
        </motion.div>
      )}

      <Modal isOpen={Boolean(popupMessage)} onClose={() => setPopupMessage('')} title="Upload issue">
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#fff5f5] p-4 text-sm leading-7 text-rose-700">
            {popupMessage}
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setPopupMessage('')}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </AppFrame>
  );
}

export default Upload;
