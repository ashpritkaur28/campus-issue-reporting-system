import { FormEvent, useState } from 'react';
import { Cpu } from 'lucide-react';
import { CategoryPrediction } from '../types/complaint';

const TEST_PROMPTS = [
  'Internet is not working in the computer lab',
  'Ceiling fan making loud noise and tube light flickering in room 102',
  'Drinking water cooler leaking onto the hallway floor',
  'Hot water geyser not working in hostel wing B',
  'CCTV camera disconnected near main entrance gate',
];

export function MlClassifierView() {
  const [inputText, setInputText] = useState(TEST_PROMPTS[0]);
  const [result, setResult] = useState<CategoryPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPrediction = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predict-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Prediction failed.');
      } else {
        setResult(data as CategoryPrediction);
      }
    } catch {
      setError('Unable to reach ML prediction endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runPrediction(inputText);
  };

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
          ML Category Suggestion Engine
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Test how our Multinomial Naive Bayes classifier preprocesses student issue descriptions and predicts the most suitable campus category. Per SRS scope, the model predicts only the category—never complaint priority.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="mlInput" className="block text-sm font-medium text-slate-800">
              Sample Issue Description
            </label>
            <textarea
              id="mlInput"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter any campus issue description..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Pipeline: Lowercase · Stopword removal · Normalization · Bigram Naive Bayes
              </span>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>{loading ? 'Running Classifier...' : 'Predict Category'}</span>
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-4 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-6 space-y-5 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Predicted Category</p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">
                    {result.suggestedCategory}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Confidence</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-blue-700 tabular-nums">
                    {result.confidence}%
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Preprocessed Tokens</p>
                <p className="mt-1 font-mono text-xs text-slate-700">
                  {result.preprocessedTokens.length > 0
                    ? result.preprocessedTokens.join(' · ')
                    : 'No valid tokens extracted'}
                </p>
              </div>

              <div>
                <p className="mb-2.5 text-xs font-medium text-slate-500">
                  Top Category Probabilities
                </p>
                <div className="space-y-2.5">
                  {result.topScores.map((score) => (
                    <div key={score.category}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{score.category}</span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {score.probability}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-700 transition-all duration-200"
                          style={{ width: `${Math.min(100, score.probability)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Quick Evaluation Sentences
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Click any sentence to test the deterministic classifier output.
          </p>
          <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
            {TEST_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setInputText(prompt);
                  runPrediction(prompt);
                }}
                className="w-full py-3 text-left text-xs leading-relaxed text-slate-700 hover:bg-slate-50 hover:text-blue-700 px-2 -mx-2 rounded-md cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
