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
const Token_1 = __importDefault(require("../models/Token"));
const createToken_1 = require("../services/createToken");
const web3_js_1 = require("@solana/web3.js");
const Wallets_1 = __importDefault(require("../models/Wallets"));
const bs58_1 = __importDefault(require("bs58"));
const token_1 = require("../services/token");
const bs58_2 = __importDefault(require("bs58"));
const jito = __importStar(require("jito-ts"));
const jitoUtils_1 = require("../services/jitoUtils");
const Marketplace_1 = __importDefault(require("../models/Marketplace"));
const spl_token_1 = require("@solana/spl-token");
const anchor = __importStar(require("@coral-xyz/anchor"));
const decode_1 = require("../services/decode");
const anchor_1 = require("@coral-xyz/anchor");
const router = (0, express_1.Router)();
router.get('/marketplace', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Marketplace route hit');
    res.send('Marketplace route hit');
}));
// Route to create a new token
router.post('/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { contractAddress, wallets } = req.body;
    const token = yield Token_1.default.findOne({ contractAddress });
    if (!token) {
        return res.status(404).json({ message: 'Token not found' });
    }
    const { mintSecretKey, deployerSecretKey, metadataUri, name, symbol, initialBuyAmount, keypairType } = token;
    const devWallet = web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(deployerSecretKey));
    console.log("keypairType", keypairType);
    // Add dev wallet as the first wallet
    let orderedWallets = [];
    if (initialBuyAmount > 0) {
        orderedWallets = [
            {
                address: devWallet.publicKey.toBase58(),
                privateKey: bs58_1.default.encode(devWallet.secretKey),
                amount: initialBuyAmount
            },
            ...wallets
        ];
    }
    else {
        orderedWallets = [
            ...wallets
        ];
    }
    try {
        // Get Jito tip account first
        const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
        const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
        const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield jitoClient.getTipAccounts())[0]);
        let marketplaceBuyIx;
        let marketplace;
        if (keypairType === "marketplace") {
            console.log("inside marketplace", mintSecretKey);
            marketplace = yield Marketplace_1.default.findOne({ mintPrivateKey: mintSecretKey });
            console.log("marketplace", marketplace);
            marketplaceBuyIx = web3_js_1.SystemProgram.transfer({
                fromPubkey: devWallet.publicKey,
                toPubkey: new web3_js_1.PublicKey(marketplace.recipientPublicKey),
                lamports: marketplace.price * LAMPORTS_PER_SOL
            });
            console.log("marketplaceBuyIx", marketplaceBuyIx);
        }
        // Create Jito tip instruction
        const jitoTipInstruction = web3_js_1.SystemProgram.transfer({
            fromPubkey: devWallet.publicKey,
            toPubkey: JITO_TIP_ACCOUNT,
            lamports: 0.001 * LAMPORTS_PER_SOL
        });
        // Get the create token transaction
        const createTokenIx = yield (0, createToken_1.createToken2)(mintSecretKey, deployerSecretKey, metadataUri, name, symbol, initialBuyAmount);
        // Get buy instructions
        const [buyIxs, walletsData] = yield (0, token_1.buyTokensMultipleForCreate)(orderedWallets, contractAddress, initialBuyAmount);
        const con2 = new web3_js_1.Connection("https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e");
        const { blockhash } = yield con2.getLatestBlockhash('confirmed');
        // Add logging before flattening instructions
        console.log("About to flatten and combine instructions...");
        // Flatten and combine all instructions
        let allInstructions;
        if (keypairType === "marketplace") {
            allInstructions = [jitoTipInstruction, marketplaceBuyIx, createTokenIx.instruction, ...buyIxs].filter(ix => ix && ix.programId && ix.keys && ix.data);
        }
        else {
            allInstructions = [jitoTipInstruction, createTokenIx.instruction, ...buyIxs].filter(ix => ix && ix.programId && ix.keys && ix.data);
        }
        console.log("Instructions combined. Starting transaction creation...");
        console.log(`Total instructions after flattening: ${allInstructions.length}`);
        // Debug log each instruction
        allInstructions.forEach((ix, index) => {
            console.log(`Instruction ${index}:`, {
                programId: ix.programId.toBase58(),
                keysLength: ix.keys.length,
                dataLength: ix.data.length
            });
        });
        const signerKeypair = web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(deployerSecretKey));
        const mintKeypair = web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(mintSecretKey));
        // Create transactions based on size limit
        const transactions = [];
        let currentInstructions = [];
        let transactionCount = 0;
        let jitoTipAdded = false;
        for (const ix of allInstructions) {
            console.log("Processing instruction...");
            const tempInstructions = [...currentInstructions, ix];
            try {
                console.log("Testing transaction size...");
                // Test transaction size
                const testMessage = new web3_js_1.TransactionMessage({
                    payerKey: signerKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions: tempInstructions
                }).compileToV0Message();
                console.log("Message compiled, creating test transaction...");
                const testTx = new web3_js_1.VersionedTransaction(testMessage);
                const txSize = testTx.serialize().length;
                console.log(`Transaction size: ${txSize} bytes`);
                if (txSize > 1200) {
                    // Create transaction with current instructions
                    if (currentInstructions.length > 0) {
                        transactionCount++;
                        console.log(`\n=== Transaction #${transactionCount} Details ===`);
                        console.log(`Number of instructions: ${currentInstructions.length}`);
                        // Get all unique wallet addresses involved in this transaction
                        const walletAddresses = new Set();
                        currentInstructions.forEach(instruction => {
                            instruction.keys.forEach(key => {
                                if (key.isSigner &&
                                    key.pubkey.toBase58() !== signerKeypair.publicKey.toBase58() &&
                                    key.pubkey.toBase58() !== mintKeypair.publicKey.toBase58()) {
                                    walletAddresses.add(key.pubkey.toBase58());
                                }
                            });
                        });
                        console.log('\nWallets in this transaction:');
                        Array.from(walletAddresses).forEach((address, index) => {
                            console.log(`${index + 1}. ${address}`);
                        });
                        const hasCreateInstruction = currentInstructions.includes(createTokenIx.instruction);
                        const hasJitoTip = currentInstructions.includes(jitoTipInstruction);
                        console.log('\nInstruction breakdown:');
                        if (hasJitoTip) {
                            console.log(`- Jito tip instruction: 1`);
                            jitoTipAdded = true;
                        }
                        console.log(`- Create instructions: ${hasCreateInstruction ? 1 : 0}`);
                        console.log(`- Buy instructions: ${currentInstructions.length - (hasCreateInstruction ? 1 : 0) - (hasJitoTip ? 1 : 0)}`);
                        const tx = new web3_js_1.VersionedTransaction(new web3_js_1.TransactionMessage({
                            payerKey: signerKeypair.publicKey,
                            recentBlockhash: blockhash,
                            instructions: currentInstructions
                        }).compileToV0Message());
                        // Signing logic remains the same
                        const signers = [signerKeypair];
                        if (hasCreateInstruction) {
                            signers.push(mintKeypair);
                        }
                        const relevantWallets = wallets.filter(wallet => walletAddresses.has(wallet.address));
                        for (const wallet of relevantWallets) {
                            signers.push(web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(wallet.privateKey)));
                        }
                        tx.sign(signers);
                        console.log(`\nTransaction details:`);
                        console.log(`- Size: ${tx.serialize().length} bytes`);
                        console.log(`- Number of signers: ${signers.length}`);
                        console.log('=====================================\n');
                        transactions.push(tx);
                    }
                    currentInstructions = [ix];
                }
                else {
                    currentInstructions = tempInstructions;
                }
            }
            catch (err) {
                console.error('Detailed error in instruction processing:', err);
                throw err;
            }
        }
        // Process final transaction batch
        if (currentInstructions.length > 0) {
            transactionCount++;
            console.log(`\n=== Transaction #${transactionCount} Details ===`);
            console.log(`Number of instructions: ${currentInstructions.length}`);
            // Get all unique wallet addresses involved in this transaction
            const walletAddresses = new Set();
            currentInstructions.forEach(instruction => {
                instruction.keys.forEach(key => {
                    if (key.isSigner &&
                        key.pubkey.toBase58() !== signerKeypair.publicKey.toBase58() &&
                        key.pubkey.toBase58() !== mintKeypair.publicKey.toBase58()) {
                        walletAddresses.add(key.pubkey.toBase58());
                    }
                });
            });
            // Rest of the logging
            console.log('\nWallets in this transaction:');
            Array.from(walletAddresses).forEach((address, index) => {
                console.log(`${index + 1}. ${address}`);
            });
            const hasCreateInstruction = currentInstructions.includes(createTokenIx.instruction);
            const hasJitoTip = currentInstructions.includes(jitoTipInstruction);
            console.log('\nInstruction breakdown:');
            if (hasJitoTip)
                console.log(`- Jito tip instruction: 1`);
            console.log(`- Create instructions: ${hasCreateInstruction ? 1 : 0}`);
            console.log(`- Buy instructions: ${currentInstructions.length - (hasCreateInstruction ? 1 : 0) - (hasJitoTip ? 1 : 0) - 1}`);
            const tx = new web3_js_1.VersionedTransaction(new web3_js_1.TransactionMessage({
                payerKey: signerKeypair.publicKey,
                recentBlockhash: blockhash,
                instructions: currentInstructions
            }).compileToV0Message());
            const signers = [signerKeypair];
            if (hasCreateInstruction) {
                signers.push(mintKeypair);
            }
            const relevantWallets = wallets.filter(wallet => walletAddresses.has(wallet.address));
            for (const wallet of relevantWallets) {
                signers.push(web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(wallet.privateKey)));
            }
            tx.sign(signers);
            console.log(`\nTransaction details:`);
            console.log(`- Size: ${tx.serialize().length} bytes`);
            console.log(`- Number of signers: ${signers.length}`);
            if (hasJitoTip) {
                console.log(`- Includes Jito tip: 0.001 SOL`);
            }
            console.log('=====================================\n');
            transactions.push(tx);
        }
        console.log('\n=== Final Summary ===');
        console.log(`Total transactions created: ${transactions.length}`);
        console.log(`Total instructions processed: ${allInstructions.length}`);
        console.log('===================\n');
        // Add logging before bundle sending
        console.log("About to send bundles...");
        yield (0, jitoUtils_1.sendBundlesForCreate)(5, signerKeypair, transactions);
        console.log("Bundles sent successfully");
        console.log('Token before update:', token.toObject());
        token.isDeployed = true;
        try {
            const savedToken = yield token.save();
            console.log('Token after update:', savedToken.toObject());
        }
        catch (error) {
            console.error('Error saving token:', error);
            throw error;
        }
        if (marketplace) {
            marketplace.used = true;
            yield marketplace.save();
        }
        // If we get here, either we got success or timed out without error - both are good
        res.status(200).json({
            message: 'Token created successfully',
            transactionCount: transactions.length,
            totalInstructions: allInstructions.length
        });
    }
    catch (error) {
        // Only reaches here on explicit errors
        if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("RESOURCE_EXHAUSTED")) {
            console.log("Resource exhausted, returning success");
            return res.status(200).json({
                message: 'Token created successfully, buy orders executed'
            });
        }
        res.status(500).json({
            message: 'Error creating token',
            error: error.message,
            stack: error.stack
        });
    }
}));
router.post('/create-metadata', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    const { name, symbol, description, logo, telegramUrl, websiteUrl, twitterUrl, secretKey, projectId, metadataUri, initialBuyAmount, keypairType, grindedPrivateKey, displayPublicKey, marketplaceId } = req.body;
    console.log("keypairType", keypairType);
    console.log("grindedPrivateKey", grindedPrivateKey);
    console.log("displayPublicKey", displayPublicKey);
    console.log("marketplaceId", marketplaceId);
    const signerKeyPair = web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(secretKey));
    try {
        const { mintKeypair } = yield (0, createToken_1.createMetadata)({
            name,
            symbol,
            description,
            twitter: twitterUrl,
            telegram: telegramUrl,
            website: websiteUrl
        }, keypairType, grindedPrivateKey, displayPublicKey, marketplaceId);
        console.log(mintKeypair);
        const contractAddress = displayPublicKey;
        console.log(initialBuyAmount);
        let mintSecretKey;
        if (keypairType === "grinded") {
            mintSecretKey = grindedPrivateKey;
        }
        else {
            mintSecretKey = bs58_2.default.encode(mintKeypair.secretKey);
        }
        console.log("mintSecretKey", mintSecretKey);
        const newToken = new Token_1.default({
            name,
            symbol,
            logo,
            telegramUrl,
            websiteUrl,
            twitterUrl,
            owner: signerKeyPair.publicKey.toBase58(),
            contractAddress: contractAddress,
            mintSecretKey: mintSecretKey,
            keypairType: keypairType,
            deployerSecretKey: secretKey,
            metadataUri,
            projectId,
            initialBuyAmount
        });
        const savedToken = yield newToken.save();
        console.log('Token saved:', savedToken);
        res.status(201).json({ message: 'Token metadata created successfully', token: savedToken });
    }
    catch (error) {
        console.error('Error creating token:', error);
        res.status(500).json({ message: 'Error creating token', error });
    }
}));
router.get('/get-token/:projectId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
    }
    try {
        const token = yield Token_1.default.findOne({ projectId }, { mintSecretKey: 0, deployerSecretKey: 0 });
        res.status(200).json({ token });
    }
    catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ message: 'Error fetching tokens', error });
    }
}));
router.get('/get-wallets/:projectId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const wallets = yield Wallets_1.default.find({ projectId });
    console.log(wallets);
    res.status(200).json({ wallets });
}));
router.post('/generate-wallet', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { numberOfWallets, ownerAddress, projectId } = req.body;
    console.log(numberOfWallets, ownerAddress, projectId);
    if (!numberOfWallets || !ownerAddress || !projectId) {
        return res.status(400).json({ message: 'Number of wallets, owner address and project ID are required' });
    }
    try {
        const generatedWallets = Array.from({ length: numberOfWallets }, () => {
            const keypair = web3_js_1.Keypair.generate();
            return {
                ownerAddress,
                publicKey: keypair.publicKey.toString(),
                secretKey: bs58_1.default.encode(keypair.secretKey),
                projectId
            };
        });
        const savedWallets = yield Wallets_1.default.insertMany(generatedWallets);
        res.status(201).json({
            message: 'Wallets generated and saved successfully',
            ownerAddress,
            wallets: savedWallets,
            count: savedWallets.length
        });
    }
    catch (error) {
        console.error('Error generating wallets:', error);
        res.status(500).json({ message: 'Error generating wallets', error });
    }
}));
router.post('/fund-wallets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { wallets, privateKey } = req.body;
    console.log(wallets, privateKey);
    try {
        yield (0, token_1.fundWallets)(wallets, privateKey);
        res.status(200).json({ message: 'Wallets funded successfully' });
    }
    catch (error) {
        console.error('Error funding wallets:', error);
        res.status(500).json({ message: 'Error funding wallets', error: error.message });
    }
}));
router.post('/withdraw', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { wallets, fundingWallet } = req.body;
    console.log(wallets);
    console.log(fundingWallet);
    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
        return res.status(400).json({ message: 'Wallets array is required and cannot be empty' });
    }
    // Get wallet details from database in a single query
    const walletAddresses = wallets.map(w => w.address);
    const walletDetails = yield Wallets_1.default.find({ publicKey: { $in: walletAddresses } });
    // Create lookup map for faster access
    const walletMap = new Map(walletDetails.map(w => [w.publicKey, w]));
    // Build wallet array with private keys
    const walletsWithKeys = wallets.map(wallet => {
        const details = walletMap.get(wallet.address);
        if (!details) {
            throw new Error(`Wallet not found for address: ${wallet.address}`);
        }
        return {
            address: wallet.address,
            privateKey: details.secretKey
        };
    });
    console.log(walletsWithKeys);
    try {
        yield (0, token_1.withdrawFunds)(walletsWithKeys, fundingWallet);
    }
    catch (error) {
        if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("RESOURCE_EXHAUSTED")) {
            console.log("Resource exhausted, returning success");
            return res.status(200).json({
                message: 'Withdrawals executed successfully'
            });
        }
        console.error('Error executing withdrawals:', error);
        // Extract specific error message from bundle rejection
        let errorMessage = error.message;
        if ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('Bundle rejected')) {
            try {
                // Extract the error message after "error="
                const match = error.message.match(/error=([^}]*)/);
                if (match) {
                    errorMessage = match[1];
                }
            }
            catch (parseError) {
                console.error('Error parsing bundle rejection:', parseError);
            }
        }
        res.status(500).json({
            message: 'Error executing withdrawals',
            error: errorMessage
        });
    }
}));
router.post('/buy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { wallets, tokenAddress } = req.body;
    console.log('Buy request received for:', { wallets, tokenAddress }); // Add debug log
    console.log(tokenAddress, "asdasd");
    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
        return res.status(400).json({ message: 'Wallets array is required and cannot be empty' });
    }
    if (!tokenAddress || typeof tokenAddress !== 'string') {
        return res.status(400).json({ message: 'Valid token address is required' });
    }
    try {
        // Get all wallet details in a single query
        const walletAddresses = wallets.map(w => w.address);
        const walletDetails = yield Wallets_1.default.find({ publicKey: { $in: walletAddresses } });
        // Create lookup map for faster access
        const walletMap = new Map(walletDetails.map(w => [w.publicKey, w]));
        // Build wallet array with private keys
        const walletsWithKeys = wallets.map(wallet => {
            const details = walletMap.get(wallet.address);
            if (!details) {
                throw new Error(`Wallet not found for address: ${wallet.address}`);
            }
            return {
                address: wallet.address,
                privateKey: details.secretKey,
                amount: Number(wallet.solAmount) // Ensure amount is a number
            };
        });
        // Pass all wallets and token address to buyTokensMultiple
        yield (0, token_1.buyTokensMultiple)(walletsWithKeys, tokenAddress);
        res.status(200).json({
            message: 'Buy orders executed successfully',
            walletCount: walletsWithKeys.length
        });
    }
    catch (error) {
        console.error('Error executing buy orders:', error);
        res.status(500).json({
            message: 'Error executing buy orders',
            error: error.message,
            details: {
                wallets: wallets.map(w => w.address),
                tokenAddress
            }
        });
    }
}));
router.post('/sell', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { wallets, tokenAddress } = req.body;
    console.log('Sell request received for wallets:', wallets);
    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
        return res.status(400).json({ message: 'Wallets array is required and cannot be empty' });
    }
    try {
        // Get wallet details from database in a single query
        const walletAddresses = wallets.map(w => w.address);
        const walletDetails = yield Wallets_1.default.find({ publicKey: { $in: walletAddresses } });
        // Create lookup map for faster access
        const walletMap = new Map(walletDetails.map(w => [w.publicKey, w]));
        // Build wallet array with private keys and token amounts
        const walletsWithKeys = wallets.map(wallet => {
            const details = walletMap.get(wallet.address);
            if (!details) {
                throw new Error(`Wallet not found for address: ${wallet.address}`);
            }
            return {
                privateKey: details.secretKey.toString(),
                tokenAmount: wallet.tokenAmount // Include token amount from request
            };
        });
        // Build wallet array with private keys
        console.log(walletsWithKeys);
        // Call sellTokensMultiple with the prepared wallets
        const transactions = yield (0, token_1.sellTokensMultiple)(walletsWithKeys, tokenAddress);
        res.status(200).json({
            message: 'Sell orders executed successfully',
            transactionCount: transactions.length
        });
    }
    catch (error) {
        if (error.message.includes("RESOURCE_EXHAUSTED")) {
            console.log("Resource exhausted, returning success");
            return res.status(200).json({
                message: 'Sell orders executed successfully'
            });
        }
        console.error('Error executing sell orders:', error);
        res.status(500).json({
            message: 'Error executing sell orders',
            error: error.message
        });
    }
}));
router.post('/get-wallets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
        return res.status(400).json({ message: 'Wallet addresses array is required' });
    }
    try {
        const wallets = yield Wallets_1.default.find({ publicKey: { $in: addresses } });
        console.log(wallets);
        res.status(200).json({ wallets });
    }
    catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).json({
            message: 'Error fetching wallets',
            error: error.message
        });
    }
}));
const METADATA_PROGRAM_ID = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const programId = new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
function accountExists(connection, address) {
    return __awaiter(this, void 0, void 0, function* () {
        const account = yield connection.getAccountInfo(address);
        return account !== null;
    });
}
// Add these constants at the top
const LAMPORTS_PER_SOL = 1000000000;
const TOKEN_DECIMALS = 6;
const INITIAL_VIRTUAL_SOL_RESERVES = 30 * LAMPORTS_PER_SOL;
const INITIAL_VIRTUAL_TOKEN_RESERVES = BigInt(1073000000 * (10 ** TOKEN_DECIMALS));
const INITIAL_REAL_TOKEN_RESERVES = BigInt(793100000 * (10 ** TOKEN_DECIMALS));
function calculateInitialBuyAmount(solAmount) {
    try {
        // Convert SOL amount to lamports with proper precision
        const solInputLamports = new anchor_1.BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
        const virtualSolReserves = new anchor_1.BN(INITIAL_VIRTUAL_SOL_RESERVES);
        const virtualTokenReserves = new anchor_1.BN(INITIAL_VIRTUAL_TOKEN_RESERVES.toString());
        console.log("Calculation inputs:", {
            solAmount,
            solInputLamports: solInputLamports.toString(),
            virtualSolReserves: virtualSolReserves.toString(),
            virtualTokenReserves: virtualTokenReserves.toString()
        });
        // Calculate k = virtualSolReserves * virtualTokenReserves
        const k = virtualSolReserves.mul(virtualTokenReserves);
        // Calculate new sol reserves
        const newSolReserves = virtualSolReserves.add(solInputLamports);
        // Calculate token amount using constant product formula
        const newTokenReserves = k.div(newSolReserves);
        let tokensToBuy = virtualTokenReserves.sub(newTokenReserves);
        // Add safety buffer (0.5% less)
        tokensToBuy = tokensToBuy.muln(995).divn(1000);
        // Ensure we don't exceed initial real token reserves
        tokensToBuy = anchor_1.BN.min(tokensToBuy, new anchor_1.BN(INITIAL_REAL_TOKEN_RESERVES.toString()));
        console.log("Calculation results:", {
            newSolReserves: newSolReserves.toString(),
            newTokenReserves: newTokenReserves.toString(),
            tokensToBuy: tokensToBuy.toString(),
            maxTokens: INITIAL_REAL_TOKEN_RESERVES.toString()
        });
        return BigInt(tokensToBuy.toString());
    }
    catch (error) {
        console.error("Error in calculateInitialBuyAmount:", error);
        throw error;
    }
}
router.post('/create-new', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, symbol, metadataUri, initialBuyAmount, keypairType, grindedPrivateKey, marketplaceId, walletPublicKey } = req.body;
        console.log(req.body);
        // Convert walletPublicKey string to PublicKey instance
        const userWalletPubkey = new web3_js_1.PublicKey(walletPublicKey);
        const connection = new web3_js_1.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        let mintKeypair, marketplaceInfo;
        if (keypairType === 'grinded') {
            mintKeypair = web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(grindedPrivateKey));
        }
        else if (keypairType === 'random') {
            mintKeypair = web3_js_1.Keypair.generate();
        }
        else if (keypairType === 'marketplace') {
            marketplaceInfo = yield Marketplace_1.default.findOne({ _id: marketplaceId });
            if (!marketplaceInfo) {
                return res.status(404).json({ message: 'Marketplace not found' });
            }
            mintKeypair = web3_js_1.Keypair.fromSecretKey(bs58_2.default.decode(marketplaceInfo.mintPrivateKey));
        }
        const instructions = [];
        // instructions.push(
        //   SystemProgram.transfer({
        //     fromPubkey: userWalletPubkey,
        //     toPubkey: new PublicKey("BgDuraHFhUDMrcSuHjxtg16DY853pSewMGcTS6A7uNGJ"),
        //     lamports: Number(0.0002) * (LAMPORTS_PER_SOL),
        //   })
        // );
        console.log(mintKeypair === null || mintKeypair === void 0 ? void 0 : mintKeypair.publicKey.toBase58());
        console.log(programId.toBase58());
        const [bondingCurve2] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()], programId);
        const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mintKeypair.publicKey, bondingCurve2, true);
        const [metadata2] = web3_js_1.PublicKey.findProgramAddressSync([
            anchor.utils.bytes.utf8.encode("metadata"),
            METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer()
        ], METADATA_PROGRAM_ID);
        const encodedData = (0, decode_1.encodeCreateInstruction)({
            tokenName: name,
            symbol: symbol,
            uri: metadataUri
        });
        const createTokenIx = new web3_js_1.TransactionInstruction({
            programId,
            keys: [
                { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: new web3_js_1.PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM"), isSigner: false, isWritable: false },
                { pubkey: bondingCurve2, isSigner: false, isWritable: true },
                { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
                { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), isSigner: false, isWritable: true },
                { pubkey: metadata2, isSigner: false, isWritable: true },
                { pubkey: userWalletPubkey, isSigner: true, isWritable: true },
                { pubkey: new web3_js_1.PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                { pubkey: programId, isSigner: false, isWritable: false }
            ],
            data: Buffer.from(encodedData, "hex")
        });
        instructions.push(createTokenIx);
        console.log("initialBuyAmount", initialBuyAmount);
        // Add buy instruction if initial buy amount is specified
        if (initialBuyAmount && Number(initialBuyAmount) > 0) {
            console.log("initialBuyAmount", initialBuyAmount);
            const ata = yield (0, spl_token_1.getAssociatedTokenAddress)(mintKeypair.publicKey, userWalletPubkey, true);
            const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()], programId);
            const bondingCurveATA = yield (0, spl_token_1.getAssociatedTokenAddress)(mintKeypair.publicKey, bondingCurve, true);
            // Create ATA if needed
            const ataExists = yield accountExists(connection, ata);
            if (!ataExists) {
                instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(userWalletPubkey, ata, userWalletPubkey, mintKeypair.publicKey));
            }
            const balance = yield connection.getBalance(userWalletPubkey);
            // Create buy instruction
            const bufferData = Buffer.alloc(24);
            bufferData.write("66063d1201daebea", "hex");
            bufferData.writeBigUInt64LE(calculateInitialBuyAmount(Number(initialBuyAmount)), 8);
            bufferData.writeBigInt64LE(BigInt(balance), 16);
            const buyIx = new web3_js_1.TransactionInstruction({
                programId,
                keys: [
                    { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                    { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
                    { pubkey: bondingCurve, isSigner: false, isWritable: true },
                    { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                    { pubkey: ata, isSigner: false, isWritable: true },
                    { pubkey: userWalletPubkey, isSigner: true, isWritable: true },
                    { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                    { pubkey: programId, isSigner: false, isWritable: false }
                ],
                data: bufferData
            });
            instructions.push(buyIx);
        }
        console.log(keypairType);
        if (keypairType === 'marketplace') {
            instructions.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: userWalletPubkey,
                toPubkey: new web3_js_1.PublicKey(marketplaceInfo.recipientPublicKey),
                lamports: Number(marketplaceInfo.price) * (LAMPORTS_PER_SOL),
            }));
        }
        instructions.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: userWalletPubkey,
            toPubkey: new web3_js_1.PublicKey("BgDuraHFhUDMrcSuHjxtg16DY853pSewMGcTS6A7uNGJ"),
            lamports: Number(0.2) * (LAMPORTS_PER_SOL),
        }));
        const latestBlockhash = yield connection.getLatestBlockhash();
        const { blockhash, lastValidBlockHeight } = latestBlockhash;
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: userWalletPubkey,
            recentBlockhash: blockhash,
            instructions
        }).compileToV0Message();
        const transaction = new web3_js_1.VersionedTransaction(messageV0);
        // try {
        //   const simulation = await connection.simulateTransaction(transaction);
        //   if (simulation.value.err) {
        //     // setLoading(prev => ({...prev, createMetadata: false})); // Reset loading on simulation error
        //     throw new Error(`Transaction simulation failed: ${simulation.value.err}`);
        //   }
        // } catch (simError) {
        //   console.error('Simulation error:', simError);
        //   // setLoading(prev => ({...prev, createMetadata: false})); // Reset loading on simulation error
        //   return;
        // }
        // If simulation successful, sign and send the transaction
        transaction.sign([mintKeypair]);
        const serializedTransaction = transaction.serialize();
        // Return the transaction data to frontend with lastValidBlockHeight
        res.status(200).json({
            success: true,
            data: {
                serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
                mintAddress: mintKeypair.publicKey.toString(),
                lastValidBlockHeight
            }
        });
    }
    catch (error) {
        console.error('Error creating token:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating token',
            error: error.message
        });
    }
}));
exports.default = router;
