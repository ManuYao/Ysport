"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Review_1 = __importDefault(require("../models/Review"));
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
// ─── Mapping sport ────────────────────────────────────────
const SPORT_MAP = {
    'football': 'foot', 'football - association': 'foot', 'football à 5': 'foot',
    'futsal': 'foot', 'football américain': 'foot',
    'basket-ball': 'basket', 'basketball': 'basket',
    'tennis': 'tennis', 'tennis de table': 'tennis', 'badminton': 'tennis',
    'squash': 'tennis', 'padel': 'tennis',
    'natation de compétition': 'natation', 'natation': 'natation',
    'nage synchronisée': 'natation', 'water-polo': 'natation', 'plongée': 'natation',
    'musculation': 'muscu', 'cross-fit': 'muscu', 'crossfit': 'muscu',
    'fitness': 'muscu', 'boxe française - savate': 'muscu', 'boxe anglaise': 'muscu',
    'gymnastique': 'muscu', 'haltérophilie': 'muscu',
    'yoga': 'yoga', 'arts martiaux': 'yoga', 'karaté': 'yoga',
    'judo': 'yoga', 'taekwondo': 'yoga', 'aïkido': 'yoga',
    'athlétisme': 'running', 'course à pied': 'running', 'running': 'running',
    'cyclisme': 'velo', 'vélo': 'velo', 'vtt': 'velo', 'cyclisme sur route': 'velo',
    'cyclisme sur piste': 'velo',
};
// Mapping OSM leisure/sport → SportId
const OSM_SPORT_MAP = {
    soccer: 'foot', football: 'foot',
    basketball: 'basket',
    tennis: 'tennis', badminton: 'tennis', squash: 'tennis', padel: 'tennis',
    swimming: 'natation', swimming_pool: 'natation',
    fitness: 'muscu', gym: 'muscu', crossfit: 'muscu', multi: 'muscu',
    yoga: 'yoga', martial_arts: 'yoga',
    athletics: 'running', running: 'running',
    cycling: 'velo', bicycle: 'velo',
};
function mapSport(label) {
    const lower = label.toLowerCase().trim();
    for (const key of Object.keys(SPORT_MAP)) {
        if (lower.includes(key))
            return SPORT_MAP[key];
    }
    return 'muscu';
}
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dl = (lat2 - lat1) * Math.PI / 180;
    const dg = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dl / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dg / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
// ─── Source 1 : API Équipements Sportifs data.gouv.fr ─────
async function fetchFromDataES(lat, lng, radius) {
    const where = `distance(geo_point, geom'POINT(${lng} ${lat})', ${radius}km)`;
    const select = 'InsNom,InsAdresse,InsCommune,InsCodePostal,InsIdentifiant,EquLibelleActivite,EquIdentifiant,geo_point,NbEquip,InsAccessibiliteHandicap';
    const apiKey = process.env.DATAGOUV_API_KEY;
    // Essayer d'abord avec la clé, puis sans
    const urls = [
        `https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/pcu-es-equ/records?where=${encodeURIComponent(where)}&select=${encodeURIComponent(select)}&limit=100&apikey=${apiKey}`,
        `https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/pcu-es-equ/records?where=${encodeURIComponent(where)}&select=${encodeURIComponent(select)}&limit=100`,
    ];
    for (const url of urls) {
        try {
            const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!resp.ok)
                continue;
            const data = await resp.json();
            if (Array.isArray(data.results) && data.results.length > 0) {
                console.log(`✅ Data ES: ${data.results.length} records`);
                return data.results;
            }
        }
        catch (e) {
            console.warn('Data ES tentative échouée:', e.message);
        }
    }
    return [];
}
// ─── Source 2 : Overpass API (OpenStreetMap) — fallback ───
async function fetchFromOSM(lat, lng, radius) {
    const radiusM = radius * 1000;
    const query = `
    [out:json][timeout:15];
    (
      node["leisure"~"sports_centre|pitch|swimming_pool|fitness_centre|stadium"](around:${radiusM},${lat},${lng});
      way["leisure"~"sports_centre|pitch|swimming_pool|fitness_centre|stadium"](around:${radiusM},${lat},${lng});
    );
    out center 80;
  `;
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok)
        throw new Error(`Overpass ${resp.status}`);
    const data = await resp.json();
    console.log(`✅ OSM fallback: ${data.elements?.length ?? 0} éléments`);
    return data.elements ?? [];
}
function osmToSpot(el, userLat, userLng) {
    const coordLat = el.lat ?? el.center?.lat;
    const coordLng = el.lon ?? el.center?.lon;
    if (!coordLat || !coordLng)
        return null;
    const tags = el.tags ?? {};
    const name = tags.name ?? tags['name:fr'] ?? 'Terrain sportif';
    const sport = tags.sport ?? tags.leisure ?? 'fitness';
    const sportId = OSM_SPORT_MAP[sport.toLowerCase()] ?? 'muscu';
    const dist = haversine(userLat, userLng, coordLat, coordLng);
    return {
        id: `osm-${el.id}`,
        name,
        type: tags.leisure ?? 'Équipement sportif',
        district: tags['addr:city'] ?? tags['addr:postcode'] ?? 'Lieu',
        coords: { lat: coordLat, lng: coordLng },
        sports: [sportId],
        tags: buildOsmTags(tags),
        free: !tags.fee || tags.fee === 'no',
        rating: 0,
        reviewCount: 0,
        visitCount: 0,
        activeCount: 0,
        distanceKm: Math.round(dist * 10) / 10,
        available: true,
        terrainCount: 1,
        hasLiveActivity: false,
    };
}
function buildOsmTags(tags) {
    const t = [];
    if (tags.indoor === 'yes')
        t.push('Indoor');
    if (tags.lit === 'yes')
        t.push('Éclairé la nuit');
    if (tags.access === 'yes' || tags.access === 'public')
        t.push('Accès public');
    if (tags.fee === 'yes')
        t.push('Payant');
    if (tags.surface)
        t.push(tags.surface);
    return t.slice(0, 4);
}
function dataESToSpots(records, userLat, userLng) {
    const byId = new Map();
    for (const r of records) {
        const key = r.InsIdentifiant ?? `${r.InsNom}-${r.geo_point?.lat}-${r.geo_point?.lon}`;
        if (!key)
            continue;
        if (!byId.has(key))
            byId.set(key, { record: r, sports: new Set() });
        if (r.EquLibelleActivite)
            byId.get(key).sports.add(mapSport(r.EquLibelleActivite));
    }
    return Array.from(byId.values())
        .filter(({ record: r }) => r.geo_point?.lat && r.geo_point?.lon)
        .map(({ record: r, sports }) => {
        const coordLat = r.geo_point.lat;
        const coordLng = r.geo_point.lon;
        const dist = haversine(userLat, userLng, coordLat, coordLng);
        const sportList = Array.from(sports).slice(0, 4);
        const district = r.InsCodePostal ? `${r.InsCommune ?? ''} (${r.InsCodePostal})`.trim() : r.InsCommune ?? 'Lieu';
        const tags = [];
        if (r.InsAccessibiliteHandicap === 'Oui')
            tags.push('Accessible PMR');
        if (r.NbEquip && r.NbEquip > 1)
            tags.push(`${r.NbEquip} terrains`);
        return {
            id: r.InsIdentifiant ?? `spot-${coordLat}-${coordLng}`,
            name: r.InsNom ?? 'Terrain sportif',
            type: r.EquLibelleActivite ?? 'Équipement sportif',
            district,
            coords: { lat: coordLat, lng: coordLng },
            sports: sportList.length > 0 ? sportList : ['muscu'],
            tags,
            free: true,
            rating: 0,
            reviewCount: 0,
            visitCount: 0,
            activeCount: 0,
            distanceKm: Math.round(dist * 10) / 10,
            available: true,
            terrainCount: r.NbEquip ?? 1,
            hasLiveActivity: false,
        };
    })
        .sort((a, b) => a.distanceKm - b.distanceKm);
}
// ─── GET /api/spots?lat=&lng=&radius= ────────────────────
router.get('/', async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseFloat(req.query.radius) || 5;
        if (isNaN(lat) || isNaN(lng)) {
            res.status(400).json({ error: 'lat et lng requis' });
            return;
        }
        console.log(`🔍 Spots autour de (${lat.toFixed(4)}, ${lng.toFixed(4)}) dans ${radius}km`);
        // Essayer Data ES en premier, Overpass en fallback
        let spots = [];
        const dataESRecords = await fetchFromDataES(lat, lng, radius);
        if (dataESRecords.length > 0) {
            spots = dataESToSpots(dataESRecords, lat, lng);
        }
        else {
            console.log('⚠️ Data ES vide → fallback Overpass OSM');
            try {
                const osmElements = await fetchFromOSM(lat, lng, radius);
                spots = osmElements
                    .map(el => osmToSpot(el, lat, lng))
                    .filter((s) => s !== null)
                    .sort((a, b) => a.distanceKm - b.distanceKm);
            }
            catch (osmErr) {
                console.error('Overpass erreur:', osmErr.message);
                res.status(502).json({ error: 'Impossible de charger les terrains (Data ES + Overpass indisponibles)' });
                return;
            }
        }
        res.json(spots);
    }
    catch (err) {
        console.error('spots error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// ─── GET /api/spots/:id/reviews ──────────────────────────
router.get('/:id/reviews', async (req, res) => {
    try {
        const reviews = await Review_1.default.find({ spotId: req.params.id }).sort({ createdAt: -1 }).limit(20);
        res.json(reviews);
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// ─── POST /api/spots/:id/reviews ─────────────────────────
router.post('/:id/reviews', auth_1.requireAuth, async (req, res) => {
    try {
        const { rating, text, sport } = req.body;
        if (!rating || !text) {
            res.status(400).json({ error: 'rating et text requis' });
            return;
        }
        const user = await User_1.default.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: 'Utilisateur introuvable' });
            return;
        }
        const level = user.getLevel();
        const review = await Review_1.default.create({
            spotId: req.params.id, userId: user._id,
            userName: user.name, userInitial: user.initial,
            userLevel: `${level.icon} ${level.name}`,
            rating, text, sport,
        });
        res.status(201).json(review);
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
exports.default = router;
