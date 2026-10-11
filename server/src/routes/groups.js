const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Rate limiter for sending messages (30 per minute)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Trop de messages. Réessayez dans un instant.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

// Basic XSS sanitization
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── GET /api/groups — List groups for current user ───
router.get('/', authenticate, async (req, res) => {
  try {
    const groups = await Group.find({
      isActive: true,
      $or: [
        { members: req.user._id },
        { admins: req.user._id },
        { type: 'public' }
      ]
    })
      .select('name slug description platform type icon color members admins messageCount lastMessageAt autoDeleteHours')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Add member count and user role for each group
    const enriched = groups.map(g => ({
      ...g,
      memberCount: g.members?.length || 0,
      isAdmin: g.admins?.some(a => a.toString() === req.user._id.toString()) || false,
      isMember: g.members?.some(m => m.toString() === req.user._id.toString()) || false,
    }));

    res.json({ groups: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/groups/available — List groups user can join ───
router.get('/available', authenticate, async (req, res) => {
  try {
    const groups = await Group.find({
      isActive: true,
      members: { $ne: req.user._id },
      bannedUsers: { $ne: req.user._id },
    })
      .select('name slug description platform type icon color members maxMembers autoDeleteHours')
      .sort({ memberCount: -1 })
      .lean();

    const enriched = groups.map(g => ({
      ...g,
      memberCount: g.members?.length || 0,
    }));

    res.json({ groups: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/groups/:slug/join — Join a group ───
router.post('/:slug/join', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug, isActive: true });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });
    if (group.bannedUsers.includes(req.user._id)) return res.status(403).json({ error: 'Vous êtes banni de ce groupe.' });
    if (group.members.includes(req.user._id)) return res.status(400).json({ error: 'Vous êtes déjà membre.' });
    if (group.members.length >= group.maxMembers) return res.status(400).json({ error: 'Groupe complet.' });

    group.members.push(req.user._id);
    await group.save();

    // System message
    const sysMsg = await GroupMessage.create({
      group: group._id,
      sender: req.user._id,
      content: `${req.user.firstName} a rejoint le groupe`,
      type: 'system',
      expiresAt: group.autoDeleteMessages ? new Date(Date.now() + group.autoDeleteHours * 3600000) : undefined,
    });

    // Broadcast via WS
    broadcastToGroup(group._id.toString(), {
      type: 'group_message',
      groupId: group._id,
      message: { ...sysMsg.toObject(), sender: { _id: req.user._id, firstName: req.user.firstName, lastName: req.user.lastName } }
    });

    res.json({ success: true, message: 'Vous avez rejoint le groupe.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/groups/:slug/leave — Leave a group ───
router.post('/:slug/leave', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug, isActive: true });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    group.admins = group.admins.filter(a => a.toString() !== req.user._id.toString());
    await group.save();

    res.json({ success: true, message: 'Vous avez quitté le groupe.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/groups/:slug — Group details ───
router.get('/:slug', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug, isActive: true })
      .populate('admins', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    const isAdmin = group.admins.some(a => a._id.toString() === req.user._id.toString());
    const isGlobalAdmin = req.user.role === 'admin';

    if (group.type === 'private' && !isMember && !isAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: 'Accès refusé. Rejoignez le groupe d\'abord.' });
    }

    res.json({
      group: {
        ...group.toObject(),
        memberCount: group.members.length,
        isMember,
        isAdmin: isAdmin || isGlobalAdmin,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/groups/:slug/messages — Get messages ───
router.get('/:slug/messages', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug, isActive: true });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    if (!isMember && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;

    const query = { group: group._id, isDeleted: false };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await GroupMessage.find(query)
      .populate('sender', 'firstName lastName role')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Pinned messages
    const pinned = await GroupMessage.find({ group: group._id, isPinned: true, isDeleted: false })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ messages: messages.reverse(), pinned, hasMore: messages.length === limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/groups/:slug/messages — Send message ───
router.post('/:slug/messages', authenticate, messageLimiter, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug, isActive: true });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
    if (!isMember && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Vous devez être membre.' });
    }
    if (group.muteAll && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Le groupe est en mode silencieux.' });
    }

    const { content, type, signal, replyTo } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Message vide.' });
    if (content.length > 2000) return res.status(400).json({ error: 'Message trop long (max 2000 caractères).' });

    const safeContent = sanitize(content.trim());

    const message = await GroupMessage.create({
      group: group._id,
      sender: req.user._id,
      content: safeContent,
      type: type || 'text',
      signal: type === 'signal' ? signal : undefined,
      replyTo: replyTo || undefined,
      expiresAt: group.autoDeleteMessages ? new Date(Date.now() + group.autoDeleteHours * 3600000) : undefined,
    });

    // Update group stats
    group.messageCount += 1;
    group.lastMessageAt = new Date();
    await group.save();

    const populated = await GroupMessage.findById(message._id)
      .populate('sender', 'firstName lastName role')
      .populate('replyTo', 'content sender')
      .lean();

    // Broadcast to group members via WS
    broadcastToGroup(group._id.toString(), {
      type: 'group_message',
      groupId: group._id,
      message: populated
    });

    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/groups/:slug/messages/:messageId — Delete message (admin or sender) ───
router.delete('/:slug/messages/:messageId', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString()) || req.user.role === 'admin';
    const message = await GroupMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message introuvable.' });

    const isSender = message.sender.toString() === req.user._id.toString();
    if (!isSender && !isAdmin) return res.status(403).json({ error: 'Non autorisé.' });

    message.isDeleted = true;
    message.content = 'Message supprimé';
    await message.save();

    broadcastToGroup(group._id.toString(), {
      type: 'group_message_deleted',
      groupId: group._id,
      messageId: message._id,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/groups/:slug/messages/:messageId/pin — Pin/unpin message (admin) ───
router.post('/:slug/messages/:messageId/pin', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString()) || req.user.role === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin requis.' });

    const message = await GroupMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message introuvable.' });

    message.isPinned = !message.isPinned;
    await message.save();

    res.json({ success: true, isPinned: message.isPinned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: POST /api/groups — Create group ───
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, platform, type, icon, color, rules, autoDeleteHours, maxMembers } = req.body;
    if (!name || !slug || !platform) return res.status(400).json({ error: 'Nom, slug et plateforme requis.' });

    const exists = await Group.findOne({ slug });
    if (exists) return res.status(400).json({ error: 'Ce slug existe déjà.' });

    const group = await Group.create({
      name, slug, description, platform, type: type || 'private',
      icon, color, rules,
      autoDeleteHours: autoDeleteHours || 24,
      maxMembers: maxMembers || 500,
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
    });

    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: PUT /api/groups/:slug — Update group ───
router.put('/:slug', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString()) || req.user.role === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin requis.' });

    const allowed = ['name', 'description', 'rules', 'muteAll', 'autoDeleteMessages', 'autoDeleteHours', 'maxMembers', 'icon', 'color'];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) group[key] = req.body[key];
    });
    await group.save();

    res.json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: POST /api/groups/:slug/kick/:userId — Kick member ───
router.post('/:slug/kick/:userId', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString()) || req.user.role === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin requis.' });

    const userId = req.params.userId;
    group.members = group.members.filter(m => m.toString() !== userId);
    group.admins = group.admins.filter(a => a.toString() !== userId);

    if (req.body.ban) group.bannedUsers.push(userId);
    await group.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: POST /api/groups/:slug/promote/:userId — Promote to admin ───
router.post('/:slug/promote/:userId', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug });
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString()) || req.user.role === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin requis.' });

    if (!group.admins.includes(req.params.userId)) {
      group.admins.push(req.params.userId);
      await group.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: GET /api/groups/:slug/members — List members ───
router.get('/:slug/members', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug })
      .populate('members', 'firstName lastName email role createdAt')
      .populate('admins', 'firstName lastName');
    if (!group) return res.status(404).json({ error: 'Groupe introuvable.' });

    const isAdmin = group.admins.some(a => a._id.toString() === req.user._id.toString()) || req.user.role === 'admin';
    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember && !isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

    res.json({
      members: group.members,
      admins: group.admins.map(a => a._id.toString()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: Broadcast to group members ───
function broadcastToGroup(groupId, data) {
  if (!global.wss) return;
  global.wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.subscribedGroups?.includes(groupId)) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = router;
