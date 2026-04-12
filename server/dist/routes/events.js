"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Event_1 = __importDefault(require("../models/Event"));
const User_1 = __importDefault(require("../models/User"));
const PointTransaction_1 = __importDefault(require("../models/PointTransaction"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/events?lat=&lng=&spotId=
router.get('/', async (req, res) => {
    try {
        const { spotId } = req.query;
        const query = {};
        if (spotId)
            query.spotId = spotId;
        const events = await Event_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(50);
        const mapped = events.map(e => ({
            id: String(e._id),
            spotId: e.spotId,
            name: e.name,
            type: e.type,
            sport: e.sport,
            organizer: e.organizerName ?? 'Anonyme',
            participantCount: e.participants.length,
            maxParticipants: e.maxParticipants,
            scheduledAt: e.scheduledAt ? formatDate(e.scheduledAt) : undefined,
            isLive: e.isLive,
            description: e.description,
            isSponsor: e.isSponsor,
            sponsorName: e.sponsorName,
        }));
        res.json(mapped);
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// POST /api/events
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { spotId, spotName, name, type, sport, maxParticipants, scheduledAt, description } = req.body;
        if (!spotId || !name || !sport) {
            res.status(400).json({ error: 'spotId, name et sport requis' });
            return;
        }
        const user = await User_1.default.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: 'Utilisateur introuvable' });
            return;
        }
        const event = await Event_1.default.create({
            spotId,
            spotName,
            name,
            type: type ?? 'manual',
            sport,
            organizerId: user._id,
            organizerName: user.name,
            participants: [user._id],
            maxParticipants,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            isLive: false,
            description,
        });
        // Points pour avoir créé un event
        await PointTransaction_1.default.create({ userId: user._id, amount: 120, reason: 'eventCreated', eventId: String(event._id), label: name });
        await User_1.default.findByIdAndUpdate(user._id, { $inc: { points: 120 } });
        res.status(201).json(event);
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// POST /api/events/:id/join
router.post('/:id/join', auth_1.requireAuth, async (req, res) => {
    try {
        const event = await Event_1.default.findById(req.params.id);
        if (!event) {
            res.status(404).json({ error: 'Événement introuvable' });
            return;
        }
        const alreadyIn = event.participants.some(p => String(p) === req.userId);
        if (alreadyIn) {
            res.status(409).json({ error: 'Déjà inscrit' });
            return;
        }
        await Event_1.default.findByIdAndUpdate(req.params.id, { $push: { participants: req.userId } });
        await PointTransaction_1.default.create({ userId: req.userId, amount: 30, reason: 'eventJoined', eventId: req.params.id });
        await User_1.default.findByIdAndUpdate(req.userId, { $inc: { points: 30 } });
        res.json({ ok: true });
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
function formatDate(d) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const h = d.getHours();
    const m = d.getMinutes();
    return `${days[d.getDay()]} ${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}
exports.default = router;
