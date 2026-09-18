import { useState, useEffect } from 'react'
import { Star, MessageSquare, Loader2, Eye, EyeOff } from 'lucide-react'
import { reviewsApi, type Review } from '../../api'
import Avatar from '../../components/Avatar'

export default function GuestReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const data = await reviewsApi.getAll()
      setReviews(data)
    } catch (err) {
      console.error('Failed to fetch reviews', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = async (id: number) => {
    try {
      const res = await reviewsApi.toggleVisibility(id)
      setReviews((prev) => 
        prev.map((r) => r.id === id ? { ...r, is_published: res.is_published } : r)
      )
    } catch (err) {
      console.error('Failed to toggle visibility', err)
      alert('Failed to update review visibility.')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#6B7A5E]/10 text-[#6B7A5E] rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ink tracking-tight">Guest Reviews</h1>
            <p className="text-sm text-ink-muted">Moderate and view customer feedback</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#6B7A5E] animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone/30 p-20 text-center text-ink-muted flex flex-col items-center">
          <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-semibold text-ink">No reviews yet.</p>
          <p className="text-sm">When customers submit feedback, it will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <div key={review.id} className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col transition-all ${review.is_published ? 'border-stone/30' : 'border-dashed border-stone/40 opacity-75'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={review.customer_name} photoUrl={review.profile_photo_url} size="md" />
                  <div>
                    <h3 className="text-sm font-bold text-ink">{review.customer_name}</h3>
                    <span className="text-[11px] text-ink-muted">
                      {new Date(review.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleVisibility(review.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    review.is_published 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-stone/10 text-ink-muted hover:bg-stone/20'
                  }`}
                  title={review.is_published ? 'Click to Hide from Public' : 'Click to Show to Public'}
                >
                  {review.is_published ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Published</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      review.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-stone/30'
                    }`}
                  />
                ))}
              </div>

              <p className="text-sm text-ink leading-relaxed flex-1">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
