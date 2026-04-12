"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = __importDefault(require("./routes/auth"));
const spots_1 = __importDefault(require("./routes/spots"));
const events_1 = __importDefault(require("./routes/events"));
const users_1 = __importDefault(require("./routes/users"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3001;
app.use((0, cors_1.default)({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/spots', spots_1.default);
app.use('/api/events', events_1.default);
app.use('/api/user', users_1.default);
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => {
    console.log('✅ MongoDB connecté');
    app.listen(PORT, () => console.log(`🚀 API YSport → http://localhost:${PORT}`));
})
    .catch(err => {
    console.error('❌ MongoDB erreur:', err);
    process.exit(1);
});
