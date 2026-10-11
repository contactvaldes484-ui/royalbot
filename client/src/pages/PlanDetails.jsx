import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function PlanDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    // All robots are free now — redirect to robot detail page
    const slugMap = {
      'starter-bot': 'starter-bot',
      'pro-bot': 'pro-bot',
      'elite-bot': 'elite-bot',
      'mt-lite': 'mt-lite',
      'mt-pro': 'mt-pro',
      'mt-elite': 'mt-elite',
    }
    const robotSlug = slugMap[slug] || slug
    navigate(`/robots/${robotSlug}`, { replace: true })
  }, [slug, navigate])

  return null
}
