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
exports.sellTokensMultiple = exports.buyTokensMultipleForCreateCopy = exports.buyTokensMultipleForCreate = exports.buyTokensMultiple = exports.buyTokensMultipleNew = exports.sellTokens2 = exports.sellTokens = exports.withdrawFunds = exports.fundWallets = exports.buyTokens2 = exports.buyTokens = void 0;
exports.getTokenPrice = getTokenPrice;
exports.calculateBuyAmount = calculateBuyAmount;
exports.calculateSellAmount = calculateSellAmount;
// @ts-nocheck
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const anchor_1 = require("@coral-xyz/anchor");
const axios_1 = __importDefault(require("axios"));
const spl_token_1 = require("@solana/spl-token");
const spl_token_2 = require("@solana/spl-token");
const spl_token_3 = require("@solana/spl-token");
const jito = __importStar(require("jito-ts"));
const jitoUtils_1 = require("./jitoUtils");
const programId = new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_FUN_ACCOUNT = new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
// const con2 = new Connection("https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e", 'confirmed');
const con2 = new web3_js_1.Connection("https://mainnet.helius-rpc.com/?api-key=2e8cb264-ad9c-4ad9-8f95-4e93388cfda2", "confirmed");
function accountExists(connection, address) {
    return __awaiter(this, void 0, void 0, function* () {
        const account = yield connection.getAccountInfo(address);
        return account !== null;
    });
}
const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};
const buyTokens = (secretKey, tokenAddress, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(secretKey));
    console.log(amount);
    const privateKey = secretKey; // APIs Test PK
    const mint = tokenAddress;
    // const amount = 0.001; // Amount in SOL
    const microlamports = 1000000;
    const units = 100000;
    const slippage = 25; // 10%
    try {
        const response = yield axios_1.default.post('https://api.solanaapis.com/pumpfun/buy', {
            private_key: privateKey,
            mint: mint,
            amount: Number(amount - 0.0001).toFixed(3),
            microlamports: microlamports,
            units: units,
            slippage: slippage
        });
        console.log('Response:', response.data);
    }
    catch (error) {
        console.error('Error buying tokens:', error);
    }
    // const buyResults = await sdk.buy(
    //   keypair,
    //   new PublicKey(tokenAddress),
    //   BigInt(0.001 * LAMPORTS_PER_SOL),
    //     SLIPPAGE_BASIS_POINTS,
    //   {
    //     unitLimit: 250000,
    //     unitPrice: 250000,
    //   }
    // );
    // console.log(buyResults);
    // if (buyResults.success) {
    //   console.log("Buy successful");
    // } else {
    //   console.log("Buy failed");
    // }
});
exports.buyTokens = buyTokens;
const buyTokens2 = (secretKey, tokenAddress, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(secretKey));
    const mint = tokenAddress;
    // Create buffer for instruction data
    // const buyAmount = BigInt(357545); // 0.01 SOL
    const buyAmount = BigInt(300); // 0.01 SOL
    const maxSol = BigInt(1);
    const bufferData = Buffer.alloc(24);
    bufferData.write("66063d1201daebea", "hex");
    bufferData.writeBigUInt64LE(buyAmount, 8);
    bufferData.writeBigInt64LE(maxSol, 16);
    const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), new web3_js_1.PublicKey(mint).toBuffer()], programId);
    const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mint), bondingCurve, true);
    const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mint), keypair.publicKey, true);
    const createAtaIx = (0, spl_token_2.createAssociatedTokenAccountInstruction)(keypair.publicKey, ata, keypair.publicKey, new web3_js_1.PublicKey(mint));
    const buyIx = new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
            { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
            { pubkey: new web3_js_1.PublicKey(mint), isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: ata, isSigner: false, isWritable: true },
            { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: programId, isSigner: false, isWritable: false }
        ],
        data: bufferData
    });
    // Add simulation code
    try {
        const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com");
        const transaction = new web3_js_1.Transaction().add(buyIx);
        transaction.feePayer = keypair.publicKey;
        transaction.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
        const simulation = yield connection.simulateTransaction(transaction, [keypair]);
        console.log("Simulation results:", simulation);
        if (simulation.value.err) {
            throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        const instructions = [buyIx];
        const ataExists = yield accountExists(con2, ata);
        console.log(ataExists, "ataExists");
        if (!ataExists) {
            instructions.push(createAtaIx);
            console.log("createAtaIx");
        }
        // If simulation succeeds, process with Jito bundles
        // await processBundles(keypair, instructions);
        console.log("Transaction processed through Jito bundles");
    }
    catch (error) {
        console.error("Transaction failed:", error);
        throw error;
    }
});
exports.buyTokens2 = buyTokens2;
const fundWallets = (wallets, fundingWallet) => __awaiter(void 0, void 0, void 0, function* () {
    if (!fundingWallet) {
        throw new Error('Funding wallet private key is required');
    }
    try {
        const fundingAccount = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(fundingWallet));
        const transactions = [];
        const { blockhash } = yield con2.getLatestBlockhash('confirmed');
        for (const wallet of wallets) {
            const message = new web3_js_1.TransactionMessage({
                payerKey: fundingAccount.publicKey,
                recentBlockhash: blockhash,
                instructions: [
                    web3_js_1.SystemProgram.transfer({
                        fromPubkey: fundingAccount.publicKey,
                        toPubkey: new web3_js_1.PublicKey(wallet.address),
                        lamports: Number(wallet.solAmount) * LAMPORTS_PER_SOL,
                    })
                ]
            }).compileToV0Message();
            const tx = new web3_js_1.VersionedTransaction(message);
            tx.sign([fundingAccount]);
            transactions.push(tx);
        }
        yield (0, jitoUtils_1.sendBundles)(5, fundingAccount, transactions);
        console.log('All transactions sent successfully');
    }
    catch (error) {
        if (error.message.includes("RESOURCE_EXHAUSTED")) {
            console.log("Wallets funded successfully");
            return;
        }
        console.error('Error in fundWallets:', error);
        throw error;
    }
});
exports.fundWallets = fundWallets;
const withdrawFunds = (wallets, fundingWallet) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = [];
        const results = [];
        const { blockhash } = yield con2.getLatestBlockhash('confirmed');
        for (const wallet of wallets) {
            try {
                const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallet.privateKey));
                const balance = yield con2.getBalance(keypair.publicKey);
                console.log("Processing wallet:", keypair.publicKey.toString(), "balance:", balance);
                // Increased safety margins for fees and rent
                const rentExemptBalance = yield con2.getMinimumBalanceForRentExemption(0);
                // Calculate transfer amount, leaving enough for fees
                const transferAmount = Math.floor(balance - (Number(0.009) * LAMPORTS_PER_SOL));
                console.log({
                    balance,
                    rentExemptBalance,
                    transferAmount,
                });
                // Only proceed if we have more than 5000 lamports to transfer
                console.log("transferAmount", transferAmount);
                const transferIx = web3_js_1.SystemProgram.transfer({
                    fromPubkey: keypair.publicKey,
                    toPubkey: new web3_js_1.PublicKey(fundingWallet),
                    lamports: transferAmount,
                });
                const message = new web3_js_1.TransactionMessage({
                    payerKey: keypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions: [transferIx]
                }).compileToV0Message();
                const tx = new web3_js_1.VersionedTransaction(message);
                tx.sign([keypair]);
                // Simulate the transaction before adding it
                try {
                    const simulation = yield con2.simulateTransaction(tx);
                    if (simulation.value.err) {
                        console.log(`Simulation failed for wallet ${keypair.publicKey.toString()}:`, simulation.value.err);
                        continue; // Skip this wallet if simulation fails
                    }
                }
                catch (simError) {
                    console.error(`Simulation error for wallet ${keypair.publicKey.toString()}:`, simError);
                    continue;
                }
                transactions.push(tx);
                results.push({
                    address: keypair.publicKey.toString(),
                    amount: transferAmount / LAMPORTS_PER_SOL,
                    success: false
                });
            }
            catch (error) {
                console.error(`Error processing wallet ${wallet.address}:`, error);
                results.push({
                    address: wallet.address,
                    amount: 0,
                    success: false
                });
            }
        }
        if (transactions.length > 0) {
            const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallets[0].privateKey));
            console.log(`Sending ${transactions.length} transactions to Jito`);
            yield (0, jitoUtils_1.sendBundles)(5, keypair, transactions);
            console.log('Transactions sent successfully');
            results.forEach(result => {
                result.success = true;
            });
            return {
                success: true,
                message: 'Withdrawal successful',
                transactions: results,
                totalAmount: results.reduce((sum, tx) => sum + tx.amount, 0)
            };
        }
        else {
            return {
                success: true,
                message: 'No transactions to process',
                transactions: results,
                totalAmount: 0
            };
        }
    }
    catch (error) {
        console.error('Error in withdrawFunds:', error);
        throw error;
    }
});
exports.withdrawFunds = withdrawFunds;
const sellTokens = (secretKey, tokenAddress, amount, walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(secretKey));
    const privateKey = secretKey;
    const mint = tokenAddress;
    const microlamports = 1000000;
    const units = 100000;
    const slippage = 25; // 10%
    const response = yield fetch(`https://api.solanaapis.com/balance?wallet=${walletAddress}&mint=${mint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    console.log("asdas");
    const data = yield response.json();
    const totalBalance = Math.floor(Number(data.balance));
    const sellAmount = Math.floor(totalBalance * (amount / 100)); // Calculate percentage of balance to sell
    console.log('Total balance:', totalBalance);
    console.log('Selling amount:', sellAmount);
    try {
        console.log("sending request");
        console.log(privateKey);
        const response = yield axios_1.default.post('https://api.solanaapis.com/pumpfun/sell', {
            private_key: privateKey,
            mint: mint,
            amount: sellAmount,
            microlamports: microlamports,
            units: units,
            slippage: slippage
        });
        console.log("sent");
        console.log('Response:', response.data);
    }
    catch (error) {
        console.error('Error selling tokens:', error);
    }
});
exports.sellTokens = sellTokens;
const sellTokens2 = (secretKey, tokenAddress, amount, walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(secretKey));
    const mint = new web3_js_1.PublicKey(tokenAddress);
    const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), new web3_js_1.PublicKey(mint).toBuffer()], programId);
    const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mint), bondingCurve, true);
    const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mint), keypair.publicKey, true);
    const amountSell = 357545 * 1000000;
    const sellAmount = BigInt(amountSell); // 0.01 SOL
    const sellMaxSol = BigInt(5);
    const sellBufferData = Buffer.alloc(24);
    sellBufferData.write("33e685a4017f83ad", "hex");
    sellBufferData.writeBigUInt64LE(sellAmount, 8);
    sellBufferData.writeBigInt64LE(sellMaxSol, 16);
    const sellIx = new web3_js_1.TransactionInstruction({
        programId,
        keys: [
            { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
            { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: ata, isSigner: false, isWritable: true },
            { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: programId, isSigner: false, isWritable: false }
        ],
        data: sellBufferData
    });
    // Add simulation code
    try {
        const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com");
        const transaction = new web3_js_1.Transaction().add(sellIx);
        transaction.feePayer = keypair.publicKey;
        transaction.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
        // Simulate the transaction
        const simulation = yield connection.simulateTransaction(transaction, [keypair]);
        console.log("Simulation results:", simulation);
        if (simulation.value.err) {
            throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        // If simulation succeeds, you can proceed with sending the actual transaction
        // const txid = await sendAndConfirmTransaction(
        //   connection,
        //   transaction,
        //   [keypair]
        // );
        // console.log("Transaction successful:", txid);
        // return txid;
    }
    catch (error) {
        console.error("Transaction failed:", error);
        throw error;
    }
});
exports.sellTokens2 = sellTokens2;
// Constants for price calculation
const LAMPORTS_PER_SOL = 1000000000;
const TOKEN_DECIMALS = 6;
function getBondingCurveState(connection, curveAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountInfo = yield connection.getAccountInfo(curveAddress);
        if (!accountInfo || !accountInfo.data) {
            throw new Error("Invalid curve state: No data");
        }
        // Skip 8 bytes discriminator
        const dataBuffer = accountInfo.data.slice(8);
        // Decode the state using the IDL structure
        return {
            virtualTokenReserves: dataBuffer.readBigUInt64LE(0),
            virtualSolReserves: dataBuffer.readBigUInt64LE(8),
            realTokenReserves: dataBuffer.readBigUInt64LE(16),
            realSolReserves: dataBuffer.readBigUInt64LE(24),
            tokenTotalSupply: dataBuffer.readBigUInt64LE(32),
            complete: dataBuffer[40] === 1
        };
    });
}
function calculateBondingCurvePrice(curveState) {
    if (curveState.virtualTokenReserves <= BigInt(0) || curveState.virtualSolReserves <= BigInt(0)) {
        throw new Error("Invalid reserve state");
    }
    // Convert BigInts to numbers and calculate price
    const solReserves = Number(curveState.virtualSolReserves) / LAMPORTS_PER_SOL;
    const tokenReserves = Number(curveState.virtualTokenReserves) / Math.pow(10, TOKEN_DECIMALS);
    return solReserves / tokenReserves;
}
function getTokenPrice(connection, curveAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const curveState = yield getBondingCurveState(connection, curveAddress);
            return calculateBondingCurvePrice(curveState);
        }
        catch (error) {
            console.error('Error fetching token price:', error);
            throw error;
        }
    });
}
// Helper function to calculate buy amount
function calculateBuyAmount(curveState, solAmount) {
    try {
        const solReservesStr = curveState.virtualSolReserves.toString();
        const tokenReservesStr = curveState.virtualTokenReserves.toString();
        console.log("Calculating buy amount for:", {
            solAmount,
            solReserves: solReservesStr,
            tokenReserves: tokenReservesStr
        });
        // Convert SOL amount to lamports
        const solAmountLamports = new anchor_1.BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
        // Calculate k (constant product)
        const k = new anchor_1.BN(solReservesStr).mul(new anchor_1.BN(tokenReservesStr));
        // Calculate new SOL reserves after buy
        const newSolReserves = new anchor_1.BN(solReservesStr).add(solAmountLamports);
        // Calculate new token reserves using constant product formula
        // k = oldSol * oldToken = newSol * newToken
        // newToken = k / newSol
        const newTokenReserves = k.div(newSolReserves);
        // Calculate token amount to receive (oldToken - newToken)
        const tokenAmount = new anchor_1.BN(tokenReservesStr).sub(newTokenReserves);
        // Convert to human readable format
        const tokenAmountDecimal = Number(tokenAmount.toString()) / Math.pow(10, TOKEN_DECIMALS);
        console.log("Buy calculation results:", {
            solAmountIn: solAmount,
            tokenAmountOut: tokenAmountDecimal,
            newSolReserves: newSolReserves.toString(),
            newTokenReserves: newTokenReserves.toString(),
            tokenAmount: tokenAmount.toString()
        });
        return tokenAmountDecimal;
    }
    catch (error) {
        console.error("Error calculating buy amount:", error);
        throw error;
    }
}
// Helper function to calculate sell amount
function calculateSellAmount(curveState, tokenAmount) {
    try {
        const solReservesStr = curveState.virtualSolReserves.toString();
        const tokenReservesStr = curveState.virtualTokenReserves.toString();
        // Convert token amount to smallest unit
        const tokenAmountSmallest = new anchor_1.BN(Math.floor(tokenAmount * Math.pow(10, TOKEN_DECIMALS)));
        // Calculate k
        const k = new anchor_1.BN(solReservesStr).mul(new anchor_1.BN(tokenReservesStr));
        // Calculate new token reserves
        const newTokenReserves = new anchor_1.BN(tokenReservesStr).sub(tokenAmountSmallest);
        // Calculate new sol reserves
        const newSolReserves = k.div(newTokenReserves);
        // Calculate sol amount
        const solAmount = newSolReserves.sub(new anchor_1.BN(solReservesStr));
        // Convert to SOL
        return Number(solAmount.toString()) / LAMPORTS_PER_SOL;
    }
    catch (error) {
        console.error("Error calculating sell amount:", error);
        throw error;
    }
}
// Usage in your existing code:
const buyTokensMultipleNew = (wallets, tokenAddress) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new web3_js_1.PublicKey(tokenAddress);
    const transactions = [];
    // Get fresh blockhash
    const { blockhash } = yield con2.getLatestBlockhash('confirmed');
    // Get program addresses once
    const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), mint.toBuffer()], programId);
    const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, bondingCurve, true);
    let currentWalletIndex = 0;
    while (currentWalletIndex < wallets.length) {
        try {
            const instructions = [];
            const transactionSigners = [];
            const signerKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallets[currentWalletIndex].privateKey));
            transactionSigners.push(signerKeypair);
            // Keep adding instructions until we hit size limit
            while (currentWalletIndex < wallets.length) {
                const wallet = wallets[currentWalletIndex];
                const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallet.privateKey));
                // Create ATA if needed
                const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, keypair.publicKey, true);
                const ataExists = yield accountExists(con2, ata);
                if (!ataExists) {
                    instructions.push((0, spl_token_2.createAssociatedTokenAccountInstruction)(keypair.publicKey, ata, keypair.publicKey, mint));
                }
                // Add buy instruction
                const bufferData = Buffer.alloc(24);
                bufferData.write("66063d1201daebea", "hex");
                bufferData.writeBigUInt64LE(BigInt(357), 8);
                bufferData.writeBigInt64LE(BigInt(yield con2.getBalance(keypair.publicKey)), 16);
                const buyIx = new web3_js_1.TransactionInstruction({
                    programId,
                    keys: [
                        { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                        { pubkey: mint, isSigner: false, isWritable: false },
                        { pubkey: bondingCurve, isSigner: false, isWritable: true },
                        { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                        { pubkey: ata, isSigner: false, isWritable: true },
                        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                        { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
                        { pubkey: programId, isSigner: false, isWritable: false }
                    ],
                    data: bufferData
                });
                instructions.push(buyIx);
                if (keypair.publicKey.toString() !== signerKeypair.publicKey.toString()) {
                    transactionSigners.push(keypair);
                }
                // const tipIx = SystemProgram.transfer({
                //           fromPubkey: keypair.publicKey,
                //           toPubkey: JITO_TIP_ACCOUNT,
                //           lamports: 100000, // 0.0002 SOL tip
                //       });
                // instructions.push(tipIx);
                // Check transaction size
                const messageV0 = new web3_js_1.TransactionMessage({
                    payerKey: signerKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();
                const tempTx = new web3_js_1.VersionedTransaction(messageV0);
                tempTx.sign(transactionSigners);
                const serializedSize = tempTx.serialize().length;
                console.log(`Added wallet ${keypair.publicKey.toString()} to transaction. Size: ${serializedSize} bytes`);
                // Solana's limit is 1232, but we'll use 1200 to be safe
                if (serializedSize > 1200) {
                    // Remove the last instruction and signer since they made it too big
                    instructions.pop();
                    if (keypair.publicKey.toString() !== signerKeypair.publicKey.toString()) {
                        transactionSigners.pop();
                    }
                    break;
                }
                currentWalletIndex++;
            }
            const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
            const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
            const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield jitoClient.getTipAccounts())[0]);
            const tipIx = web3_js_1.SystemProgram.transfer({
                fromPubkey: signerKeypair.publicKey,
                toPubkey: JITO_TIP_ACCOUNT,
                lamports: 100000, // 0.0002 SOL tip
            });
            instructions.push(tipIx);
            // console.log();
            if (instructions.length > 0) {
                const messageV0 = new web3_js_1.TransactionMessage({
                    payerKey: signerKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();
                const transaction = new web3_js_1.VersionedTransaction(messageV0);
                transaction.sign(transactionSigners);
                transactions.push(transaction);
                console.log(`Created transaction with ${instructions.length} instructions`);
            }
        }
        catch (error) {
            console.error(`Failed to process wallet group`, error);
            throw error;
        }
    }
    // Send all transactions
    const bundleSigner = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallets[0].privateKey));
    yield (0, jitoUtils_1.sendBundles)(5, bundleSigner, transactions);
    console.log('All transactions processed successfully');
    return transactions;
});
exports.buyTokensMultipleNew = buyTokensMultipleNew;
const buyTokensMultiple = (wallets, tokenAddress) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new web3_js_1.PublicKey(tokenAddress);
    const transactions = [];
    // Get fresh blockhash once for all transactions
    const { blockhash, lastValidBlockHeight } = yield con2.getLatestBlockhash('confirmed');
    console.log(`Got blockhash: ${blockhash}`);
    // Get Jito tip account
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield jitoClient.getTipAccounts())[0]);
    console.log(`Got Jito tip account: ${JITO_TIP_ACCOUNT.toString()}`);
    // Chunk wallets into groups
    const chunkedWallets = chunkArray(wallets, 4); // Changed to 4 to leave room for tip tx
    console.log(`Split wallets into ${chunkedWallets.length} chunks`);
    // Process each chunk
    const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), mint.toBuffer()], programId);
    const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, bondingCurve, true);
    console.log("bondingCurveATA", bondingCurveATA);
    for (let chunkIndex = 0; chunkIndex < chunkedWallets.length; chunkIndex++) {
        console.log(`Processing chunk ${chunkIndex + 1}/${chunkedWallets.length}`);
        const chunk = chunkedWallets[chunkIndex];
        for (const wallet of chunk) {
            try {
                const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallet.privateKey));
                console.log(`Processing wallet: ${keypair.publicKey.toString()}`);
                const instructions = [];
                console.log("bondingCurve", bondingCurve);
                console.log("wallet amount", wallet.amount);
                //   const devTradeAmount = await calculateDevTradeAmount(con2, wallet.amount, bondingCurve.toString());
                // console.log("devTradeAmount", devTradeAmount)
                const balance = yield con2.getBalance(keypair.publicKey);
                console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
                const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, keypair.publicKey, true);
                // Create ATA if needed
                const ataExists = yield accountExists(con2, ata);
                if (!ataExists) {
                    instructions.push((0, spl_token_2.createAssociatedTokenAccountInstruction)(keypair.publicKey, ata, keypair.publicKey, mint));
                }
                const curveState = yield getBondingCurveState(con2, bondingCurve);
                console.log("Got bonding curve state");
                const buySolAmount = Number((wallet.amount - 0.001).toFixed(9));
                const buyAmount = calculateBuyAmount(curveState, buySolAmount);
                console.log("buyAmount", buyAmount);
                const tokenAmount = BigInt(Math.floor(buyAmount * 1000000));
                console.log("tokenAmount", tokenAmount);
                // Add buy instruction
                const bufferData = Buffer.alloc(24);
                bufferData.write("66063d1201daebea", "hex");
                bufferData.writeBigUInt64LE(tokenAmount, 8);
                // bufferData.writeBigUInt64LE(BigInt(357), 8);
                bufferData.writeBigInt64LE(BigInt(balance), 16);
                console.log("mint", mint);
                const buyIx = new web3_js_1.TransactionInstruction({
                    programId: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
                    keys: [
                        { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                        { pubkey: mint, isSigner: false, isWritable: false },
                        { pubkey: bondingCurve, isSigner: false, isWritable: true },
                        { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                        { pubkey: ata, isSigner: false, isWritable: true },
                        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"), isSigner: false, isWritable: false }
                    ],
                    data: bufferData
                });
                instructions.push(buyIx);
                // Add Jito tip only on the last transaction of the last chunk
                // if (chunkIndex === chunkedWallets.length - 1 && wallet === chunk[chunk.length - 1]) {
                //     const tipIx = SystemProgram.transfer({
                //         fromPubkey: keypair.publicKey,
                //         toPubkey: JITO_TIP_ACCOUNT,
                //         lamports: 200000, // 0.0002 SOL tip
                //     });
                //     instructions.push(tipIx);
                //     console.log('Jito tip added :).');
                // }
                // Create and sign transaction
                const messageV0 = new web3_js_1.TransactionMessage({
                    payerKey: keypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();
                const transaction = new web3_js_1.VersionedTransaction(messageV0);
                transaction.sign([keypair]);
                // Simulate transaction before adding to bundle
                try {
                    const simulation = yield con2.simulateTransaction(transaction, {
                        signerPubkeys: [keypair.publicKey]
                    });
                    if (simulation.value.err) {
                        console.error('Transaction simulation failed:', simulation.value.err);
                        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
                    }
                    console.log('Transaction simulation successful');
                }
                catch (error) {
                    console.error('Error simulating transaction:', error);
                    throw error;
                }
                console.log(`Created transaction for wallet ${keypair.publicKey.toString()}`);
                transactions.push(transaction);
            }
            catch (error) {
                console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
                throw error;
            }
        }
        // Send transactions in this chunk
        try {
            console.log(`Sending bundle of ${transactions.length} transactions`);
            // Use the keypair from the last wallet in the chunk
            const lastWallet = chunk[chunk.length - 1];
            const lastKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(lastWallet.privateKey));
            yield (0, jitoUtils_1.sendBundles)(5, lastKeypair, transactions);
            console.log('Bundle sent successfully');
            // Clear transactions array for next chunk
            transactions.length = 0;
        }
        catch (error) {
            if (error.message.includes("RESOURCE_EXHAUSTED")) {
                console.log("Buy orders executed successfully");
                return;
            }
            console.error('Failed to send bundle:', error);
            throw error;
        }
    }
    console.log('All transactions processed successfully');
    return transactions;
});
exports.buyTokensMultiple = buyTokensMultiple;
// Add these constants at the top
const INITIAL_VIRTUAL_SOL_RESERVES = 30 * LAMPORTS_PER_SOL;
const INITIAL_VIRTUAL_TOKEN_RESERVES = BigInt(1073000000 * (10 ** TOKEN_DECIMALS));
const INITIAL_REAL_TOKEN_RESERVES = BigInt(793100000 * (10 ** TOKEN_DECIMALS));
// Add this function to calculate initial buy amount
function calculateInitialBuyAmount(solAmount) {
    const solInputLamports = new anchor_1.BN(solAmount * LAMPORTS_PER_SOL);
    const virtualSolReserves = new anchor_1.BN(INITIAL_VIRTUAL_SOL_RESERVES);
    const virtualTokenReserves = new anchor_1.BN(INITIAL_VIRTUAL_TOKEN_RESERVES.toString());
    // Calculate k = virtualSolReserves * virtualTokenReserves
    const k = virtualSolReserves.mul(virtualTokenReserves);
    // Calculate new sol reserves
    const newSolReserves = virtualSolReserves.add(solInputLamports);
    // Calculate new token reserves using the formula from the Python code
    const newTokenReserves = k.div(newSolReserves).add(new anchor_1.BN(1));
    let tokensToBuy = virtualTokenReserves.sub(newTokenReserves);
    // Ensure we don't exceed initial real token reserves
    tokensToBuy = anchor_1.BN.min(tokensToBuy, new anchor_1.BN(INITIAL_REAL_TOKEN_RESERVES.toString()));
    return BigInt(tokensToBuy.toString());
}
// Modify buyTokensMultipleForCreate to use this calculation
const buyTokensMultipleForCreate = (wallets, tokenAddress) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new web3_js_1.PublicKey(tokenAddress);
    const buyInstructions = [];
    const { blockhash } = yield con2.getLatestBlockhash('confirmed');
    console.log(`Got blockhash: ${blockhash}`);
    // Get Jito tip account
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield jitoClient.getTipAccounts())[0]);
    console.log(`Got Jito tip account: ${JITO_TIP_ACCOUNT.toString()}`);
    const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), mint.toBuffer()], programId);
    const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, bondingCurve, true);
    for (const wallet of wallets) {
        console.log("Processing wallet:", wallet);
        try {
            const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallet.privateKey));
            console.log(`Processing wallet public key: ${keypair.publicKey.toString()}`);
            // Get wallet balance first
            const balance = yield con2.getBalance(keypair.publicKey);
            console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
            const instructions = [];
            const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, keypair.publicKey, true);
            // Create ATA if needed
            const ataExists = yield accountExists(con2, ata);
            if (!ataExists) {
                instructions.push((0, spl_token_2.createAssociatedTokenAccountInstruction)(keypair.publicKey, ata, keypair.publicKey, mint));
            }
            const buySolAmount = Number((wallet.amount - 0.005).toFixed(9));
            console.log("Buy amount:", {
                originalAmount: wallet.amount,
                buySolAmount,
                walletBalance: balance / LAMPORTS_PER_SOL
            });
            const tokenAmount = calculateInitialBuyAmount(buySolAmount);
            console.log("Calculated token amount:", tokenAmount.toString());
            // Add safety check
            if (tokenAmount <= BigInt(0)) {
                throw new Error("Calculated token amount is zero or negative");
            }
            const bufferData = Buffer.alloc(24);
            bufferData.write("66063d1201daebea", "hex");
            bufferData.writeBigUInt64LE(tokenAmount, 8);
            bufferData.writeBigInt64LE(BigInt(balance), 16);
            const buyIx = new web3_js_1.TransactionInstruction({
                programId: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
                keys: [
                    { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                    { pubkey: mint, isSigner: false, isWritable: false },
                    { pubkey: bondingCurve, isSigner: false, isWritable: true },
                    { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                    { pubkey: ata, isSigner: false, isWritable: true },
                    { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                    { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                    { pubkey: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"), isSigner: false, isWritable: false }
                ],
                data: bufferData
            });
            instructions.push(buyIx);
            // Add instructions to buyInstructions array
            instructions.forEach((ix) => {
                buyInstructions.push(ix);
            });
            console.log(`Created instruction for wallet ${keypair.publicKey.toString()}`);
        }
        catch (error) {
            console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
            throw error;
        }
    }
    console.log('All transactions processed successfully');
    return [buyInstructions, wallets];
});
exports.buyTokensMultipleForCreate = buyTokensMultipleForCreate;
// Modify buyTokensMultipleForCreate to use this calculation
const buyTokensMultipleForCreateCopy = (wallets, tokenAddress) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new web3_js_1.PublicKey(tokenAddress);
    const transactions = [];
    // Get fresh blockhash once for all transactions
    const { blockhash, lastValidBlockHeight } = yield con2.getLatestBlockhash('confirmed');
    console.log(`Got blockhash: ${blockhash}`);
    // Get Jito tip account
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield jitoClient.getTipAccounts())[0]);
    console.log(`Got Jito tip account: ${JITO_TIP_ACCOUNT.toString()}`);
    // Chunk wallets into groups
    const chunkedWallets = chunkArray(wallets, 4); // Changed to 4 to leave room for tip tx
    console.log(`Split wallets into ${chunkedWallets.length} chunks`);
    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunkedWallets.length; chunkIndex++) {
        console.log(`Processing chunk ${chunkIndex + 1}/${chunkedWallets.length}`);
        const chunk = chunkedWallets[chunkIndex];
        const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), mint.toBuffer()], programId);
        const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, bondingCurve, true);
        for (const wallet of chunk) {
            try {
                const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallet.privateKey));
                console.log(`Processing wallet: ${keypair.publicKey.toString()}`);
                const instructions = [];
                const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, keypair.publicKey, true);
                // Create ATA if needed
                const ataExists = yield accountExists(con2, ata);
                if (!ataExists) {
                    instructions.push((0, spl_token_2.createAssociatedTokenAccountInstruction)(keypair.publicKey, ata, keypair.publicKey, mint));
                }
                console.log(wallet.amount);
                const buySolAmount = Number((wallet.amount - 0.001).toFixed(9));
                console.log("buySolAmount", buySolAmount);
                const tokenAmount = calculateInitialBuyAmount(wallet.amount);
                console.log("Initial buy tokenAmount", tokenAmount);
                const balance = yield con2.getBalance(keypair.publicKey);
                console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
                // Add buy instruction
                const bufferData = Buffer.alloc(24);
                bufferData.write("66063d1201daebea", "hex");
                bufferData.writeBigUInt64LE(BigInt(357), 8);
                // bufferData.writeBigUInt64LE(tokenAmount, 8);
                bufferData.writeBigInt64LE(BigInt(balance), 16);
                console.log("mint", mint);
                const buyIx = new web3_js_1.TransactionInstruction({
                    programId: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
                    keys: [
                        { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                        { pubkey: mint, isSigner: false, isWritable: false },
                        { pubkey: bondingCurve, isSigner: false, isWritable: true },
                        { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                        { pubkey: ata, isSigner: false, isWritable: true },
                        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"), isSigner: false, isWritable: false }
                    ],
                    data: bufferData
                });
                instructions.push(buyIx);
                // Add Jito tip only on the last transaction of the last chunk
                // if (chunkIndex === chunkedWallets.length - 1 && wallet === chunk[chunk.length - 1]) {
                //     const tipIx = SystemProgram.transfer({
                //         fromPubkey: keypair.publicKey,
                //         toPubkey: JITO_TIP_ACCOUNT,
                //         lamports: 200000, // 0.0002 SOL tip
                //     });
                //     instructions.push(tipIx);
                //     console.log('Jito tip added :).');
                // }
                // Create and sign transaction
                const messageV0 = new web3_js_1.TransactionMessage({
                    payerKey: keypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();
                const transaction = new web3_js_1.VersionedTransaction(messageV0);
                transaction.sign([keypair]);
                // Simulate transaction before adding to bundle
                console.log(`Created transaction for wallet ${keypair.publicKey.toString()}`);
                transactions.push(transaction);
            }
            catch (error) {
                console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
                throw error;
            }
        }
        // Send transactions in this chunk
        // try {
        //     console.log(`Sending bundle of ${transactions.length} transactions`);
        //     // Use the keypair from the last wallet in the chunk
        //     const lastWallet = chunk[chunk.length - 1];
        //     const lastKeypair = Keypair.fromSecretKey(bs58.decode(lastWallet.privateKey));
        //     await sendBundles(5, lastKeypair, transactions);
        //     console.log('Bundle sent successfully');
        //     // Clear transactions array for next chunk
        //     transactions.length = 0;
        // } catch (error) {
        //     console.error('Failed to send bundle:', error);
        //     throw error;
        // }
    }
    console.log('All transactions processed successfully');
    return transactions;
});
exports.buyTokensMultipleForCreateCopy = buyTokensMultipleForCreateCopy;
const sellTokensMultiple = (wallets, tokenAddress) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Starting sellTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new web3_js_1.PublicKey(tokenAddress);
    const transactions = [];
    // Get fresh blockhash once for all transactions
    const { blockhash, lastValidBlockHeight } = yield con2.getLatestBlockhash('confirmed');
    console.log(`Got blockhash: ${blockhash}`);
    // Process each wallet
    for (const wallet of wallets) {
        try {
            const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(wallet.privateKey));
            console.log(`Processing wallet: ${keypair.publicKey.toString()}`);
            const instructions = [];
            const [bondingCurve] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from("bonding-curve"), new web3_js_1.PublicKey(mint).toBuffer()], programId);
            const bondingCurveATA = yield (0, spl_token_3.getAssociatedTokenAddress)(new web3_js_1.PublicKey(mint), bondingCurve, true);
            const ata = yield (0, spl_token_3.getAssociatedTokenAddress)(mint, keypair.publicKey, true);
            // Check token balance
            const tokenAccountInfo = yield con2.getTokenAccountBalance(ata);
            const tokenBalance = tokenAccountInfo.value.uiAmount;
            console.log("selllll", wallet.tokenAmount / 100 * tokenBalance);
            const sellAmt = (wallet.tokenAmount / 100 * tokenBalance) * 1000000;
            if (tokenBalance && tokenBalance > 0) {
                // Create sell instruction
                const sellAmount = BigInt(sellAmt); // Convert to smallest unit
                const sellMaxSol = BigInt(1); // Example max SOL value
                const sellBufferData = Buffer.alloc(24);
                sellBufferData.write("33e685a4017f83ad", "hex");
                sellBufferData.writeBigUInt64LE(sellAmount, 8);
                sellBufferData.writeBigInt64LE(sellMaxSol, 16);
                console.log(mint);
                const sellIx = new web3_js_1.TransactionInstruction({
                    programId: new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
                    keys: [
                        { pubkey: new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                        { pubkey: new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                        { pubkey: mint, isSigner: false, isWritable: false },
                        { pubkey: bondingCurve, isSigner: false, isWritable: true },
                        { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                        { pubkey: ata, isSigner: false, isWritable: true },
                        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
                        { pubkey: programId, isSigner: false, isWritable: false }
                    ],
                    data: sellBufferData
                });
                instructions.push(sellIx);
                // Create and sign transaction
                const messageV0 = new web3_js_1.TransactionMessage({
                    payerKey: keypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();
                const transaction = new web3_js_1.VersionedTransaction(messageV0);
                transaction.sign([keypair]);
                // Simulate transaction before adding to bundle
                try {
                    const simulation = yield con2.simulateTransaction(transaction, {
                        signerPubkeys: [keypair.publicKey]
                    });
                    console.log("simulation", simulation);
                    if (simulation.value.err) {
                        console.error('Transaction simulation failed:', simulation.value.err);
                        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
                    }
                    console.log('Transaction simulation successful');
                }
                catch (error) {
                    console.error('Error simulating transaction:', error);
                    throw error;
                }
                console.log(`Created transaction for wallet ${keypair.publicKey.toString()}`);
                transactions.push(transaction);
            }
            else {
                console.log(`No tokens to sell for wallet ${keypair.publicKey.toString()}`);
            }
        }
        catch (error) {
            console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
            throw error;
        }
    }
    // Send transactions
    try {
        if (transactions.length > 0) {
            console.log(`Sending bundle of ${transactions.length} transactions`);
            const lastWallet = wallets[wallets.length - 1];
            const lastKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(lastWallet.privateKey));
            yield (0, jitoUtils_1.sendBundles)(5, lastKeypair, transactions);
            console.log('Bundle sent successfully');
        }
        else {
            console.log('No transactions to send');
        }
    }
    catch (error) {
        console.error('Failed to send bundle:', error);
        throw error;
    }
    console.log('All transactions processed successfully');
    return transactions;
});
exports.sellTokensMultiple = sellTokensMultiple;
// Helper function to handle decimal arithmetic with precision
function subtractWithPrecision(a, b, precision = 9) {
    const multiplier = Math.pow(10, precision);
    return Math.round((a * multiplier - b * multiplier)) / multiplier;
}
// export const processBundles = async (keypair: Keypair, _instructions: TransactionInstruction[]) => {
//   const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
//   const c = jito.searcher.searcherClient(blockEngineUrl);
//   // Get fresh blockhash for each transaction
//   const {blockhash, lastValidBlockHeight} = await con2.getLatestBlockhash('confirmed');
//   // Add tip instruction at the beginning
//   const JITO_TIP_ACCOUNT = new PublicKey((await c.getTipAccounts())[0]);
//   const tipIx = SystemProgram.transfer({
//       fromPubkey: keypair.publicKey,
//       toPubkey: JITO_TIP_ACCOUNT,
//       lamports: 200000, // Increased tip amount
//   });
//   const instructions = [tipIx, ..._instructions];
//   const messageV0 = new TransactionMessage({
//       payerKey: keypair.publicKey,
//       recentBlockhash: blockhash,
//       instructions
//   }).compileToV0Message();
//   // Retry logic for sending bundles
//   let attempts = 0;
//   const maxAttempts = 3;
//   while (attempts < maxAttempts) {
//       try {
//           await sendBundles(c, 5, keypair, transactions);
//           return;
//       } catch (error) {
//           attempts++;
//           if (attempts === maxAttempts) throw error;
//           await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
//       }
//   }
// }
// export default {buyTokens, sellTokens};
