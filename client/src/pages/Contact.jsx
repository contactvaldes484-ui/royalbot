import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { contactAPI } from '../lib/api'
import { Mail, MessageCircle, MapPin, Loader2, CheckCircle } from 'lucide-react'
import SEO from '../components/SEO'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await contactAPI.send(form)
      setSent(true)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-20">
      <SEO title="Contact" path="/contact" description="Contactez l'équipe RoyalBot pour toute question sur nos robots de trading, support technique ou partenariat." />
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-16" initial="hidden" animate="visible" variants={stagger}>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Contactez</span>-nous
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une question ? Un problème ? Notre équipe est là pour vous aider.
          </motion.p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact info */}
          <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Email</h3>
                    <p className="text-sm text-muted-foreground">support@royalbot.pro</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Telegram</h3>
                    <p className="text-sm text-muted-foreground">@RoyalBotSupport</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Horaires</h3>
                    <p className="text-sm text-muted-foreground">Lun-Ven, 9h-18h UTC</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Form */}
          <motion.div className="md:col-span-2" variants={fadeUp} initial="hidden" animate="visible">
            <Card>
              <CardContent className="p-6">
                {sent ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Message envoyé !</h3>
                    <p className="text-muted-foreground mb-4">Nous vous répondrons dans les plus brefs délais.</p>
                    <Button variant="outline" onClick={() => setSent(false)}>Envoyer un autre message</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Nom</label>
                        <Input name="name" placeholder="Votre nom" value={form.name} onChange={handleChange} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <Input name="email" type="email" placeholder="votre@email.com" value={form.email} onChange={handleChange} required />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Sujet</label>
                      <Input name="subject" placeholder="Sujet de votre message" value={form.subject} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Message</label>
                      <textarea
                        name="message"
                        rows={5}
                        placeholder="Votre message..."
                        value={form.message}
                        onChange={handleChange}
                        required
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      />
                    </div>
                    <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Envoyer le message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
