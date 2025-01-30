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
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios")); // Make sure to install axios: npm install axios
dotenv_1.default.config();
const router = (0, express_1.Router)();
// Add validation for required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
}
if (!process.env.TELEGRAM_CHANNEL_ID) {
    throw new Error('TELEGRAM_CHANNEL_ID is not defined in environment variables');
}
// Initialize the bot with your token
const bot = new node_telegram_bot_api_1.default(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
// Your channel ID (make sure it starts with -100 for private channels)
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
// Add a test route to verify bot functionality
router.get('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Send a test message
        const testMessage = yield bot.sendMessage(CHANNEL_ID, '🔍 Bot Test Message\nIf you see this, the bot is working correctly!');
        res.status(200).json({
            success: true,
            message: 'Test message sent successfully',
            messageId: testMessage.message_id,
            channelId: CHANNEL_ID
        });
    }
    catch (error) {
        console.error('Telegram test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test message',
            error: error instanceof Error ? error.message : 'Unknown error',
            channelId: CHANNEL_ID,
            botToken: `${(_a = process.env.TELEGRAM_BOT_TOKEN) === null || _a === void 0 ? void 0 : _a.slice(0, 5)}...` // Show first 5 chars for debugging
        });
    }
}));
// Helper function to get correct IPFS gateway URL
function getImageUrl(url) {
    if (url.includes('ipfs.io')) {
        // Try alternative IPFS gateways
        const ipfsHash = url.split('/ipfs/')[1];
        return `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`;
        // Alternative gateways if needed:
        // return `https://ipfs.filebase.io/ipfs/${ipfsHash}`;
        // return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    }
    return url;
}
router.post('/send-message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { tokenName, tokenSymbol, description, contractAddress, deployerAddress, solAmount, imageUrl, messageType = 'launch' } = req.body;
        let message = '';
        console.log(imageUrl);
        switch (messageType) {
            case 'launch':
                message = `PUMPFUN MINT BY MINTO \n\n` +
                    `${tokenName} ($${tokenSymbol})\n\n` +
                    `${description ? `${description}\n\n` : ''}` +
                    `💻 Deployer:\n` +
                    `├ ${deployerAddress}\n` +
                    `${solAmount ? `└ ${solAmount} SOL\n\n` : ''}` +
                    `🔍 Links:\n` +
                    `[Solscan](https://solscan.io/token/${contractAddress}) | ` +
                    `[Birdeye](https://birdeye.so/token/${contractAddress}) | ` +
                    `[Photon](https://photon.so/token/${contractAddress})   | ` +
                    `[DEXS](https://dexscreener.com/solana/${contractAddress})\n\n` +
                    `📋 Contract:\n\`${contractAddress}\``;
                break;
        }
        // Create inline keyboard with trading buttons inside the route handler
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: "⚡ Photon",
                        url: `https://photon-sol.tinyastro.io/en/r/@Minto/${contractAddress}`
                    },
                    {
                        text: "🐕 BONKbot",
                        url: "https://t.me/bonkbot_bot?start=ref_9nwue"
                    }
                ],
                [
                    {
                        text: "🤖 Solana Trading Bot",
                        url: `https://t.me/SolanaTradingBot?start=H0w3SX6iO`
                    },
                    {
                        text: "⚡️ GMGN SOL BOT",
                        url: "https://t.me/GMGN_sol_bot?start=i_R4HumTUu"
                    }
                ]
            ]
        };
        if (imageUrl) {
            try {
                const processedImageUrl = getImageUrl(imageUrl);
                const imageResponse = yield axios_1.default.get(processedImageUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                    },
                    timeout: 10000,
                });
                if ((_a = imageResponse.headers['content-type']) === null || _a === void 0 ? void 0 : _a.includes('image')) {
                    // Send photo with caption and inline keyboard
                    const sentMessage = yield bot.sendPhoto(CHANNEL_ID, Buffer.from(imageResponse.data), {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: JSON.stringify(inlineKeyboard) // Convert to string
                    });
                    res.status(200).json({
                        success: true,
                        message: 'Telegram message with image sent successfully',
                        messageId: sentMessage.message_id
                    });
                }
                else {
                    throw new Error('Invalid image content type');
                }
            }
            catch (imageError) {
                console.error('Error fetching/sending image:', imageError);
                console.log('Falling back to text-only message');
                // Fallback to text-only message with inline keyboard
                const sentMessage = yield bot.sendMessage(CHANNEL_ID, message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    reply_markup: JSON.stringify(inlineKeyboard) // Convert to string
                });
                res.status(200).json({
                    success: true,
                    message: 'Telegram message sent successfully (without image due to error)',
                    messageId: sentMessage.message_id,
                    imageError: imageError instanceof Error ? imageError.message : 'Unknown error'
                });
            }
        }
        else {
            // Send text-only message with inline keyboard
            const sentMessage = yield bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: JSON.stringify(inlineKeyboard) // Convert to string
            });
            res.status(200).json({
                success: true,
                message: 'Telegram message sent successfully',
                messageId: sentMessage.message_id
            });
        }
    }
    catch (error) {
        console.error('Error sending telegram message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send telegram message',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// ... rest of your routes ...
// Make sure to export the router
exports.default = router;
