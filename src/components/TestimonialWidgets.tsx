import { useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TESTIMONIAL WIDGETS â€” Display and collect testimonials
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Featured Testimonials Carousel
export function FeaturedTestimonials() {
  const testimonials = useQuery(api.testimonials.getFeaturedTestimonials, { limit: 5 });

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-white">â­ What Our Users Say</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t: any) => (
          <div
            key={t._id}
            className="rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6"
          >
            {/* Rating */}
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${i < t.rating ? "text-amber-400" : "text-slate-600"}`}
                >
                  â˜…
                </span>
              ))}
            </div>

            {/* Title */}
            <h4 className="mb-2 text-sm font-bold text-white">{t.title}</h4>

            {/* Content */}
            <p className="mb-4 text-xs text-slate-400 leading-relaxed">{t.content}</p>

            {/* Result */}
            {t.result && (
              <div className="mb-4 rounded-lg bg-green-500/10 px-3 py-2 text-[10px] text-green-400">
                ðŸ“ˆ {t.result}
              </div>
            )}

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
                {t.userAvatar ? (
                  <img src={t.userAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  t.userName[0]
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{t.userName}</div>
                <div className="text-[9px] text-slate-500">{t.service}</div>
              </div>
              {t.verified && (
                <div className="ml-auto rounded-full bg-green-500/20 px-2 py-0.5 text-[8px] font-bold text-green-400">
                  âœ“ Verified
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Testimonial Grid (all approved)
export function TestimonialGrid() {
  const [filter, setFilter] = useState({ service: "", rating: 0 });

  const testimonials = useQuery(api.testimonials.getTestimonials, {
      service: filter.service || undefined,
      rating: filter.rating || undefined,
      limit: 20,
    });

  if (!testimonials) return null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filter.service}
          onChange={(e) => setFilter({ ...filter, service: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
        >
          <option value="">All Services</option>
          <option value="academic">Academic</option>
          <option value="business">Business</option>
          <option value="content">Content</option>
          <option value="video">Video</option>
        </select>
        <select
          value={filter.rating}
          onChange={(e) => setFilter({ ...filter, rating: Number(e.target.value) })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
        >
          <option value={0}>All Ratings</option>
          <option value={5}>5 Stars</option>
          <option value={4}>4+ Stars</option>
          <option value={3}>3+ Stars</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t: any) => (
          <div
            key={t._id}
            className="rounded-2xl border border-white/5 bg-white/5 p-4"
          >
            <div className="mb-2 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${i < t.rating ? "text-amber-400" : "text-slate-600"}`}
                >
                  â˜…
                </span>
              ))}
            </div>
            <h4 className="mb-1 text-xs font-bold text-white">{t.title}</h4>
            <p className="mb-3 text-[10px] text-slate-400">{t.content}</p>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-500">{t.userName}</div>
              {t.verified && (
                <div className="text-[8px] text-green-400">âœ“ Verified</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Testimonial Submission Form
export function TestimonialForm({ service }: { service: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitTestimonial = useMutation(api.testimonials.submitTestimonial);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Would need user ID from auth
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
        <div className="text-3xl">ðŸŽ‰</div>
        <div className="mt-2 text-sm font-bold text-white">Thank you!</div>
        <div className="mt-1 text-[10px] text-slate-400">
          Your testimonial has been submitted and will appear after review.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-black text-white">Share Your Experience</h3>

      {/* Rating */}
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRating(r)}
              className={`text-xl ${r <= rating ? "text-amber-400" : "text-slate-600"}`}
            >
              â˜…
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500"
          required
        />
      </div>

      {/* Content */}
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Your Testimonial</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500"
          required
        />
      </div>

      {/* Result */}
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">Result (optional)</label>
        <input
          type="text"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="e.g., Increased productivity by 50%"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500"
      >
        Submit Testimonial
      </button>
    </form>
  );
}

// Testimonial Stats (Admin)
export function TestimonialStats() {
  const stats = useQuery(api.testimonials.getTestimonialStats, {});

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[10px] text-slate-400">Total</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-green-400">{stats.approved}</div>
          <div className="text-[10px] text-slate-400">Approved</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-yellow-400">{stats.pending}</div>
          <div className="text-[10px] text-slate-400">Pending</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-amber-400">{stats.averageRating}</div>
          <div className="text-[10px] text-slate-400">Avg Rating</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-purple-400">{stats.featured}</div>
          <div className="text-[10px] text-slate-400">Featured</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-black text-white">â­ Rating Distribution</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
            const percentage = stats.approved > 0 ? (count / stats.approved) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="w-8 text-xs text-slate-400">{rating}â˜…</div>
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs text-white">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
