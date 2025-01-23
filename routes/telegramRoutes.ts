// @ts-nocheck 
import { Router, Request, Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios'; // Make sure to install axios: npm install axios

dotenv.config();

const router = Router();

// Add validation for required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
}

if (!process.env.TELEGRAM_CHANNEL_ID) {
    throw new Error('TELEGRAM_CHANNEL_ID is not defined in environment variables');
}

// Initialize the bot with your token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Your channel ID (make sure it starts with -100 for private channels)
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

// Add a test route to verify bot functionality
router.get('/test', async (req: Request, res: Response) => {
    try {
        // Send a test message
        const testMessage = await bot.sendMessage(
            CHANNEL_ID,
            '🔍 Bot Test Message\nIf you see this, the bot is working correctly!'
        );

        res.status(200).json({
            success: true,
            message: 'Test message sent successfully',
            messageId: testMessage.message_id,
            channelId: CHANNEL_ID
        });
    } catch (error) {
        console.error('Telegram test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test message',
            error: error instanceof Error ? error.message : 'Unknown error',
            channelId: CHANNEL_ID,
            botToken: `${process.env.TELEGRAM_BOT_TOKEN?.slice(0, 5)}...` // Show first 5 chars for debugging
        });
    }
});

// Helper function to get correct IPFS gateway URL
function getImageUrl(url: string): string {
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

router.post('/send-message', async (req: Request, res: Response) => {
    try {
        const { 
            tokenName,
            tokenSymbol,
            description,
            contractAddress,
            deployerAddress,
            solAmount,
            imageUrl,
            messageType = 'launch'
        } = req.body;

        let message = '';
        
        switch(messageType) {
            case 'launch':
                message = `${tokenName} ($${tokenSymbol})\n\n` +
                         `${description ? `${description}\n\n` : ''}` +
                         `💻 Deployer:\n` +
                         `├ ${deployerAddress}\n` +
                         `└ ${solAmount} SOL\n\n` +
                         `🔍 Links:\n` +
                         `[Solscan](https://solscan.io/token/${contractAddress}) | ` +
                         `[Birdeye](https://birdeye.so/token/${contractAddress}) | ` +
                         `[Photon](https://photon.so/token/${contractAddress})\n\n` +
                         `📋 Contract:\n\`${contractAddress}\``;
                break;
        }

        // Create inline keyboard with trading buttons inside the route handler
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: "⚡ Photon",
                        url: `https://photon-sol.tinyastro.io/en/r/@neilarmsbonk/${contractAddress}`
                    },
                    {
                        text: "🐕 BONKbot",
                        url: "https://t.me/bonkbot_bot"
                    }
                ],
                [
                    {
                        text: "🐂 BullX",
                        url: `https://bullx.io/terminal?chainId=1399811149&address=${contractAddress}&r=V3QQRT7CY9C`
                    },
                    {
                        text: "🐎 Trojan",
                        url: "https://t.me/TrojanSolanaBot"
                    }
                ]
            ]
        };

        if (imageUrl) {
            try {
                const processedImageUrl = getImageUrl(imageUrl);
                const imageResponse = await axios.get(processedImageUrl, {
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

                if (imageResponse.headers['content-type']?.includes('image')) {
                    // Send photo with caption and inline keyboard
                    const sentMessage = await bot.sendPhoto(CHANNEL_ID, Buffer.from(imageResponse.data), {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: JSON.stringify(inlineKeyboard)  // Convert to string
                    });

                    res.status(200).json({
                        success: true,
                        message: 'Telegram message with image sent successfully',
                        messageId: sentMessage.message_id
                    });
                } else {
                    throw new Error('Invalid image content type');
                }
            } catch (imageError) {
                console.error('Error fetching/sending image:', imageError);
                console.log('Falling back to text-only message');
                
                // Fallback to text-only message with inline keyboard
                const sentMessage = await bot.sendMessage(CHANNEL_ID, message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    reply_markup: JSON.stringify(inlineKeyboard)  // Convert to string
                });

                res.status(200).json({
                    success: true,
                    message: 'Telegram message sent successfully (without image due to error)',
                    messageId: sentMessage.message_id,
                    imageError: imageError instanceof Error ? imageError.message : 'Unknown error'
                });
            }
        } else {
            // Send text-only message with inline keyboard
            const sentMessage = await bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: JSON.stringify(inlineKeyboard)  // Convert to string
            });

            res.status(200).json({
                success: true,
                message: 'Telegram message sent successfully',
                messageId: sentMessage.message_id
            });
        }

    } catch (error) {
        console.error('Error sending telegram message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send telegram message',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ... rest of your routes ...

// Make sure to export the router
export default router;

