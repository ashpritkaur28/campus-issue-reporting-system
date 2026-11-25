import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  RotateCcw,
} from 'lucide-react';
import {
  CategoryPrediction,
  ComplaintRecord,
  IssueCategory,
} from '../types/complaint';

const SAMPLE_ISSUES = [
  {
    label: 'Lab Network Outage',
    location: 'Block B, Computer Lab 2',
    description: 'Internet is not working in the computer lab and ethernet ports show disconnected.',
  },
  {
    label: 'Classroom Projector Fault',
    location: 'Academic Block A, Room 204',
    description: 'Projector is not turning on in classroom 204 and the HDMI cable is loose.',
  },
  {
    label: 'Water Cooler Leak',
    location: 'Mechanical Wing, Ground Floor',
    description: 'Drinking water cooler leaking onto the hallway floor near the staircase.',
  },
  {
    label: 'Flickering Lecture Light',
    location: 'Lecture Theatre 3',
    description: 'Tube light flickering continuously and back row power socket sparking.',
  },
];

interface StudentComplaintFormProps {
  categories: IssueCategory[];
}

export function StudentComplaintForm({ categories }: StudentComplaintFormProps) {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory | ''>('');

  const [prediction, setPrediction] = useState<CategoryPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<ComplaintRecord | null>(null);

  // FR-2.1 to FR-2.5: Debounced live ML category suggestion as student types description
  useEffect(() => {
    const trimmed = description.trim();
    if (trimmed.length < 8) {
      setPrediction(null);
      setPredictionError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsPredicting(true);
      setPredictionError(null);
      try {
        const res = await fetch('/api/predict-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: trimmed }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setPredictionError(data.error || 'Could not analyze description.');
        } else {
          setPrediction(data as CategoryPrediction);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setPredictionError('Unable to reach category suggestion service.');
        }
      } finally {
        setIsPredicting(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [description]);

  const handleManualAnalyze = async () => {
    const trimmed = description.trim();
    if (trimmed.length < 3) {
      setPredictionError('Enter at least a short description of the issue first.');
      return;
    }
    setIsPredicting(true);
    setPredictionError(null);
    try {
      const res = await fetch('/api/predict-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPredictionError(data.error || 'Could not analyze description.');
      } else {
        setPrediction(data as CategoryPrediction);
      }
    } catch {
      setPredictionError('Unable to reach category suggestion service.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (prediction) {
      setCategory(prediction.suggestedCategory);
    }
  };

  const handleUseSample = (sample: (typeof SAMPLE_ISSUES)[number]) => {
    setLocation(sample.location);
    setDescription(sample.description);
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // FR-1.7: Validate required fields before submitting
    const cleanName = studentName.trim();
    const cleanId = studentId.trim().toUpperCase();
    const cleanLocation = location.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < 2) {
      setFormError('Please enter your full student name (minimum 2 characters).');
      return;
    }
    if (!/^[A-Z0-9_-]{4,32}$/.test(cleanId)) {
      setFormError('Please enter a valid Student ID (4–32 alphanumeric characters, e.g., EN23CS301045).');
      return;
    }
    if (cleanLocation.length < 3) {
      setFormError('Please specify the campus location (building, floor, or room).');
      return;
    }
    if (cleanDescription.length < 10) {
      setFormError('Please describe the issue in at least 10 characters.');
      return;
    }
    if (!category) {
      setFormError('Please select an issue category or accept the AI suggestion.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: cleanName,
          studentId: cleanId,
          location: cleanLocation,
          description: cleanDescription,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Submission failed. Please review your details.');
        return;
      }

      setSubmittedRecord(data.complaint as ComplaintRecord);
    } catch {
      setFormError('Network error while submitting complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStudentName('');
    setStudentId('');
    setLocation('');
    setDescription('');
    setCategory('');
    setPrediction(null);
    setPredictionError(null);
    setFormError(null);
    setSubmittedRecord(null);
  };

  if (submittedRecord) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-start gap-4 border-b border-slate-200 pb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                Complaint Submitted Successfully
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Your issue has been recorded in the campus database and queued for administrator review.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Complaint Reference ID</dt>
              <dd className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                {submittedRecord.complaint_code}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Current Status</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                <Clock className="h-4 w-4" />
                <span>{submittedRecord.status}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Student</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {submittedRecord.student_name}{' '}
                <span className="text-slate-400" aria-hidden="true">·</span>{' '}
                <span className="font-mono text-xs text-slate-600">{submittedRecord.student_id}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Assigned Category</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {submittedRecord.category}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Campus Location</dt>
              <dd className="mt-1 text-sm text-slate-900">{submittedRecord.location}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Submitted On</dt>
              <dd className="mt-1 font-mono text-xs text-slate-700 tabular-nums">
                {new Date(submittedRecord.created_at).toLocaleString()}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Issue Description</dt>
              <dd className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800">
                {submittedRecord.description}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-500">
              Keep your reference ID ({submittedRecord.complaint_code}) for campus follow-up.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Submit Another Issue</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
          Report a Campus Issue
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Submit maintenance, IT, network, or facility complaints directly to campus operations. Our classifier suggests the matching category as you describe the problem.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Complaint Form */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="studentName"
                  className="block text-sm font-medium text-slate-800"
                >
                  Student Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="studentName"
                  name="studentName"
                  type="text"
                  required
                  maxLength={100}
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., Ashprit Kaur"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label
                  htmlFor="studentId"
                  className="block text-sm font-medium text-slate-800"
                >
                  Student ID <span className="text-red-600">*</span>
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  required
                  maxLength={32}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g., EN23CS301045"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-slate-800"
              >
                Location of Issue <span className="text-red-600">*</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                required
                maxLength={150}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Block B, Computer Lab 2 / Library 1st Floor"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-800"
                >
                  Description of Issue <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleManualAnalyze}
                  disabled={isPredicting}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>{isPredicting ? 'Analyzing...' : 'Suggest Category'}</span>
                </button>
              </div>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what is malfunctioning or needs attention (e.g., Internet is not working in the computer lab)..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Minimum 10 characters required</span>
                <span className="font-mono tabular-nums">{description.length}/2000</span>
              </div>
            </div>

            {/* AI Category Suggestion Output (FR-2.5, FR-2.6, FR-2.8, FR-2.9) */}
            {(prediction || predictionError || isPredicting) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                {isPredicting ? (
                  <p className="text-xs font-medium text-slate-600">
                    Analyzing description with ML category classifier...
                  </p>
                ) : predictionError ? (
                  <p className="text-xs text-red-700">{predictionError}</p>
                ) : prediction ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>AI Category Suggestion</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {prediction.confidence}% match
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {prediction.suggestedCategory}
                      </p>
                      {prediction.matchedKeywords.length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          Matched terms: {prediction.matchedKeywords.join(' · ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAcceptSuggestion}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        category === prediction.suggestedCategory
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>
                        {category === prediction.suggestedCategory
                          ? 'Suggestion Accepted'
                          : 'Accept Suggestion'}
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-slate-800"
              >
                Issue Category <span className="text-red-600">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="">Select issue category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                You may accept the AI suggestion above or select any category manually.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Instructions & Quick Test Examples */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-semibold text-slate-900">
              How Reporting Works
            </h2>
            <ol className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-blue-700 pt-0.5">01.</span>
                <div>
                  <p className="font-medium text-slate-900">Enter Details & Location</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Provide your Student ID, building or room number, and a clear description of the issue.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-blue-700 pt-0.5">02.</span>
                <div>
                  <p className="font-medium text-slate-900">Review Category Suggestion</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Our text classifier preprocesses your description and recommends the matching category. Accept it or pick another.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs font-semibold text-blue-700 pt-0.5">03.</span>
                <div>
                  <p className="font-medium text-slate-900">Database Logging & Resolution</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Every valid complaint receives a unique reference code with an initial Pending status for administrator action.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Try Sample Descriptions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Click an example below to populate the description and test live ML category prediction.
            </p>
            <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
              {SAMPLE_ISSUES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => handleUseSample(sample)}
                  className="w-full py-3 text-left transition-colors hover:bg-slate-50 px-2 -mx-2 rounded-md cursor-pointer"
                >
                  <p className="text-xs font-semibold text-blue-700">{sample.label}</p>
                  <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                    {sample.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
