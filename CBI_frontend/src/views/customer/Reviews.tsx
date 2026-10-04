import { useState, useEffect } from 'react'
import { Star, MessageSquare, Loader2, Check } from 'lucide-react'
import { reviewsApi, type Review } from '../../api'

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchMyReviews()
  }, [])

  const fetchMyReviews = async () => {
    try {
      setLoading(true)
      const data = await reviewsApi.getMyReviews()
      setReviews(data)
    } catch (err) {
      console.error('Failed to fetch reviews', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (rating === 0) {
      setErrorMsg('Please select a rating.')
      return
    }
    if (!comment.trim()) {
      setErrorMsg('Please enter a comment.')
      return
    }

    try {
      setSubmitting(true)
      await reviewsApi.create(rating, comment.trim())
      setSuccessMsg('Thank you for your feedback!')
      setRating(0)
      setComment('')
      fetchMyReviews()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight">My Reviews</h1>
          <p className="text-sm text-ink-muted">Share your experience at Cambacay Breeze Inn</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-stone/30 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-ink mb-4">Write a Review</h2>
            
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-start gap-2">
                <Check className="w-5 h-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          (hoverRating || rating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone/40'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">Comment</label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your stay..."
                  className="w-full px-4 py-3 rounded-xl border border-stone/30 bg-[#F6F2E8]/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white font-semibold rounded-xl text-sm transition-all flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Review
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <h2 className="text-lg font-bold text-ink mb-4">Past Reviews</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#6B7A5E] animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-stone/30 p-12 text-center text-ink-muted">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>You haven't submitted any reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-stone/30 p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            review.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-stone/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-ink-muted">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{review.comment}</p>
                  
                  {!review.is_published && (
                    <div className="mt-4 inline-block px-2.5 py-1 bg-stone/20 text-ink-muted text-[10px] uppercase font-bold rounded-md">
                      Hidden by Admin
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
