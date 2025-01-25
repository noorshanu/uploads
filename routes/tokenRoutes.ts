// @ts-nocheck
import { Router, Request, Response } from 'express';
import Token from '../models/Token';
import { createToken2, createMetadata } from '../services/createToken';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionMessage, VersionedTransaction, TransactionInstruction } from '@solana/web3.js';
import Wallet from '../models/Wallets';
import base58 from 'bs58';
import PumpFunTrader from '@degenfrends/solana-pumpfun-trader';
import { buyTokens, sellTokens, buyTokens2, sellTokens2, buyTokensMultiple, fundWallets, withdrawFunds, sellTokensMultiple, buyTokensMultipleForCreate } from '../services/token';
import bs58 from 'bs58';
import * as jito from 'jito-ts';
import {sendBundlesForCreate } from '../services/jitoUtils';
import Marketplace from '../models/Marketplace';

import {getAssociatedTokenAddressSync, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { encodeCreateInstruction } from '../services/decode';
import { BN } from "@coral-xyz/anchor";
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import axios from 'axios';




const router = Router();

router.get('/marketplace', async (req: Request, res: Response) => {
    console.log('Marketplace route hit');
    res.send('Marketplace route hit');
});
// Route to create a new token
router.post('/create', async (req: Request, res: Response) => {
    const { contractAddress, wallets } = req.body;
    const token = await Token.findOne({ contractAddress });
    if(!token) {
        return res.status(404).json({ message: 'Token not found' });
    }

    const { mintSecretKey, deployerSecretKey, metadataUri, name, symbol, initialBuyAmount, keypairType } = token;
    const devWallet = Keypair.fromSecretKey(bs58.decode(deployerSecretKey));

    console.log("keypairType", keypairType);
    
    // Add dev wallet as the first wallet
    let orderedWallets = [];
    if(initialBuyAmount > 0) {    
        orderedWallets = [
            {
                address: devWallet.publicKey.toBase58(),
            privateKey: base58.encode(devWallet.secretKey),
            amount: initialBuyAmount
        },
        ...wallets
    ];
    } else {
        orderedWallets = [
            ...wallets
        ];
    }

    try {
        // Get Jito tip account first
        const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
        const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
        const JITO_TIP_ACCOUNT = new PublicKey((await jitoClient.getTipAccounts())[0]);

        let marketplaceBuyIx;
        let marketplace;
        if(keypairType === "marketplace") {
          console.log("inside marketplace", mintSecretKey);
          marketplace = await Marketplace.findOne({ mintPrivateKey: mintSecretKey });
          console.log("marketplace", marketplace);
          marketplaceBuyIx = SystemProgram.transfer({
              fromPubkey: devWallet.publicKey,
              toPubkey: new PublicKey(marketplace.recipientPublicKey),
              lamports: marketplace.price * LAMPORTS_PER_SOL
          })
          console.log("marketplaceBuyIx", marketplaceBuyIx);
        }
          // Create Jito tip instruction
        const jitoTipInstruction = SystemProgram.transfer({
            fromPubkey: devWallet.publicKey,
            toPubkey: JITO_TIP_ACCOUNT,
            lamports: 0.001 * LAMPORTS_PER_SOL
        });

        // Get the create token transaction
        const createTokenIx = await createToken2(
            mintSecretKey, 
            deployerSecretKey, 
            metadataUri, 
            name, 
            symbol, 
            initialBuyAmount
        );

        // Get buy instructions
        const [buyIxs, walletsData] = await buyTokensMultipleForCreate(orderedWallets, contractAddress, initialBuyAmount);

        const con2 = new Connection("https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e");
        const {blockhash} = await con2.getLatestBlockhash('confirmed');

        // Add logging before flattening instructions
        console.log("About to flatten and combine instructions...");
        // Flatten and combine all instructions
        let allInstructions;
        if(keypairType === "marketplace") {
          allInstructions = [jitoTipInstruction, marketplaceBuyIx, createTokenIx.instruction, ...buyIxs].filter(ix => 
              ix && ix.programId && ix.keys && ix.data
          );
        } else {
          allInstructions = [jitoTipInstruction, createTokenIx.instruction, ...buyIxs].filter(ix => 
              ix && ix.programId && ix.keys && ix.data
          );
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

        const signerKeypair = Keypair.fromSecretKey(bs58.decode(deployerSecretKey));
        const mintKeypair = Keypair.fromSecretKey(bs58.decode(mintSecretKey));

        // Create transactions based on size limit
        const transactions: VersionedTransaction[] = [];
        let currentInstructions: TransactionInstruction[] = [];
        let transactionCount = 0;
        let jitoTipAdded = false;
        
        for (const ix of allInstructions) {
            console.log("Processing instruction...");
            const tempInstructions = [...currentInstructions, ix];
            
            try {
                console.log("Testing transaction size...");
                // Test transaction size
                const testMessage = new TransactionMessage({
                    payerKey: signerKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions: tempInstructions
                }).compileToV0Message();
                
                console.log("Message compiled, creating test transaction...");
                const testTx = new VersionedTransaction(testMessage);
                const txSize = testTx.serialize().length;
                
                console.log(`Transaction size: ${txSize} bytes`);
                
                if (txSize > 1200) {
                    // Create transaction with current instructions
                    if (currentInstructions.length > 0) {
                        transactionCount++;
                        console.log(`\n=== Transaction #${transactionCount} Details ===`);
                        console.log(`Number of instructions: ${currentInstructions.length}`);
                        
                        // Get all unique wallet addresses involved in this transaction
                        const walletAddresses = new Set<string>();
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

                        const tx = new VersionedTransaction(
                            new TransactionMessage({
                                payerKey: signerKeypair.publicKey,
                                recentBlockhash: blockhash,
                                instructions: currentInstructions
                            }).compileToV0Message()
                        );
                        
                        // Signing logic remains the same
                        const signers = [signerKeypair];
                        if (hasCreateInstruction) {
                            signers.push(mintKeypair);
                        }

                        const relevantWallets = wallets.filter(wallet => 
                            walletAddresses.has(wallet.address)
                        );

                        for (const wallet of relevantWallets) {
                            signers.push(Keypair.fromSecretKey(bs58.decode(wallet.privateKey)));
                        }
                        
                        tx.sign(signers);
                        console.log(`\nTransaction details:`);
                        console.log(`- Size: ${tx.serialize().length} bytes`);
                        console.log(`- Number of signers: ${signers.length}`);
                        console.log('=====================================\n');
                        
                        transactions.push(tx);
                    }
                    currentInstructions = [ix];
                } else {
                    currentInstructions = tempInstructions;
                }
            } catch (err) {
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
            const walletAddresses = new Set<string>();
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
            if (hasJitoTip) console.log(`- Jito tip instruction: 1`);
            console.log(`- Create instructions: ${hasCreateInstruction ? 1 : 0}`);
            console.log(`- Buy instructions: ${currentInstructions.length - (hasCreateInstruction ? 1 : 0) - (hasJitoTip ? 1 : 0) - 1}`);

            const tx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: signerKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions: currentInstructions
                }).compileToV0Message()
            );
            
            const signers = [signerKeypair];
            if (hasCreateInstruction) {
                signers.push(mintKeypair);
            }

            const relevantWallets = wallets.filter(wallet => 
                walletAddresses.has(wallet.address)
            );

            for (const wallet of relevantWallets) {
                signers.push(Keypair.fromSecretKey(bs58.decode(wallet.privateKey)));
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
        await sendBundlesForCreate(5, signerKeypair, transactions);
        console.log("Bundles sent successfully");
        
        console.log('Token before update:', token.toObject());
        token.isDeployed = true;
        try {
            const savedToken = await token.save();
            console.log('Token after update:', savedToken.toObject());
        } catch (error) {
            console.error('Error saving token:', error);
            throw error;
        }

        if(marketplace) {
          marketplace.used = true;
          await marketplace.save();
        }
        // If we get here, either we got success or timed out without error - both are good
        res.status(200).json({
            message: 'Token created successfully',
            transactionCount: transactions.length,
            totalInstructions: allInstructions.length
        });


    } catch (error) {
        // Only reaches here on explicit errors
        if (error.message?.includes("RESOURCE_EXHAUSTED")) {
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
});


router.post('/create-metadata', async (req: Request, res: Response) => {
  console.log(req.body);
  const { name, symbol, description, logo, telegramUrl, websiteUrl, twitterUrl, secretKey, projectId, metadataUri, initialBuyAmount,           keypairType,
    grindedPrivateKey,
    displayPublicKey,
    marketplaceId } = req.body;

  console.log("keypairType", keypairType);
  console.log("grindedPrivateKey", grindedPrivateKey);
  console.log("displayPublicKey", displayPublicKey);
  console.log("marketplaceId", marketplaceId);

  const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKey));

  try {
    const { mintKeypair } = await createMetadata({
      name,
      symbol,
      description,
      twitter: twitterUrl,
      telegram: telegramUrl,
      website: websiteUrl
    }, keypairType, grindedPrivateKey, displayPublicKey, marketplaceId);

    console.log(mintKeypair);

    let contractAddress;
    console.log(initialBuyAmount);
    let mintSecretKey;

    if(keypairType === "grinded") {
      mintSecretKey = grindedPrivateKey;
    } else {
      mintSecretKey = bs58.encode(mintKeypair.secretKey);
    }

    console.log("mintSecretKey", mintSecretKey);
    contractAddress = Keypair.fromSecretKey(bs58.decode(mintSecretKey)).publicKey.toBase58();


    const newToken = new Token({ 
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
    const savedToken = await newToken.save();

    console.log('Token saved:', savedToken);
    res.status(201).json({ message: 'Token metadata created successfully', token: savedToken });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ message: 'Error creating token', error });
  }
});

router.get('/get-token/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const token = await Token.findOne({ projectId }, { mintSecretKey: 0, deployerSecretKey: 0 });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ message: 'Error fetching tokens', error });
  }
});

router.get('/get-wallets/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const wallets = await Wallet.find({ projectId });
  console.log(wallets);
  res.status(200).json({ wallets });
});

router.post('/generate-wallet', async (req: Request, res: Response) => {
  const { numberOfWallets, ownerAddress, projectId } = req.body;
  console.log(numberOfWallets, ownerAddress, projectId);
  if (!numberOfWallets || !ownerAddress || !projectId) {
    return res.status(400).json({ message: 'Number of wallets, owner address and project ID are required' });
  }

  try {
    const generatedWallets = Array.from({ length: numberOfWallets }, () => {
      const keypair = Keypair.generate();
      
      return {
        ownerAddress,
        publicKey: keypair.publicKey.toString(),
        secretKey: base58.encode(keypair.secretKey),
        projectId
      };
    });

    const savedWallets = await Wallet.insertMany(generatedWallets);
    
    res.status(201).json({ 
      message: 'Wallets generated and saved successfully',
      ownerAddress,
      wallets: savedWallets,
      count: savedWallets.length
    });
  } catch (error) {
    console.error('Error generating wallets:', error);
    res.status(500).json({ message: 'Error generating wallets', error });
  }
});


router.post('/fund-wallets', async (req: Request, res: Response) => {
  const { wallets, privateKey } = req.body;
  console.log(wallets, privateKey);

  try {
    await fundWallets(wallets, privateKey);
    res.status(200).json({ message: 'Wallets funded successfully' });
  } catch (error) {
    console.error('Error funding wallets:', error);
    res.status(500).json({ message: 'Error funding wallets', error: error.message });
  }
});

router.post('/withdraw', async (req: Request, res: Response) => {
  const { wallets, fundingWallet } = req.body;
  console.log(wallets);
  console.log(fundingWallet);
  if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
    return res.status(400).json({ message: 'Wallets array is required and cannot be empty' });
  }
    // Get wallet details from database in a single query
    const walletAddresses = wallets.map(w => w.address);
    const walletDetails = await Wallet.find({ publicKey: { $in: walletAddresses } });

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
    await withdrawFunds(walletsWithKeys, fundingWallet);
  } catch (error) {
    if (error.message?.includes("RESOURCE_EXHAUSTED")) {
      console.log("Resource exhausted, returning success");
      return res.status(200).json({ 
        message: 'Withdrawals executed successfully' 
      });
    }

    console.error('Error executing withdrawals:', error);
    
    // Extract specific error message from bundle rejection
    let errorMessage = error.message;
    if (error.message?.includes('Bundle rejected')) {
      try {
        // Extract the error message after "error="
        const match = error.message.match(/error=([^}]*)/);
        if (match) {
          errorMessage = match[1];
        }
      } catch (parseError) {
        console.error('Error parsing bundle rejection:', parseError);
      }
    }

    res.status(500).json({ 
      message: 'Error executing withdrawals', 
      error: errorMessage 
    });
  }
});


router.post('/buy', async (req: Request, res: Response) => {
    const { wallets, tokenAddress } = req.body;
    console.log('Buy request received for:', { wallets, tokenAddress });  // Add debug log
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
        const walletDetails = await Wallet.find({ publicKey: { $in: walletAddresses } });

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
        await buyTokensMultiple(walletsWithKeys, tokenAddress);

        res.status(200).json({ 
            message: 'Buy orders executed successfully',
            walletCount: walletsWithKeys.length
        });

    } catch (error) {
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
});


router.post('/sell', async (req: Request, res: Response) => {
  const { wallets, tokenAddress } = req.body;
  console.log('Sell request received for wallets:', wallets);
  
  if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
    return res.status(400).json({ message: 'Wallets array is required and cannot be empty' });
  }

  try {
    // Get wallet details from database in a single query
    const walletAddresses = wallets.map(w => w.address);
    const walletDetails = await Wallet.find({ publicKey: { $in: walletAddresses } });

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
    const transactions = await sellTokensMultiple(walletsWithKeys, tokenAddress);

    res.status(200).json({ 
      message: 'Sell orders executed successfully',
      transactionCount: transactions.length
    });

  } catch (error) {
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
});


router.post('/get-wallets', async (req: Request, res: Response) => {
  const { addresses } = req.body;

  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({ message: 'Wallet addresses array is required' });
  }

  try {
    const wallets = await Wallet.find({ publicKey: { $in: addresses } });
    console.log(wallets);
    res.status(200).json({ wallets });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ 
      message: 'Error fetching wallets',
      error: error.message 
    });
  }
});


const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

async function accountExists(connection: Connection, address: PublicKey): Promise<boolean> {
  const account = await connection.getAccountInfo(address);
  return account !== null;
}

  // Add these constants at the top
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const TOKEN_DECIMALS = 6;
  const INITIAL_VIRTUAL_SOL_RESERVES = 30 * LAMPORTS_PER_SOL;
  const INITIAL_VIRTUAL_TOKEN_RESERVES = BigInt(1073000000 * (10 ** TOKEN_DECIMALS));
  const INITIAL_REAL_TOKEN_RESERVES = BigInt(793100000 * (10 ** TOKEN_DECIMALS));


function calculateInitialBuyAmount(solAmount: number): bigint {
    try {
        // Convert SOL amount to lamports with proper precision
        const solInputLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
        const virtualSolReserves = new BN(INITIAL_VIRTUAL_SOL_RESERVES);
        const virtualTokenReserves = new BN(INITIAL_VIRTUAL_TOKEN_RESERVES.toString());
        
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
        tokensToBuy = BN.min(tokensToBuy, new BN(INITIAL_REAL_TOKEN_RESERVES.toString()));
        
        console.log("Calculation results:", {
            newSolReserves: newSolReserves.toString(),
            newTokenReserves: newTokenReserves.toString(),
            tokensToBuy: tokensToBuy.toString(),
            maxTokens: INITIAL_REAL_TOKEN_RESERVES.toString()
        });

        return BigInt(tokensToBuy.toString());
    } catch (error) {
        console.error("Error in calculateInitialBuyAmount:", error);
        throw error;
    }
}

router.post('/create-new', async (req: Request, res: Response) => {
  try {
    const {name, symbol, metadataUri, initialBuyAmount, keypairType, grindedPrivateKey, marketplaceId, walletPublicKey } = req.body;
    console.log(req.body);

    // Convert walletPublicKey string to PublicKey instance
    const userWalletPubkey = new PublicKey(walletPublicKey);
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    let mintKeypair, marketplaceInfo;

    if (keypairType === 'grinded') {
      mintKeypair = Keypair.fromSecretKey(bs58.decode(grindedPrivateKey));
    } else if (keypairType === 'random') {
      mintKeypair = Keypair.generate();
    } else if (keypairType === 'marketplace') {
      marketplaceInfo = await Marketplace.findOne({ _id: marketplaceId });
      if (!marketplaceInfo) {
        return res.status(404).json({ message: 'Marketplace not found' });
      }
      mintKeypair = Keypair.fromSecretKey(bs58.decode(marketplaceInfo.mintPrivateKey));
    }

    const instructions: TransactionInstruction[] = [];

    // instructions.push(
    //   SystemProgram.transfer({
    //     fromPubkey: userWalletPubkey,
    //     toPubkey: new PublicKey("BgDuraHFhUDMrcSuHjxtg16DY853pSewMGcTS6A7uNGJ"),
    //     lamports: Number(0.0002) * (LAMPORTS_PER_SOL),
    //   })
    // );

    console.log(mintKeypair?.publicKey.toBase58());
    console.log(programId.toBase58());


    const [bondingCurve2] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()],
      programId
    );

    const associatedBondingCurve = getAssociatedTokenAddressSync(
      mintKeypair.publicKey, 
      bondingCurve2, 
      true
    );

    const [metadata2] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer()
      ],
      METADATA_PROGRAM_ID
    );

    const encodedData = encodeCreateInstruction({
      tokenName: name,
      symbol: symbol,
      uri: metadataUri
    });

    const createTokenIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: new PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM"), isSigner: false, isWritable: false },
        { pubkey: bondingCurve2, isSigner: false, isWritable: true },
        { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
        {pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false},
        {pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), isSigner: false, isWritable: true},
        {pubkey: metadata2, isSigner: false, isWritable: true},
        {pubkey: userWalletPubkey, isSigner: true, isWritable: true},
        {pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false},
        {pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false},
        {pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false},
        {pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false},
        {pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false},
        {pubkey: programId, isSigner: false, isWritable: false}
      ],
      data: Buffer.from(encodedData, "hex")
    });

    instructions.push(createTokenIx);

    console.log("initialBuyAmount", initialBuyAmount);
    // Add buy instruction if initial buy amount is specified
    if (initialBuyAmount && Number(initialBuyAmount) > 0) {
      console.log("initialBuyAmount", initialBuyAmount);
      const ata = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        userWalletPubkey,
        true
      );

      const [bondingCurve] = await PublicKey.findProgramAddress(
        [Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()],
        programId
      );

      const bondingCurveATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        bondingCurve,
        true
      );

      // Create ATA if needed
      const ataExists = await accountExists(connection, ata);
      if (!ataExists) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            userWalletPubkey,
            ata,
            userWalletPubkey,
            mintKeypair.publicKey
          )
        );
      }

      const balance = await connection.getBalance(userWalletPubkey);

      // Create buy instruction
      const bufferData = Buffer.alloc(24);
      bufferData.write("66063d1201daebea", "hex");
      bufferData.writeBigUInt64LE(calculateInitialBuyAmount(Number(initialBuyAmount)), 8);
      bufferData.writeBigInt64LE(BigInt(balance), 16);

      const buyIx = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
          { pubkey: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
          { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
          { pubkey: bondingCurve, isSigner: false, isWritable: true },
          { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
          { pubkey: ata, isSigner: false, isWritable: true },
          { pubkey: userWalletPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
          { pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
          { pubkey: programId, isSigner: false, isWritable: false }
        ],
        data: bufferData
      });

      instructions.push(buyIx);
    }

    console.log(keypairType);
    if(keypairType === 'marketplace'){
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: userWalletPubkey,
          toPubkey: new PublicKey(marketplaceInfo.recipientPublicKey),
          lamports: Number(marketplaceInfo.price) * (LAMPORTS_PER_SOL),
        })
      );
    }

      instructions.push(
      SystemProgram.transfer({
        fromPubkey: userWalletPubkey,
        toPubkey: new PublicKey("BgDuraHFhUDMrcSuHjxtg16DY853pSewMGcTS6A7uNGJ"),
        lamports: Number(0.2) * (LAMPORTS_PER_SOL),
      })
    );



    const latestBlockhash = await connection.getLatestBlockhash();
    const { blockhash, lastValidBlockHeight } = latestBlockhash;

    const messageV0 = new TransactionMessage({
      payerKey: userWalletPubkey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);


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


  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating token', 
      error: error.message 
    });
  } 
});

// Configure multer storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.post('/upload-metadata', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Extract data from request
    const { 
      name, 
      symbol, 
      description, 
      twitter, 
      telegram, 
      website 
    } = req.body;

    // Create form data for IPFS
    const formData = new FormData();

    // Add file if it exists
    if (req.file) {
      formData.append('file', req.file.buffer, {
        filename: 'logo.png',
        contentType: req.file.mimetype
      });
    }

    // Add metadata fields with null checks
    formData.append('name', name || '');
    formData.append('symbol', symbol || '');
    formData.append('description', description || '');
    // Only append social links if they exist and aren't "undefined"
    if (twitter && twitter !== 'undefined') formData.append('twitter', twitter);
    if (telegram && telegram !== 'undefined') formData.append('telegram', telegram);
    if (website && website !== 'undefined') formData.append('website', website);
    formData.append('showName', 'true');

    console.log('Uploading to IPFS with data:', {
      name,
      symbol,
      description,
      twitter,
      telegram,
      website,
      hasFile: !!req.file
    });

    // Upload to IPFS through pump.fun API
    const response = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
      }
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed with status: ${response.status}`);
    }

    const ipfsData = await response.json();

    // Clean up the metadata before sending response
    if (ipfsData.metadata) {
      // Remove undefined social links
      if (ipfsData.metadata.twitter === 'undefined') delete ipfsData.metadata.twitter;
      if (ipfsData.metadata.telegram === 'undefined') delete ipfsData.metadata.telegram;
      if (ipfsData.metadata.website === 'undefined') delete ipfsData.metadata.website;
    }

    console.log('IPFS upload successful:', ipfsData);

    // Send response back to client
    res.status(200).json({
      success: true,
      message: 'Metadata uploaded successfully',
      data: ipfsData
    });

  } catch (error) {
    console.error('Error in /upload-metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload metadata',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
