"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck 
const express_1 = require("express");
const Marketplace_1 = __importDefault(require("../models/Marketplace"));
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const router = (0, express_1.Router)();
// Create a new marketplace entry
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Marketplace route hit');
        const { mintPrivateKey, price, recipientPublicKey } = req.body;
        console.log('Mint private key:', mintPrivateKey);
        console.log('Price:', price);
        console.log('Recipient public key:', recipientPublicKey);
        // Validate required fields
        if (!mintPrivateKey || !price || !recipientPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        const publicKey = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(mintPrivateKey));
        console.log('Public key:', publicKey.publicKey.toBase58());
        // Create new marketplace object
        const newMarketPlace = new Marketplace_1.default({
            mintPrivateKey,
            price,
            recipientPublicKey,
            used: false,
            publicKey: publicKey.publicKey.toBase58()
        });
        // Save to database
        yield newMarketPlace.save();
        res.status(201).json({
            success: true,
            data: newMarketPlace
        });
    }
    catch (error) {
        console.error('Error creating marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
}));
// Update marketplace entry
router.post('/update/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const used = true;
        const updatedMarketplace = yield Marketplace_1.default.findByIdAndUpdate(id, { used }, { new: true, runValidators: true });
        if (!updatedMarketplace) {
            return res.status(404).json({
                success: false,
                error: 'Marketplace entry not found'
            });
        }
        res.status(200).json({
            success: true,
            data: updatedMarketplace
        });
    }
    catch (error) {
        console.error('Error updating marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
}));
// Get all marketplace entries
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const marketplaces = yield Marketplace_1.default.find({ used: false }).select('-mintPrivateKey');
        res.status(200).json({
            success: true,
            data: marketplaces
        });
    }
    catch (error) {
        console.error('Error fetching marketplaces:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
}));
// Get single marketplace entry
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const marketplace = yield Marketplace_1.default.findById(req.params.id).select('-mintPrivateKey');
        if (!marketplace) {
            return res.status(404).json({
                success: false,
                error: 'Marketplace entry not found'
            });
        }
        res.status(200).json({
            success: true,
            data: marketplace
        });
    }
    catch (error) {
        console.error('Error fetching marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
}));
exports.default = router;
