"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const db_1 = __importDefault(require("./config/db"));
const tokenRoutes_1 = __importDefault(require("./routes/tokenRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const marketPlaceRoutes_1 = __importDefault(require("./routes/marketPlaceRoutes"));
const telegramRoutes_1 = __importDefault(require("./routes/telegramRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const corsOptions = {
    credentials: true,
    origin: ['http://localhost:3000/', "https://pfun.blocktools.ai/"] // Whitelist the domains you want to allow
};
// Connect to MongoDB
(0, db_1.default)();
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.json());
// Routes
app.use('/api/token', tokenRoutes_1.default);
app.use('/api/project', projectRoutes_1.default);
app.use('/api/transaction', transactionRoutes_1.default);
app.use('/api/marketplace', marketPlaceRoutes_1.default);
app.use('/api/telegram', telegramRoutes_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
