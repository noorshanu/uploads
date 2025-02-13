// @ts-nocheck
import { Router, Request, Response } from 'express';
import Token from '../models/Token';
import { createToken2, createMetadata } from '../services/createToken';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionMessage, VersionedTransaction, TransactionInstruction,   ComputeBudgetProgram } from '@solana/web3.js';
import Wallet from '../models/Wallets';
import base58 from 'bs58';
import PumpFunTrader from '@degenfrends/solana-pumpfun-trader';
import { buyTokens, sellTokens, buyTokens2, sellTokens2, buyTokensMultiple, fundWallets, withdrawFunds, sellTokensMultiple, buyTokensMultipleForCreate } from '../services/token';
import bs58 from 'bs58';
import * as jito from 'jito-ts';
import {sendBundlesForCreate } from '../services/jitoUtils';
import Marketplace from '../models/Marketplace';

import {getAssociatedTokenAddressSync, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { encodeCreateInstruction } from '../services/decode';
import { BN } from "@coral-xyz/anchor";
import BumpWallet from '../models/BumpWallet';
import { sendBundles } from '../services/jitoUtils';




const router = Router();

const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_FUN_ACCOUNT = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1")
// const LAMPORTS_PER_SOL = 1_000_000_000;
const TOKEN_DECIMALS = 6;

async function accountExists(connection: Connection, address: PublicKey): Promise<boolean> {
    const account = await connection.getAccountInfo(address);
    return account !== null;
  }

  async function getBondingCurveState(connection: Connection, curveAddress: PublicKey): Promise<BondingCurveState> {
    const accountInfo = await connection.getAccountInfo(curveAddress);
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
  }

  function calculateBondingCurvePrice(curveState: BondingCurveState): number {
    if (curveState.virtualTokenReserves <= BigInt(0) || curveState.virtualSolReserves <= BigInt(0)) {
      throw new Error("Invalid reserve state");
    }

    // Convert BigInts to numbers and calculate price
    const solReserves = Number(curveState.virtualSolReserves) / LAMPORTS_PER_SOL;
    const tokenReserves = Number(curveState.virtualTokenReserves) / Math.pow(10, TOKEN_DECIMALS);
    
    return solReserves / tokenReserves;
  }


  interface BondingCurveState {
    virtualTokenReserves: bigint;
    virtualSolReserves: bigint;
    realTokenReserves: bigint;
    realSolReserves: bigint;
    tokenTotalSupply: bigint;
    complete: boolean;
  }

    // Helper function to calculate buy amount
    export function calculateBuyAmount(curveState: BondingCurveState, solAmount: number): number {
        try {
            const solReservesStr = curveState.virtualSolReserves.toString();
            const tokenReservesStr = curveState.virtualTokenReserves.toString();
            
            console.log("Calculating buy amount for:", {
                solAmount,
                solReserves: solReservesStr,
                tokenReserves: tokenReservesStr
            });
    
            // Convert SOL amount to lamports
            const solAmountLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
            
            // Calculate k (constant product)
            const k = new BN(solReservesStr).mul(new BN(tokenReservesStr));
            
            // Calculate new SOL reserves after buy
            const newSolReserves = new BN(solReservesStr).add(solAmountLamports);
            
            // Calculate new token reserves using constant product formula
            // k = oldSol * oldToken = newSol * newToken
            // newToken = k / newSol
            const newTokenReserves = k.div(newSolReserves);
            
            // Calculate token amount to receive (oldToken - newToken)
            const tokenAmount = new BN(tokenReservesStr).sub(newTokenReserves);
            
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
        } catch (error) {
            console.error("Error calculating buy amount:", error);
            throw error;
        }
      }
    
      // Helper function to calculate sell amount
      export function calculateSellAmount(curveState: BondingCurveState, tokenAmount: number): number {
        try {
            const solReservesStr = curveState.virtualSolReserves.toString();
            const tokenReservesStr = curveState.virtualTokenReserves.toString();
            
            // Convert token amount to smallest unit
            const tokenAmountSmallest = new BN(Math.floor(tokenAmount * Math.pow(10, TOKEN_DECIMALS)));
            
            // Calculate k
            const k = new BN(solReservesStr).mul(new BN(tokenReservesStr));
            
            // Calculate new token reserves
            const newTokenReserves = new BN(tokenReservesStr).sub(tokenAmountSmallest);
            
            // Calculate new sol reserves
            const newSolReserves = k.div(newTokenReserves);
            
            // Calculate sol amount
            const solAmount = newSolReserves.sub(new BN(solReservesStr));
            
            // Convert to SOL
            return Number(solAmount.toString()) / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error("Error calculating sell amount:", error);
            throw error;
        }
      }


router.post('/fund-wallets', async (req: Request, res: Response) => {
    const { walletAddress, privateKey, amount, txnAmount, bumps } = req.body;

    if (!walletAddress || !privateKey || !amount || !txnAmount || !bumps) {
        return res.status(400).json({ 
            message: 'Missing required fields', 
            required: ['walletAddress', 'privateKey', 'amount', 'txnAmount', 'bumps'] 
        });
    }

    console.log(walletAddress, privateKey, amount);
    try {
        // Save the wallet information
        const bumpWallet = new BumpWallet({
            address: walletAddress,
            privateKey: privateKey,
            amountFunded: amount,
            txnAmount: txnAmount,
            bumps: bumps
        });

        await bumpWallet.save();

        res.status(200).json({ message: 'Wallet funded and information saved successfully' });
    } catch (error) {
        console.error('Error saving BumpWallet:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});


router.post('/start-bump', async (req: Request, res: Response) => {
    const { walletAddress, privateKey, txn_amount, tokenAddress, bumps } = req.body;

    const mint = new PublicKey(tokenAddress);
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    console.log(walletAddress, txn_amount, mint);

    try {
        // First save the BumpWallet with all required fields
        const bumpWallet = new BumpWallet({
            address: walletAddress,
            privateKey: privateKey,
            amountFunded: txn_amount,
            txnAmount: txn_amount,
            bumps: bumps
        });

        await bumpWallet.save();
        console.log('BumpWallet saved successfully');

        const con2 = new Connection("https://mainnet.helius-rpc.com/?api-key=341b21f8-2360-40b9-8dd8-919dadbc2168", "confirmed")
        const MAX_INSTRUCTIONS_PER_TX = 4;
        const transactions: VersionedTransaction[] = [];

        // Calculate number of transactions needed
        const numberOfTransactions = Math.ceil(bumps / 2 / MAX_INSTRUCTIONS_PER_TX); // Divide bumps by 2 since each bump is a buy+sell pair
        console.log(`Creating ${numberOfTransactions} transactions for ${bumps} bumps`);

        for (let txIndex = 0; txIndex < numberOfTransactions; txIndex++) {
            const {blockhash} = await con2.getLatestBlockhash('confirmed');
            const instructions: TransactionInstruction[] = [];

            // Calculate start and end indices for this transaction's instructions
            // Multiply by 2 since each bump requires 2 instructions (buy+sell)
            const startIndex = txIndex * MAX_INSTRUCTIONS_PER_TX * 2;
            const endIndex = Math.min(startIndex + (MAX_INSTRUCTIONS_PER_TX * 2), bumps);
            
            console.log(`Transaction ${txIndex + 1}: Processing instructions ${startIndex} to ${endIndex}`);
            
            const [bondingCurve] = await PublicKey.findProgramAddress(
                [Buffer.from("bonding-curve"), mint.toBuffer()],
                programId
            );
        
            const bondingCurveATA = await getAssociatedTokenAddress(
                mint,
                bondingCurve,
                true
            );

            const ata = await getAssociatedTokenAddress(
                mint,
                keypair.publicKey,
                true
            );

            // First, check if ATA exists and create if needed
            const ataExists = await accountExists(con2, ata);
            if (!ataExists) {
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        keypair.publicKey,
                        ata,
                        keypair.publicKey,
                        mint
                    )
                );
            }

            // Get initial token balance and decimals
            const tokenAccountInfo = await con2.getTokenAccountBalance(ata).catch(() => null);
            const initialBalance = tokenAccountInfo?.value.uiAmount || 0;
            const decimals = tokenAccountInfo?.value.decimals || 6;

            // Track running token balance through the transaction
            let currentTokenBalance = initialBalance;

            // Create instructions for this transaction (max 4)
            for (let j = startIndex; j < endIndex; j++) {
                const tempInstructions = [...instructions];

                if (j % 2 === 0) {
                    // Buy instruction
                    // const buySolAmount = Number((0.011 - 0.001).toFixed(9));
                    const buySolAmount = Number(txn_amount).toFixed(9);
                    const curveState = await getBondingCurveState(con2, bondingCurve);
                    const buyAmount = calculateBuyAmount(curveState, Number(buySolAmount));
                    
                    currentTokenBalance += buyAmount;
                    const tokenAmount = Math.floor(buyAmount * Math.pow(10, decimals));
                    
                    const bufferData = Buffer.alloc(24);
                    bufferData.write("66063d1201daebea", "hex");
                    bufferData.writeBigUInt64LE(BigInt(tokenAmount), 8);
                    bufferData.writeBigInt64LE(BigInt(await con2.getBalance(keypair.publicKey)), 16);

                    const buyIx = new TransactionInstruction({
                        programId,
                        keys: [
                            { pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                            { pubkey: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                            { pubkey: mint, isSigner: false, isWritable: false },
                            { pubkey: bondingCurve, isSigner: false, isWritable: true },
                            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                            { pubkey: ata, isSigner: false, isWritable: true },
                            { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                            { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
                            { pubkey: programId, isSigner: false, isWritable: false }
                        ],
                        data: bufferData
                    });

                    tempInstructions.push(buyIx);
                    
                    // Simulate with just this instruction added
                    const tempMessage = new TransactionMessage({
                        payerKey: keypair.publicKey,
                        recentBlockhash: blockhash,
                        instructions: tempInstructions
                    }).compileToV0Message();

                    const tempTx = new VersionedTransaction(tempMessage);
                    tempTx.sign([keypair]);

                    try {
                        const simulation = await con2.simulateTransaction(tempTx);
                        if (simulation.value.err) {
                            console.error(`Buy instruction ${(j/2) + 1} simulation failed:`, simulation.value.err);
                            return res.status(400).json({
                                message: 'Transaction simulation failed',
                                error: `Buy instruction ${(j/2) + 1} failed: ${simulation.value.err}`,
                                txIndex,
                                instructionIndex: j
                            });
                        }
                        instructions.push(buyIx);
                        console.log(`Tx ${txIndex + 1}, Buy instruction ${(j/2) + 1}: Expected to receive ${buyAmount} tokens`);
                    } catch (simError) {
                        console.error(`Error simulating buy instruction ${(j/2) + 1}:`, simError);
                        return res.status(400).json({
                            message: 'Transaction simulation error',
                            error: `Buy instruction ${(j/2) + 1} simulation error: ${simError}`,
                            txIndex,
                            instructionIndex: j
                        });
                    }
                } else {
                    // Sell instruction
                    const sellPercentage = 100;
                    const sellAmount = currentTokenBalance * (sellPercentage / 100);
                    const sellAmt = Math.floor(sellAmount * Math.pow(10, decimals));
                    
                    const sellBufferData = Buffer.alloc(24);
                    sellBufferData.write("33e685a4017f83ad", "hex");
                    sellBufferData.writeBigUInt64LE(BigInt(sellAmt), 8);
                    sellBufferData.writeBigInt64LE(BigInt(1), 16);

                    const sellIx = new TransactionInstruction({
                        programId,
                        keys: [
                            { pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
                            { pubkey: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
                            { pubkey: mint, isSigner: false, isWritable: false },
                            { pubkey: bondingCurve, isSigner: false, isWritable: true },
                            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
                            { pubkey: ata, isSigner: false, isWritable: true },
                            { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
                            { pubkey: programId, isSigner: false, isWritable: false }
                        ],
                        data: sellBufferData
                    });

                    tempInstructions.push(sellIx);

                    // Simulate with just this instruction added
                    const tempMessage = new TransactionMessage({
                        payerKey: keypair.publicKey,
                        recentBlockhash: blockhash,
                        instructions: tempInstructions
                    }).compileToV0Message();

                    const tempTx = new VersionedTransaction(tempMessage);
                    tempTx.sign([keypair]);

                    try {
                        const simulation = await con2.simulateTransaction(tempTx);
                        if (simulation.value.err) {
                            console.error(`Sell instruction ${Math.floor(j/2) + 1} simulation failed:`, simulation.value.err);
                            return res.status(400).json({
                                message: 'Transaction simulation failed',
                                error: `Sell instruction ${Math.floor(j/2) + 1} failed: ${simulation.value.err}`,
                                txIndex,
                                instructionIndex: j
                            });
                        }
                        instructions.push(sellIx);
                        currentTokenBalance = 0;
                        console.log(`Tx ${txIndex + 1}, Sell instruction ${Math.floor(j/2) + 1}: Selling ${sellAmount} tokens`);
                    } catch (simError) {
                        console.error(`Error simulating sell instruction ${Math.floor(j/2) + 1}:`, simError);
                        return res.status(400).json({
                            message: 'Transaction simulation error',
                            error: `Sell instruction ${Math.floor(j/2) + 1} simulation error: ${simError}`,
                            txIndex,
                            instructionIndex: j
                        });
                    }
                }
            }

            if (instructions.length > (ataExists ? 0 : 1)) {
                // Create final transaction with all successful instructions
                const messageV0 = new TransactionMessage({
                    payerKey: keypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();

                const transaction = new VersionedTransaction(messageV0);
                transaction.sign([keypair]);
                
                // Final simulation of complete transaction
                try {
                    const finalSimulation = await con2.simulateTransaction(transaction);
                    if (finalSimulation.value.err) {
                        console.error(`Final transaction ${txIndex + 1} simulation failed:`, finalSimulation.value.err);
                        return res.status(400).json({
                            message: 'Final transaction simulation failed',
                            error: `Transaction ${txIndex + 1} failed: ${finalSimulation.value.err}`,
                            txIndex
                        });
                    }
                    transactions.push(transaction);
                    console.log(`Transaction ${txIndex + 1} added to bundle with ${instructions.length} instructions`);
                } catch (simError) {
                    console.error(`Error in final simulation of transaction ${txIndex + 1}:`, simError);
                    return res.status(400).json({
                        message: 'Final transaction simulation error',
                        error: `Transaction ${txIndex + 1} simulation error: ${simError}`,
                        txIndex
                    });
                }
            }
        }

        if (transactions.length > 0) {
            try {
                console.log(`Sending ${transactions.length} transactions in bundles...`);
                await sendBundles(4, keypair, transactions);
                console.log('All bundles sent successfully');

                // Add balance check and transfer
                try {
                    // Wait a bit for transactions to confirm
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const balance = await con2.getBalance(keypair.publicKey);
                    const RENT_EXEMPTION = 890880; // minimum balance for rent exemption
                    
                    if (balance > RENT_EXEMPTION) {
                        const transferAmount = balance - (Number(0.009) * LAMPORTS_PER_SOL);
                        const feeWallet = new PublicKey('FeeDAjMaMzeSy3pqCXMue3hBWhNbivD1JR8ZqtVr3P19');
                        // const feeWallet = new PublicKey('DJJhkcq1Z3uhk5Budj12h97aEchdhFfTwj6821kxgbpZ');
                        
                        const transferIx = SystemProgram.transfer({
                            fromPubkey: keypair.publicKey,
                            toPubkey: feeWallet,
                            lamports: transferAmount,
                        });

                        const {blockhash} = await con2.getLatestBlockhash('confirmed');
                        const messageV0 = new TransactionMessage({
                            payerKey: keypair.publicKey,
                            recentBlockhash: blockhash,
                            instructions: [transferIx]
                        }).compileToV0Message();

                        const transferTx = new VersionedTransaction(messageV0);
                        transferTx.sign([keypair]);
                        
                        await con2.sendTransaction(transferTx);
                        console.log(`Transferred ${transferAmount / LAMPORTS_PER_SOL} SOL to fee wallet`);
                    }

                    res.status(200).json({ 
                        message: 'Bump transactions processed successfully and remaining balance transferred',
                        transactionsCreated: transactions.length,
                        totalInstructions: bumps,
                        transferredBalance: balance > RENT_EXEMPTION ? (balance - RENT_EXEMPTION) / LAMPORTS_PER_SOL : 0
                    });
                } catch (transferError) {
                    console.error('Error in balance transfer:', transferError);
                    res.status(200).json({ 
                        message: 'Bump transactions processed successfully but balance transfer failed',
                        error: transferError instanceof Error ? transferError.message : 'Unknown transfer error',
                        transactionsCreated: transactions.length,
                        totalInstructions: bumps
                    });
                }
            } catch (error: any) {
                console.error('Error sending bundles:', error);
                res.status(500).json({ 
                    message: 'Error sending bundles',
                    error: error?.message || 'Unknown error',
                    transactionsCreated: transactions.length
                });
            }
        } else {
            res.status(400).json({ 
                message: 'No valid transactions were created',
                error: 'All transaction simulations failed'
            });
        }

    } catch (error: any) {
        console.error('Error in start-bump:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error?.message || 'Unknown error'
        });
    }
});


export default router;