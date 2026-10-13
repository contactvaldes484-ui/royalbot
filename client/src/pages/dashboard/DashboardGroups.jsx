import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import useStore from '../../store/useStore'
import { groupAPI } from '../../lib/api'
import {
  MessageCircle, Users, Send, ArrowLeft, Pin, Trash2, Shield,
  Clock, Hash, Zap, Crown, UserPlus, UserMinus, Settings,
  Loader2, AlertCircle, ChevronDown, MoreVertical, Mic, MicOff,
  TrendingUp, TrendingDown, Target, X
} from 'lucide-react'

const GROUP_COLORS = {
  mt4: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-500', solid: 'bg-violet-500' },
  mt5: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', solid: 'bg-blue-500' },
  forex: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-500', solid: 'bg-indigo-500' },
  general: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', solid: 'bg-green-500' },
}

export default function DashboardGroups() {
  const { user } = useStore()
  const [groups, setGroups] = useState([])
  const [availableGroups, setAvailableGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [messages, setMessages] = useState([])
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [members, setMembers] = useState([])
  const [adminIds, setAdminIds] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSignalForm, setShowSignalForm] = useState(false)
  const [view, setView] = useState('list') // list | chat
  const [groupDetail, setGroupDetail] = useState(null)
  const messagesEndRef = useRef(null)
  const wsRef = useRef(null)
  const inputRef = useRef(null)

  // Load groups
  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const [myRes, availRes] = await Promise.all([
        groupAPI.getMyGroups(),
        groupAPI.getAvailable()
      ])
      setGroups(myRes.data.groups || [])
      setAvailableGroups(availRes.data.groups || [])
    } catch (err) {
      console.error('Error loading groups:', err)
    }
    setLoading(false)
  }

  // Open group chat
  const openGroup = async (group) => {
    try {
      const [detailRes, msgRes] = await Promise.all([
        groupAPI.getGroup(group.slug),
        groupAPI.getMessages(group.slug)
      ])
      setGroupDetail(detailRes.data.group)
      setMessages(msgRes.data.messages || [])
      setPinnedMessages(msgRes.data.pinned || [])
      setSelectedGroup(group)
      setView('chat')

      // Subscribe via WS
      connectGroupWS(detailRes.data.group._id)

      // Load members
      try {
        const memRes = await groupAPI.getMembers(group.slug)
        setMembers(memRes.data.members || [])
        setAdminIds(memRes.data.admins || [])
      } catch {}

      setTimeout(() => scrollToBottom(), 100)
    } catch (err) {
      console.error('Error opening group:', err)
    }
  }

  // WS connection for real-time messages.
  // L'URL WS est dérivée de VITE_API_URL (le backend Railway/Render), PAS de l'hôte
  // du frontend — sinon en production (Vercel) on tenterait wss://vercel-app/... :5000.
  const connectGroupWS = (groupId) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const apiUrl = import.meta.env.VITE_API_URL || 'https://web-production-19f31.up.railway.app/api'
    let wsUrl
    if (apiUrl.startsWith('http')) {
      const url = new URL(apiUrl)
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${url.host}/ws?token=${token}`
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`
    }

    if (wsRef.current) wsRef.current.close()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe_group', groupId }))
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'group_message' && data.groupId === groupId) {
          setMessages(prev => [...prev, data.message])
          setTimeout(() => scrollToBottom(), 50)
        }
        if (data.type === 'group_message_deleted') {
          setMessages(prev => prev.map(m =>
            m._id === data.messageId ? { ...m, isDeleted: true, content: 'Message supprimé' } : m
          ))
        }
      } catch {}
    }
    ws.onerror = () => {}
    ws.onclose = () => {}
  }

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || sending || !selectedGroup) return
    setSending(true)
    try {
      await groupAPI.sendMessage(selectedGroup.slug, { content: newMessage.trim(), type: 'text' })
      setNewMessage('')
      inputRef.current?.focus()
    } catch (err) {
      console.error('Error sending message:', err)
    }
    setSending(false)
  }

  // Send signal
  const handleSendSignal = async (signal) => {
    if (!selectedGroup) return
    try {
      const content = `📊 Signal ${signal.direction.toUpperCase()} ${signal.symbol}\nEntrée: ${signal.entry}\nSL: ${signal.stopLoss}\nTP: ${signal.takeProfit}${signal.notes ? '\n💡 ' + signal.notes : ''}`
      await groupAPI.sendMessage(selectedGroup.slug, { content, type: 'signal', signal })
      setShowSignalForm(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Join group
  const handleJoin = async (slug) => {
    try {
      await groupAPI.joinGroup(slug)
      await loadGroups()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  // Leave group
  const handleLeave = async () => {
    if (!selectedGroup || !confirm('Quitter ce groupe ?')) return
    try {
      await groupAPI.leaveGroup(selectedGroup.slug)
      setView('list')
      setSelectedGroup(null)
      await loadGroups()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!selectedGroup) return
    try {
      await groupAPI.deleteMessage(selectedGroup.slug, messageId)
    } catch (err) {
      console.error(err)
    }
  }

  // Pin message
  const handlePinMessage = async (messageId) => {
    if (!selectedGroup) return
    try {
      await groupAPI.pinMessage(selectedGroup.slug, messageId)
    } catch (err) {
      console.error(err)
    }
  }

  // Kick member
  const handleKick = async (userId, ban = false) => {
    if (!selectedGroup) return
    const action = ban ? 'bannir' : 'expulser'
    if (!confirm(`Voulez-vous ${action} ce membre ?`)) return
    try {
      await groupAPI.kickMember(selectedGroup.slug, userId, ban)
      const memRes = await groupAPI.getMembers(selectedGroup.slug)
      setMembers(memRes.data.members || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Promote
  const handlePromote = async (userId) => {
    if (!selectedGroup || !confirm('Promouvoir en admin ?')) return
    try {
      await groupAPI.promoteMember(selectedGroup.slug, userId)
      const memRes = await groupAPI.getMembers(selectedGroup.slug)
      setAdminIds(memRes.data.admins || [])
    } catch (err) {
      console.error(err)
    }
  }

  const isAdmin = groupDetail?.isAdmin || false
  const colors = GROUP_COLORS[selectedGroup?.platform] || GROUP_COLORS.general

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  // ── Chat View ──
  if (view === 'chat' && selectedGroup) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b mb-2">
          <button onClick={() => { setView('list'); setSelectedGroup(null) }}
            className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className={`w-10 h-10 rounded-xl ${colors.solid} flex items-center justify-center`}>
            <Hash className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm truncate">{selectedGroup.name}</h2>
            <p className="text-[10px] text-muted-foreground">
              {groupDetail?.memberCount || 0} membres • Auto-delete {selectedGroup.autoDeleteHours || 24}h
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-lg transition-colors ${showMembers ? 'bg-violet-500 text-white' : 'hover:bg-muted'}`}>
              <Users className="h-4 w-4" />
            </button>
            {isAdmin && (
              <button onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-violet-500 text-white' : 'hover:bg-muted'}`}>
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 gap-3 overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Pinned messages */}
            {pinnedMessages.length > 0 && (
              <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] font-semibold text-amber-500 flex items-center gap-1 mb-1">
                  <Pin className="h-3 w-3" /> Messages épinglés
                </p>
                {pinnedMessages.slice(0, 2).map(m => (
                  <p key={m._id} className="text-xs text-muted-foreground truncate">
                    <span className="font-semibold">{m.sender?.firstName}:</span> {m.content}
                  </p>
                ))}
              </div>
            )}

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Aucun message encore</p>
                  <p className="text-xs">Soyez le premier à écrire !</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender?._id === user?._id
                  const isSystem = msg.type === 'system'
                  const isSignal = msg.type === 'signal'
                  const prevMsg = messages[i - 1]
                  const showAvatar = !prevMsg || prevMsg.sender?._id !== msg.sender?._id || prevMsg.type === 'system'
                  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

                  if (isSystem) {
                    return (
                      <div key={msg._id} className="text-center py-1">
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div key={msg._id} className={`group flex gap-2 px-1 py-0.5 rounded-lg hover:bg-muted/30 ${isMine ? 'flex-row-reverse' : ''}`}>
                      {showAvatar ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          msg.sender?.role === 'admin' ? 'bg-amber-500' : 'bg-violet-500'
                        }`}>
                          {msg.sender?.firstName?.[0] || '?'}
                        </div>
                      ) : <div className="w-8 shrink-0" />}

                      <div className={`max-w-[75%] ${isMine ? 'text-right' : ''}`}>
                        {showAvatar && (
                          <div className={`flex items-center gap-1.5 mb-0.5 ${isMine ? 'justify-end' : ''}`}>
                            <span className="text-xs font-semibold">{msg.sender?.firstName} {msg.sender?.lastName?.[0]}.</span>
                            {msg.sender?.role === 'admin' && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 border-amber-500/50 text-amber-500">ADMIN</Badge>
                            )}
                            <span className="text-[9px] text-muted-foreground">{time}</span>
                          </div>
                        )}

                        {isSignal ? (
                          <div className={`p-3 rounded-xl border ${
                            msg.signal?.direction === 'buy' || msg.signal?.direction === 'over'
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-red-500/10 border-red-500/30'
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Target className="h-3.5 w-3.5" />
                              <span className="text-xs font-bold">SIGNAL</span>
                              <Badge className="text-[9px]" variant={msg.signal?.direction === 'buy' || msg.signal?.direction === 'over' ? 'success' : 'destructive'}>
                                {msg.signal?.direction?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs whitespace-pre-line">{msg.content}</p>
                          </div>
                        ) : (
                          <div className={`px-3 py-2 rounded-2xl text-sm ${
                            msg.isDeleted
                              ? 'bg-muted/30 text-muted-foreground italic'
                              : isMine
                                ? 'bg-violet-500 text-white rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                          }`}>
                            <p className="whitespace-pre-line break-words text-[13px]">{msg.content}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {!msg.isDeleted && (
                          <div className={`hidden group-hover:flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
                            {(isMine || isAdmin) && (
                              <button onClick={() => handleDeleteMessage(msg._id)}
                                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => handlePinMessage(msg._id)}
                                className="p-1 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500">
                                <Pin className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t mt-2">
              {isAdmin && (
                <button type="button" onClick={() => setShowSignalForm(!showSignalForm)}
                  className={`p-2 rounded-lg transition-colors ${showSignalForm ? 'bg-green-500 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                  <Target className="h-4 w-4" />
                </button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={groupDetail?.muteAll && !isAdmin ? 'Groupe en mode silencieux...' : 'Votre message...'}
                disabled={groupDetail?.muteAll && !isAdmin}
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                maxLength={2000}
              />
              <Button type="submit" size="sm" variant="gradient" disabled={!newMessage.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>

            {/* Signal form */}
            {showSignalForm && <SignalForm onSend={handleSendSignal} onClose={() => setShowSignalForm(false)} platform={selectedGroup.platform} />}
          </div>

          {/* Members sidebar */}
          {showMembers && (
            <div className="w-64 border-l pl-3 overflow-y-auto shrink-0">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Membres ({members.length})
              </h4>
              <div className="space-y-1">
                {members.map(m => {
                  const mIsAdmin = adminIds.includes(m._id)
                  return (
                    <div key={m._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 group/member">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${mIsAdmin ? 'bg-amber-500' : 'bg-violet-500'}`}>
                        {m.firstName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.firstName} {m.lastName?.[0]}.</p>
                        {mIsAdmin && <p className="text-[9px] text-amber-500">Admin</p>}
                      </div>
                      {isAdmin && m._id !== user?._id && (
                        <div className="hidden group-hover/member:flex items-center gap-0.5">
                          {!mIsAdmin && (
                            <button onClick={() => handlePromote(m._id)} className="p-1 rounded hover:bg-violet-500/10 text-muted-foreground" title="Promouvoir admin">
                              <Crown className="h-3 w-3" />
                            </button>
                          )}
                          <button onClick={() => handleKick(m._id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground" title="Expulser">
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t">
                <button onClick={handleLeave} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Quitter le groupe
                </button>
              </div>
            </div>
          )}

          {/* Settings sidebar (admin) */}
          {showSettings && isAdmin && (
            <GroupSettings group={groupDetail} slug={selectedGroup.slug}
              onUpdate={(g) => setGroupDetail(prev => ({ ...prev, ...g }))}
              onClose={() => setShowSettings(false)} />
          )}
        </div>
      </div>
    )
  }

  // ── Group List View ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Groupes privés</h1>
        <p className="text-muted-foreground text-sm">Échangez avec la communauté de traders crypto sur Binance.</p>
      </div>

      {/* My groups */}
      {groups.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-violet-500" /> Mes groupes ({groups.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map(g => {
              const c = GROUP_COLORS[g.platform] || GROUP_COLORS.general
              return (
                <Card key={g._id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => openGroup(g)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${c.solid} flex items-center justify-center`}>
                        <Hash className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-sm truncate">{g.name}</h3>
                          {g.isAdmin && <Badge variant="outline" className="text-[8px] border-amber-500/50 text-amber-500">ADMIN</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {g.memberCount}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Auto-delete {g.autoDeleteHours}h
                          </span>
                          <Badge className={`text-[8px] ${c.bg} ${c.text} border-0`}>{g.platform}</Badge>
                        </div>
                      </div>
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Available groups */}
      {availableGroups.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-500" /> Groupes disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableGroups.map(g => {
              const c = GROUP_COLORS[g.platform] || GROUP_COLORS.general
              return (
                <Card key={g._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${c.solid} flex items-center justify-center opacity-70`}>
                        <Hash className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">{g.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {g.memberCount}/{g.maxMembers}
                          </span>
                          <Badge className={`text-[8px] ${c.bg} ${c.text} border-0`}>{g.platform}</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="gradient" onClick={() => handleJoin(g.slug)}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Rejoindre
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {groups.length === 0 && availableGroups.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <h3 className="font-bold mb-1">Aucun groupe disponible</h3>
            <p className="text-sm text-muted-foreground">Les groupes seront créés par l'administrateur. Revenez bientôt !</p>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-6 w-6 mx-auto mb-2 text-violet-500" />
            <h4 className="text-sm font-bold">Groupes privés</h4>
            <p className="text-xs text-muted-foreground">Accès réservé aux membres vérifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <h4 className="text-sm font-bold">Auto-suppression 24h</h4>
            <p className="text-xs text-muted-foreground">Les messages sont supprimés automatiquement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <h4 className="text-sm font-bold">Signaux de trading</h4>
            <p className="text-xs text-muted-foreground">Partagez et recevez des signaux en direct</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Signal Form Component ──
function SignalForm({ onSend, onClose, platform }) {
  const [signal, setSignal] = useState({
    symbol: 'XAUUSD',
    direction: 'buy',
    entry: '',
    stopLoss: '',
    takeProfit: '',
    notes: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!signal.symbol || !signal.direction) return
    onSend(signal)
  }

  return (
    <div className="mt-3 p-4 rounded-xl border bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold flex items-center gap-1.5">
          <Target className="h-4 w-4 text-green-500" /> Envoyer un signal
        </h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Symbole" value={signal.symbol}
          onChange={(e) => setSignal(s => ({ ...s, symbol: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-background border text-sm" />
        <select value={signal.direction} onChange={(e) => setSignal(s => ({ ...s, direction: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-background border text-sm">
          <option value="buy">BUY ↑</option>
          <option value="sell">SELL ↓</option>
        </select>
        <input type="text" placeholder="Entrée" value={signal.entry}
          onChange={(e) => setSignal(s => ({ ...s, entry: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-background border text-sm" />
        <input type="text" placeholder="Stop Loss" value={signal.stopLoss}
          onChange={(e) => setSignal(s => ({ ...s, stopLoss: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-background border text-sm" />
        <input type="text" placeholder="Take Profit" value={signal.takeProfit}
          onChange={(e) => setSignal(s => ({ ...s, takeProfit: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-background border text-sm" />
        <input type="text" placeholder="Notes (optionnel)" value={signal.notes}
          onChange={(e) => setSignal(s => ({ ...s, notes: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-background border text-sm" />
        <div className="col-span-2">
          <Button type="submit" size="sm" variant="gradient" className="w-full">
            <Send className="h-3.5 w-3.5 mr-1" /> Envoyer le signal
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Group Settings Component (Admin) ──
function GroupSettings({ group, slug, onUpdate, onClose }) {
  const [form, setForm] = useState({
    description: group?.description || '',
    rules: group?.rules || '',
    muteAll: group?.muteAll || false,
    autoDeleteMessages: group?.autoDeleteMessages ?? true,
    autoDeleteHours: group?.autoDeleteHours || 24,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await groupAPI.updateGroup(slug, form)
      onUpdate(res.data.group)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div className="w-72 border-l pl-3 overflow-y-auto shrink-0 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold flex items-center gap-1">
          <Settings className="h-3.5 w-3.5" /> Paramètres
        </h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground">Description</label>
        <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-muted border-0 text-xs resize-none" rows={3} />
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground">Règles du groupe</label>
        <textarea value={form.rules} onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-muted border-0 text-xs resize-none" rows={3} />
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground">Auto-delete (heures)</label>
        <input type="number" value={form.autoDeleteHours} min={1} max={168}
          onChange={(e) => setForm(f => ({ ...f, autoDeleteHours: parseInt(e.target.value) || 24 }))}
          className="w-full px-3 py-2 rounded-lg bg-muted border-0 text-xs" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs">Mode silencieux</span>
        <button onClick={() => setForm(f => ({ ...f, muteAll: !f.muteAll }))}
          className={`w-10 h-5 rounded-full transition-colors ${form.muteAll ? 'bg-red-500' : 'bg-muted'}`}>
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.muteAll ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs">Auto-suppression</span>
        <button onClick={() => setForm(f => ({ ...f, autoDeleteMessages: !f.autoDeleteMessages }))}
          className={`w-10 h-5 rounded-full transition-colors ${form.autoDeleteMessages ? 'bg-green-500' : 'bg-muted'}`}>
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.autoDeleteMessages ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <Button size="sm" variant="gradient" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Sauvegarder
      </Button>
    </div>
  )
}
