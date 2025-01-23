"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const TokenSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    logo: { type: String, required: true },
    telegramUrl: { type: String, required: false, default: '' },
    websiteUrl: { type: String, required: false, default: '' },
    twitterUrl: { type: String, required: false, default: '' },
    contractAddress: { type: String, required: true, unique: true, trim: true },
    owner: { type: String, required: true, trim: true },
    isDeployed: { type: Boolean, required: true, default: false },
    mintSecretKey: { type: String, required: false, default: '' },
    keypairType: { type: String, required: false, default: '' },
    deployerSecretKey: { type: String, required: false, default: '' },
    metadataUri: { type: String, required: false, default: '' },
    projectId: { type: String, required: true, unique: true, trim: true },
    initialBuyAmount: { type: Number, required: false, default: 0 },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Token', TokenSchema);
