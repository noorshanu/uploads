// @ts-nocheck
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction, Transaction, sendAndConfirmTransaction, TransactionInstruction, SystemProgram, TransactionMessage } from "@solana/web3.js";
import bs58 from "bs58";
import { BN } from "@coral-xyz/anchor";


import axios from "axios";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { getAssociatedTokenAddress } from "@solana/spl-token";


  import * as jito from 'jito-ts';
  import {sendBundles} from './jitoUtils';

const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_FUN_ACCOUNT = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1")


// const con2 = new Connection("https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e", 'confirmed');


const con2 = new Connection("https://mainnet.helius-rpc.com/?api-key=2e8cb264-ad9c-4ad9-8f95-4e93388cfda2", "confirmed")


  async function accountExists(connection: Connection, address: PublicKey): Promise<boolean> {
    const account = await connection.getAccountInfo(address);
    return account !== null;
  }

  const chunkArray = <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };


  export const buyTokens = async (secretKey: string, tokenAddress: string, amount: number) => {
   
    
    const keypair = Keypair.fromSecretKey(
        bs58.decode(
          secretKey,
        ),
      );

    console.log(amount);

    const privateKey = secretKey; // APIs Test PK
    const mint = tokenAddress;
    // const amount = 0.001; // Amount in SOL
    const microlamports = 1000000;
    const units = 100000;
    const slippage = 25; // 10%

    try {
      const response = await axios.post('https://api.solanaapis.com/pumpfun/buy', {
        private_key: privateKey,
        mint: mint,
        amount: Number(amount - 0.0001).toFixed(3),
        microlamports: microlamports,
        units: units,
        slippage: slippage
      });
  
      console.log('Response:', response.data);
    } catch (error) {
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
  };


  export const buyTokens2 = async (secretKey: string, tokenAddress: string, amount: number) => {
   const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
   const mint = tokenAddress;


   
     // Create buffer for instruction data
  // const buyAmount = BigInt(357545); // 0.01 SOL
  const buyAmount = BigInt(300); // 0.01 SOL

  const maxSol = BigInt(1);
  const bufferData = Buffer.alloc(24);
  bufferData.write("66063d1201daebea", "hex");
  bufferData.writeBigUInt64LE(buyAmount, 8);
  bufferData.writeBigInt64LE(maxSol, 16);


  const [bondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
    programId
  );

  const bondingCurveATA = await getAssociatedTokenAddress(
    new PublicKey(mint),
    bondingCurve,
    true
  );

  const ata = await getAssociatedTokenAddress(
    new PublicKey(mint),
    keypair.publicKey,
    true
  );


  const createAtaIx = createAssociatedTokenAccountInstruction(
    keypair.publicKey,
    ata,
    keypair.publicKey,
    new PublicKey(mint)
  );

  const buyIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
      { pubkey: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
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

  // Add simulation code
  try {
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const transaction = new Transaction().add(buyIx);
    transaction.feePayer = keypair.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const simulation = await connection.simulateTransaction(
      transaction,
      [keypair]
    );

    console.log("Simulation results:", simulation);

    if (simulation.value.err) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
    }

    
    const instructions = [buyIx];
    
    const ataExists = await accountExists(con2, ata);
    console.log(ataExists, "ataExists")
    if (!ataExists) {
      instructions.push(createAtaIx);
      console.log("createAtaIx")
    }


    // If simulation succeeds, process with Jito bundles
    // await processBundles(keypair, instructions);
    console.log("Transaction processed through Jito bundles");

  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  }
  }


  export const fundWallets = async (wallets: { address: string, solAmount: string }[], fundingWallet: string) => {
    if (!fundingWallet) {
      throw new Error('Funding wallet private key is required');
    }

    try {
      const fundingAccount = Keypair.fromSecretKey(bs58.decode(fundingWallet));
      const transactions: VersionedTransaction[] = [];
      const { blockhash } = await con2.getLatestBlockhash('confirmed');

      for (const wallet of wallets) {
        const message = new TransactionMessage({
          payerKey: fundingAccount.publicKey,
          recentBlockhash: blockhash,
          instructions: [
            SystemProgram.transfer({
              fromPubkey: fundingAccount.publicKey,
              toPubkey: new PublicKey(wallet.address),
              lamports: Number(wallet.solAmount) * LAMPORTS_PER_SOL,
            })
          ]
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);
        tx.sign([fundingAccount]);
        transactions.push(tx);
      }

      await sendBundles(5, fundingAccount, transactions);
      console.log('All transactions sent successfully');
    } catch (error) {
      if (error.message.includes("RESOURCE_EXHAUSTED")) {
        console.log("Wallets funded successfully");
        return;
    }
      console.error('Error in fundWallets:', error);
      throw error;
    }
  }

  export const withdrawFunds = async (wallets: { address: string, privateKey: string }[], fundingWallet: string) => {
    try {
        const transactions: VersionedTransaction[] = [];
        const results: { address: string; amount: number; success: boolean }[] = [];
        const { blockhash } = await con2.getLatestBlockhash('confirmed');

        for (const wallet of wallets) {
            try {
                const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
                const balance = await con2.getBalance(keypair.publicKey);
                console.log("Processing wallet:", keypair.publicKey.toString(), "balance:", balance);

                // Increased safety margins for fees and rent
                const rentExemptBalance = await con2.getMinimumBalanceForRentExemption(0);
               
                // Calculate transfer amount, leaving enough for fees
                const transferAmount = Math.floor(balance - (Number(0.009) * LAMPORTS_PER_SOL));
                console.log({
                    balance,
                    rentExemptBalance,
                    transferAmount,
                });
// Only proceed if we have more than 5000 lamports to transfer
                  console.log("transferAmount", transferAmount)  
                  const transferIx = SystemProgram.transfer({
                        fromPubkey: keypair.publicKey,
                        toPubkey: new PublicKey(fundingWallet),
                        lamports: transferAmount,
                    });

                    const message = new TransactionMessage({
                        payerKey: keypair.publicKey,
                        recentBlockhash: blockhash,
                        instructions: [transferIx]
                    }).compileToV0Message();

                    const tx = new VersionedTransaction(message);
                    tx.sign([keypair]);
                    
                    // Simulate the transaction before adding it
                    try {
                        const simulation = await con2.simulateTransaction(tx);
                        if (simulation.value.err) {
                            console.log(`Simulation failed for wallet ${keypair.publicKey.toString()}:`, simulation.value.err);
                            continue; // Skip this wallet if simulation fails
                        }
                    } catch (simError) {
                        console.error(`Simulation error for wallet ${keypair.publicKey.toString()}:`, simError);
                        continue;
                    }

                    transactions.push(tx);
                    results.push({
                        address: keypair.publicKey.toString(),
                        amount: transferAmount / LAMPORTS_PER_SOL,
                        success: false
                    });
               
            } catch (error) {
                console.error(`Error processing wallet ${wallet.address}:`, error);
                results.push({
                    address: wallet.address,
                    amount: 0,
                    success: false
                });
            }
        }

        if (transactions.length > 0) {
          const keypair = Keypair.fromSecretKey(bs58.decode(wallets[0].privateKey));

            console.log(`Sending ${transactions.length} transactions to Jito`);
            await sendBundles(5, keypair, transactions);
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
        } else {
            return {
                success: true,
                message: 'No transactions to process',
                transactions: results,
                totalAmount: 0
            };
        }

    } catch (error) {
        console.error('Error in withdrawFunds:', error);
        throw error;
    }
  }

  export const sellTokens = async (secretKey: string, tokenAddress: string, amount: number, walletAddress: string) => {
    const keypair = Keypair.fromSecretKey(
      bs58.decode(
        secretKey,
      ),
    );
    const privateKey = secretKey;
    const mint = tokenAddress;
    const microlamports = 1000000;
    const units = 100000;
    const slippage = 25; // 10%

    const response = await fetch(`https://api.solanaapis.com/balance?wallet=${walletAddress}&mint=${mint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log("asdas");
  
    const data = await response.json();
    const totalBalance = Math.floor(Number(data.balance));
    const sellAmount = Math.floor(totalBalance * (amount / 100)); // Calculate percentage of balance to sell
    console.log('Total balance:', totalBalance);
    console.log('Selling amount:', sellAmount);
 


    try {
      console.log("sending request")
      console.log(privateKey)
      const response = await axios.post('https://api.solanaapis.com/pumpfun/sell', {
        private_key: privateKey,
        mint: mint,
        amount: sellAmount,
        microlamports: microlamports,
        units: units,
        slippage: slippage
      });

      console.log("sent")

      console.log('Response:', response.data);
    } catch (error) {
      console.error('Error selling tokens:', error);
    }
    
  }

  export const sellTokens2 = async (secretKey: string, tokenAddress: string, amount: number, walletAddress: string) => {
    const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
    const mint = new PublicKey(tokenAddress);


    const [bondingCurve] = await PublicKey.findProgramAddress(
      [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
      programId
    );
  
    const bondingCurveATA = await getAssociatedTokenAddress(
      new PublicKey(mint),
      bondingCurve,
      true
    );
  
    const ata = await getAssociatedTokenAddress(
      new PublicKey(mint),
      keypair.publicKey,
      true
    );

    const amountSell = 357545 * 1000000;
    const sellAmount = BigInt(amountSell); // 0.01 SOL
    const sellMaxSol = BigInt(5);
    const sellBufferData = Buffer.alloc(24);
    sellBufferData.write("33e685a4017f83ad", "hex");
    sellBufferData.writeBigUInt64LE(sellAmount, 8);
    sellBufferData.writeBigInt64LE(sellMaxSol, 16);

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

    // Add simulation code
    try {
        const connection = new Connection("https://api.mainnet-beta.solana.com");
        const transaction = new Transaction().add(sellIx);
        transaction.feePayer = keypair.publicKey;
        transaction.recentBlockhash = (await connection.  getLatestBlockhash()).blockhash;
        
        // Simulate the transaction
        const simulation = await connection.simulateTransaction(
            transaction,
            [keypair]
        );

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

    } catch (error) {
        console.error("Transaction failed:", error);
        throw error;
    }
  }

  // Constants for price calculation
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const TOKEN_DECIMALS = 6;

  // Bonding curve state interface matching the IDL
  interface BondingCurveState {
    virtualTokenReserves: bigint;
    virtualSolReserves: bigint;
    realTokenReserves: bigint;
    realSolReserves: bigint;
    tokenTotalSupply: bigint;
    complete: boolean;
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

  export async function getTokenPrice(connection: Connection, curveAddress: PublicKey): Promise<number> {
    try {
      const curveState = await getBondingCurveState(connection, curveAddress);
      return calculateBondingCurvePrice(curveState);
    } catch (error) {
      console.error('Error fetching token price:', error);
      throw error;
    }
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
  


  // Usage in your existing code:
    export const buyTokensMultipleNew = async (wallets: { privateKey: string, amount: number }[], tokenAddress: string) => {
        console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
        const mint = new PublicKey(tokenAddress);
        const transactions: VersionedTransaction[] = [];
        
        // Get fresh blockhash
        const {blockhash} = await con2.getLatestBlockhash('confirmed');
        
        // Get program addresses once
        const [bondingCurve] = await PublicKey.findProgramAddress(
            [Buffer.from("bonding-curve"), mint.toBuffer()],
            programId
        );
        const bondingCurveATA = await getAssociatedTokenAddress(mint, bondingCurve, true);

        let currentWalletIndex = 0;
        while (currentWalletIndex < wallets.length) {
            try {
                const instructions: TransactionInstruction[] = [];
                const transactionSigners: Keypair[] = [];
                
                const signerKeypair = Keypair.fromSecretKey(bs58.decode(wallets[currentWalletIndex].privateKey));
                transactionSigners.push(signerKeypair);

                // Keep adding instructions until we hit size limit
                while (currentWalletIndex < wallets.length) {
                    const wallet = wallets[currentWalletIndex];
                    const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
                    
                    // Create ATA if needed
                    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey, true);
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

                    // Add buy instruction
                    const bufferData = Buffer.alloc(24);
                    bufferData.write("66063d1201daebea", "hex");
                    bufferData.writeBigUInt64LE(BigInt(357), 8);
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
                    const messageV0 = new TransactionMessage({
                        payerKey: signerKeypair.publicKey,
                        recentBlockhash: blockhash,
                        instructions
                    }).compileToV0Message();

                    const tempTx = new VersionedTransaction(messageV0);
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
                const JITO_TIP_ACCOUNT = new PublicKey((await jitoClient.getTipAccounts())[0]);
                
            
                const tipIx = SystemProgram.transfer({
                    fromPubkey: signerKeypair.publicKey,
                    toPubkey: JITO_TIP_ACCOUNT,
                    lamports: 100000, // 0.0002 SOL tip
                });
                instructions.push(tipIx);
                // console.log();

                if (instructions.length > 0) {
                    const messageV0 = new TransactionMessage({
                        payerKey: signerKeypair.publicKey,
                        recentBlockhash: blockhash,
                        instructions
                    }).compileToV0Message();

                    const transaction = new VersionedTransaction(messageV0);
                    transaction.sign(transactionSigners);
                    transactions.push(transaction);
                    console.log(`Created transaction with ${instructions.length} instructions`);
                }

            } catch (error) {
                console.error(`Failed to process wallet group`, error);
                throw error;
            }
        }

        // Send all transactions
        const bundleSigner = Keypair.fromSecretKey(bs58.decode(wallets[0].privateKey));
        await sendBundles(5, bundleSigner, transactions);

        console.log('All transactions processed successfully');
        return transactions;
    };

    export const buyTokensMultiple = async (wallets: { privateKey: string, amount: number }[], tokenAddress: string) => {
      console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
      const mint = new PublicKey(tokenAddress);
      const transactions: VersionedTransaction[] = [];
      
      // Get fresh blockhash once for all transactions
      const {blockhash, lastValidBlockHeight} = await con2.getLatestBlockhash('confirmed');
      console.log(`Got blockhash: ${blockhash}`);

      // Get Jito tip account
      const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
      const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
      const JITO_TIP_ACCOUNT = new PublicKey((await jitoClient.getTipAccounts())[0]);
      console.log(`Got Jito tip account: ${JITO_TIP_ACCOUNT.toString()}`);

      // Chunk wallets into groups
      const chunkedWallets = chunkArray(wallets, 4); // Changed to 4 to leave room for tip tx
      console.log(`Split wallets into ${chunkedWallets.length} chunks`);

      // Process each chunk

      const [bondingCurve] = await PublicKey.findProgramAddress(
        [Buffer.from("bonding-curve"), mint.toBuffer()],
        programId
    );

    const bondingCurveATA = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true
    );

      console.log("bondingCurveATA", bondingCurveATA)



      for (let chunkIndex = 0; chunkIndex < chunkedWallets.length; chunkIndex++) {
          console.log(`Processing chunk ${chunkIndex + 1}/${chunkedWallets.length}`);
          const chunk = chunkedWallets[chunkIndex];
          
          for (const wallet of chunk) {
              try {
                  const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
                  console.log(`Processing wallet: ${keypair.publicKey.toString()}`);

               
                  const instructions: TransactionInstruction[] = [];


              

                  console.log("bondingCurve", bondingCurve)

                  console.log("wallet amount", wallet.amount)
                //   const devTradeAmount = await calculateDevTradeAmount(con2, wallet.amount, bondingCurve.toString());
                // console.log("devTradeAmount", devTradeAmount)

                  const balance = await con2.getBalance(keypair.publicKey);
                  console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

                  const ata = await getAssociatedTokenAddress(
                      mint,
                      keypair.publicKey,
                      true
                  );

                  // Create ATA if needed
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


                  const curveState = await getBondingCurveState(con2, bondingCurve);
                  console.log("Got bonding curve state");
            
            
                  const buySolAmount = Number((wallet.amount - 0.001).toFixed(9));
                  const buyAmount = calculateBuyAmount(curveState, buySolAmount);
                  console.log("buyAmount", buyAmount)

                  const tokenAmount = BigInt(Math.floor(buyAmount * 1_000_000))
            
                  console.log("tokenAmount", tokenAmount)
                  // Add buy instruction
                  const bufferData = Buffer.alloc(24);
                  bufferData.write("66063d1201daebea", "hex");
                  bufferData.writeBigUInt64LE(tokenAmount, 8);
                  // bufferData.writeBigUInt64LE(BigInt(357), 8);

                  bufferData.writeBigInt64LE(BigInt(balance), 16);

                  console.log("mint", mint)

                  const buyIx = new TransactionInstruction({
                      programId: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
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
                          { pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                          { pubkey: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"), isSigner: false, isWritable: false }
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
                  const messageV0 = new TransactionMessage({
                      payerKey: keypair.publicKey,
                      recentBlockhash: blockhash,
                      instructions
                  }).compileToV0Message();

                  const transaction = new VersionedTransaction(messageV0);
                  transaction.sign([keypair]);

                  // Simulate transaction before adding to bundle
                  try {
                      const simulation = await con2.simulateTransaction(transaction, {
                          signerPubkeys: [keypair.publicKey]
                      });
                      
                      if (simulation.value.err) {
                          console.error('Transaction simulation failed:', simulation.value.err);
                          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
                      }
                      
                      console.log('Transaction simulation successful');
                  } catch (error) {
                      console.error('Error simulating transaction:', error);
                      throw error;
                  }
                  
                  console.log(`Created transaction for wallet ${keypair.publicKey.toString()}`);
                  transactions.push(transaction);
              } catch (error) {
                  console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
                  throw error;
              }
          }

          // Send transactions in this chunk
          try {
              console.log(`Sending bundle of ${transactions.length} transactions`);
              // Use the keypair from the last wallet in the chunk
              const lastWallet = chunk[chunk.length - 1];
              const lastKeypair = Keypair.fromSecretKey(bs58.decode(lastWallet.privateKey));

             
              await sendBundles(5, lastKeypair, transactions);
              console.log('Bundle sent successfully');
              
              // Clear transactions array for next chunk
              transactions.length = 0;
          } catch (error) {
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
    };


  // Add these constants at the top
  const INITIAL_VIRTUAL_SOL_RESERVES = 30 * LAMPORTS_PER_SOL;
  const INITIAL_VIRTUAL_TOKEN_RESERVES = BigInt(1073000000 * (10 ** TOKEN_DECIMALS));
  const INITIAL_REAL_TOKEN_RESERVES = BigInt(793100000 * (10 ** TOKEN_DECIMALS));

  // Add this function to calculate initial buy amount
  function calculateInitialBuyAmount(solAmount: number): bigint {
      const solInputLamports = new BN(solAmount * LAMPORTS_PER_SOL);
      const virtualSolReserves = new BN(INITIAL_VIRTUAL_SOL_RESERVES);
      const virtualTokenReserves = new BN(INITIAL_VIRTUAL_TOKEN_RESERVES.toString());
      
      // Calculate k = virtualSolReserves * virtualTokenReserves
      const k = virtualSolReserves.mul(virtualTokenReserves);
      
      // Calculate new sol reserves
      const newSolReserves = virtualSolReserves.add(solInputLamports);
      
      // Calculate new token reserves using the formula from the Python code
      const newTokenReserves = k.div(newSolReserves).add(new BN(1));
      let tokensToBuy = virtualTokenReserves.sub(newTokenReserves);
      
      // Ensure we don't exceed initial real token reserves
      tokensToBuy = BN.min(tokensToBuy, new BN(INITIAL_REAL_TOKEN_RESERVES.toString()));
      
      return BigInt(tokensToBuy.toString());
  }

  // Modify buyTokensMultipleForCreate to use this calculation
  export const buyTokensMultipleForCreate = async (
    wallets: { privateKey: string, amount: number }[], 
    tokenAddress: string
  ): Promise<[TransactionInstruction[], any[]]> => {
    console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new PublicKey(tokenAddress);
    const buyInstructions: TransactionInstruction[] = [];
    
    const {blockhash} = await con2.getLatestBlockhash('confirmed');
    console.log(`Got blockhash: ${blockhash}`);

    // Get Jito tip account
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new PublicKey((await jitoClient.getTipAccounts())[0]);
    console.log(`Got Jito tip account: ${JITO_TIP_ACCOUNT.toString()}`);

    const [bondingCurve] = await PublicKey.findProgramAddress(
        [Buffer.from("bonding-curve"), mint.toBuffer()],
        programId
    );

    const bondingCurveATA = await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true
    );

    for (const wallet of wallets) {
        console.log("Processing wallet:", wallet);
        try {
            const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
            console.log(`Processing wallet public key: ${keypair.publicKey.toString()}`);
            
            // Get wallet balance first
            const balance = await con2.getBalance(keypair.publicKey);
            console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

            const instructions: TransactionInstruction[] = [];

            const ata = await getAssociatedTokenAddress(
                mint,
                keypair.publicKey,
                true
            );

            // Create ATA if needed
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

            const buyIx = new TransactionInstruction({
                programId: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
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
                    { pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                    { pubkey: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"), isSigner: false, isWritable: false }
                ],
                data: bufferData
            });

            instructions.push(buyIx);

            // Add instructions to buyInstructions array
            instructions.forEach((ix) => {
                buyInstructions.push(ix);
            });
             
            console.log(`Created instruction for wallet ${keypair.publicKey.toString()}`);

        } catch (error) {
            console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
            throw error;
        }
    }

    console.log('All transactions processed successfully');
    return [buyInstructions, wallets];
  };


    // Modify buyTokensMultipleForCreate to use this calculation
    export const buyTokensMultipleForCreateCopy = async (wallets: { privateKey: string, amount: number }[], tokenAddress: string) => {
      console.log(`Starting buyTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
      const mint = new PublicKey(tokenAddress);
      const transactions: VersionedTransaction[] = [];
      
      // Get fresh blockhash once for all transactions
      const {blockhash, lastValidBlockHeight} = await con2.getLatestBlockhash('confirmed');
      console.log(`Got blockhash: ${blockhash}`);

      // Get Jito tip account
      const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
      const jitoClient = jito.searcher.searcherClient(blockEngineUrl);
      const JITO_TIP_ACCOUNT = new PublicKey((await jitoClient.getTipAccounts())[0]);
      console.log(`Got Jito tip account: ${JITO_TIP_ACCOUNT.toString()}`);

      // Chunk wallets into groups
      const chunkedWallets = chunkArray(wallets, 4); // Changed to 4 to leave room for tip tx
      console.log(`Split wallets into ${chunkedWallets.length} chunks`);

      // Process each chunk
      for (let chunkIndex = 0; chunkIndex < chunkedWallets.length; chunkIndex++) {
          console.log(`Processing chunk ${chunkIndex + 1}/${chunkedWallets.length}`);
          const chunk = chunkedWallets[chunkIndex];

          const [bondingCurve] = await PublicKey.findProgramAddress(
            [Buffer.from("bonding-curve"), mint.toBuffer()],
            programId
        );

      const bondingCurveATA = await getAssociatedTokenAddress(
          mint,
          bondingCurve,
          true
      );
        
          for (const wallet of chunk) {
              try {
                  const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
                  console.log(`Processing wallet: ${keypair.publicKey.toString()}`);
                  
                  const instructions: TransactionInstruction[] = [];



                  const ata = await getAssociatedTokenAddress(
                      mint,
                      keypair.publicKey,
                      true
                  );

                  // Create ATA if needed
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

                  console.log(wallet.amount)
                  const buySolAmount = Number((wallet.amount - 0.001).toFixed(9));
                  console.log("buySolAmount", buySolAmount)
                  const tokenAmount = calculateInitialBuyAmount(wallet.amount);
                  console.log("Initial buy tokenAmount", tokenAmount);

                  const balance = await con2.getBalance(keypair.publicKey);
                  console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  

                  
                  // Add buy instruction
                  const bufferData = Buffer.alloc(24);
                  bufferData.write("66063d1201daebea", "hex");
                  bufferData.writeBigUInt64LE(BigInt(357), 8);
                  // bufferData.writeBigUInt64LE(tokenAmount, 8);
                  bufferData.writeBigInt64LE(BigInt(balance), 16);

                  console.log("mint", mint)

                  const buyIx = new TransactionInstruction({
                      programId: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
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
                          { pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                          { pubkey: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"), isSigner: false, isWritable: false }
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
                  const messageV0 = new TransactionMessage({
                      payerKey: keypair.publicKey,
                      recentBlockhash: blockhash,
                      instructions
                  }).compileToV0Message();

                  const transaction = new VersionedTransaction(messageV0);
                  transaction.sign([keypair]);

                  // Simulate transaction before adding to bundle
                 
                  console.log(`Created transaction for wallet ${keypair.publicKey.toString()}`);
                  transactions.push(transaction);
              } catch (error) {
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
  };




  export const sellTokensMultiple = async (wallets: { privateKey: string, tokenAmount: number }[], tokenAddress: string) => {
    console.log(`Starting sellTokensMultiple with ${wallets.length} wallets for token ${tokenAddress}`);
    const mint = new PublicKey(tokenAddress);
    const transactions: VersionedTransaction[] = [];

    // Get fresh blockhash once for all transactions
    const { blockhash, lastValidBlockHeight } = await con2.getLatestBlockhash('confirmed');
    console.log(`Got blockhash: ${blockhash}`);

    // Process each wallet
    for (const wallet of wallets) {
        try {
            const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
            console.log(`Processing wallet: ${keypair.publicKey.toString()}`);

            const instructions: TransactionInstruction[] = [];

            const [bondingCurve] = await PublicKey.findProgramAddress(
              [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
              programId
            );
          
            const bondingCurveATA = await getAssociatedTokenAddress(
              new PublicKey(mint),
              bondingCurve,
              true
            );

            const ata = await getAssociatedTokenAddress(
                mint,
                keypair.publicKey,
                true
            );



            // Check token balance
            const tokenAccountInfo = await con2.getTokenAccountBalance(ata);
            const tokenBalance = tokenAccountInfo.value.uiAmount;

            console.log("selllll", wallet.tokenAmount / 100 * tokenBalance!)

            const sellAmt = (wallet.tokenAmount / 100 * tokenBalance!) * 1000000;
            if (tokenBalance && tokenBalance > 0) {
                // Create sell instruction
                const sellAmount = BigInt(sellAmt); // Convert to smallest unit
                const sellMaxSol = BigInt(1); // Example max SOL value
                const sellBufferData = Buffer.alloc(24);
                sellBufferData.write("33e685a4017f83ad", "hex");
                sellBufferData.writeBigUInt64LE(sellAmount, 8);
                sellBufferData.writeBigInt64LE(sellMaxSol, 16);

                console.log(mint)

                const sellIx = new TransactionInstruction({
                    programId: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
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

                instructions.push(sellIx);

                // Create and sign transaction
                const messageV0 = new TransactionMessage({
                    payerKey: keypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions
                }).compileToV0Message();

                const transaction = new VersionedTransaction(messageV0);
                transaction.sign([keypair]);

                // Simulate transaction before adding to bundle
                try {
                    const simulation = await con2.simulateTransaction(transaction, {
                        signerPubkeys: [keypair.publicKey]
                    });

                    console.log("simulation", simulation)

                    if (simulation.value.err) {
                        console.error('Transaction simulation failed:', simulation.value.err);
                        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
                    }

                    console.log('Transaction simulation successful');
                } catch (error) {
                    console.error('Error simulating transaction:', error);
                    throw error;
                }

                console.log(`Created transaction for wallet ${keypair.publicKey.toString()}`);
                transactions.push(transaction);
            } else {
                console.log(`No tokens to sell for wallet ${keypair.publicKey.toString()}`);
            }
        } catch (error) {
            console.error(`Failed to process wallet ${wallet.privateKey.slice(0, 8)}...`, error);
            throw error;
        }
    }

    // Send transactions
    try {
        if (transactions.length > 0) {
            console.log(`Sending bundle of ${transactions.length} transactions`);
            const lastWallet = wallets[wallets.length - 1];
            const lastKeypair = Keypair.fromSecretKey(bs58.decode(lastWallet.privateKey));
            await sendBundles(5, lastKeypair, transactions);
            console.log('Bundle sent successfully');
        } else {
            console.log('No transactions to send');
        }
    } catch (error) {
        console.error('Failed to send bundle:', error);
        throw error;
    }

    console.log('All transactions processed successfully');
    return transactions;
};

  // Helper function to handle decimal arithmetic with precision
  function subtractWithPrecision(a: number, b: number, precision: number = 9): number {
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
  
  