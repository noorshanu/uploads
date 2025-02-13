// @ts-nocheck 
import { Router, Request, Response } from 'express';
import Marketplace from '../models/Marketplace';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const router = Router();

// Create a new marketplace entry
router.post('/', async (req: Request, res: Response) => {
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

        const publicKey = Keypair.fromSecretKey(bs58.decode(mintPrivateKey));
        console.log('Public key:', publicKey.publicKey.toBase58());

        // Create new marketplace object
        const newMarketPlace = new Marketplace({
            mintPrivateKey,
            price,
            recipientPublicKey,
            used: false,
            publicKey: publicKey.publicKey.toBase58()
        });

        // Save to database
        await newMarketPlace.save();

        res.status(201).json({
            success: true,
            data: newMarketPlace
        });
    } catch (error) {
        console.error('Error creating marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// Update marketplace entry
router.post('/update/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const used = true;

        const updatedMarketplace = await Marketplace.findByIdAndUpdate(
            id,
            { used },
            { new: true, runValidators: true }
        );

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
    } catch (error) {
        console.error('Error updating marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// Get all marketplace entries
router.get('/', async (req: Request, res: Response) => {
    try {
        const marketplaces = await Marketplace.find({ used: false }).select('-mintPrivateKey');
        res.status(200).json({
            success: true,
            data: marketplaces
        });
    } catch (error) {
        console.error('Error fetching marketplaces:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// Get single marketplace entry
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const marketplace = await Marketplace.findById(req.params.id).select('-mintPrivateKey');
        
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
    } catch (error) {
        console.error('Error fetching marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

export default router;
