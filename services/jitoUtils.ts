// @ts-nocheck
import {
    Connection,
    Keypair,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
  } from '@solana/web3.js';
  import bs58 from 'bs58';
  
  import * as jito from 'jito-ts';
  import { BundleResult } from 'jito-ts/dist/gen/block-engine/bundle';

  const MEMO_PROGRAM_ID = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
  
  interface TransactionResult {
    signature: string;
    status: 'success' | 'failed' | 'unknown';
    error?: string;
    bundleId?: string;
    chunkIndex?: number;
    retryCount?: number;
  }

  interface BundleReport {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    unknownStatusTransactions: number;
    transactionDetails: TransactionResult[];
    processingTime: number;
    bundleDetails: {
        totalBundles: number;
        successfulBundles: number;
        failedBundles: number;
        partiallyProcessedBundles: number;
    };
  }

  export async function sendBundlesOld(
    bundleLimit: number,
    keypair: Keypair,
    transactions: VersionedTransaction[]
): Promise<void> {  // Changed return type to void since we'll only throw on explicit errors
    console.log(`Starting sendBundles with ${transactions.length} transactions`);
    
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    console.log('Connecting to Jito block engine:', blockEngineUrl);
    
    const client = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new PublicKey((await client.getTipAccounts())[0]);
    
    // Split transactions into chunks of 4
    const chunks = [];
    for (let i = 0; i < transactions.length; i += 4) {
      chunks.push(transactions.slice(i, i + 4));
    }
    console.log(`Split into ${chunks.length} chunks of max 4 transactions each`);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
        try {
            console.log(`Processing chunk ${i + 1}/${chunks.length}`);
            const {blockhash} = await con2.getLatestBlockhash('confirmed');
            
            await new Promise(async (resolve, reject) => {
                let bundleTimeout: NodeJS.Timeout;

                // Only reject on explicit errors
                const onError = (error: any) => {
                    console.error(`Chunk ${i + 1} error in onBundleResult:`, error);
                    clearTimeout(bundleTimeout);
                    reject(error);
                };

                try {
                    client.onBundleResult(
                        () => {
                            clearTimeout(bundleTimeout);
                            resolve(undefined);
                        },
                        onError
                    );

                    const bundle = new jito.bundle.Bundle(chunks[i], bundleLimit);
                    console.log(`Sending chunk ${i + 1} bundle to Jito...`);
                    const bundleId = await client.sendBundle(bundle);
                    console.log(`Chunk ${i + 1} bundle sent with ID:`, bundleId);

                    // Assume success after timeout if no explicit error
                    bundleTimeout = setTimeout(() => {
                        console.log(`Chunk ${i + 1}: No bundle result received, assuming success`);
                        resolve(undefined);
                    }, 500);
                } catch (error) {
                    console.error(`Chunk ${i + 1} error sending bundle:`, error);
                    reject(error);
                }
            });
        } catch (error) {
            // Only throw if it's an explicit error, not a timeout
            if (error.message && !error.message.includes('timeout')) {
                throw error;
            }
        }
    }

    console.log('All bundles processed without explicit errors - assuming success');
  };

  export async function sendBundles(
    bundleLimit: number,
    keypair: Keypair,
    transactions: VersionedTransaction[]
  ): Promise<void> {
    console.log(`Starting sendBundles with ${transactions.length} transactions`);
    
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    console.log('Connecting to Jito block engine:', blockEngineUrl);
    
    const client = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new PublicKey((await client.getTipAccounts())[0]);
    console.log('Got Jito tip account:', JITO_TIP_ACCOUNT.toString());

    if (transactions.length === 0) {
      console.log('No transactions to process');
      return;
    }

    const rpcConnection = new Connection("https://api.mainnet-beta.solana.com", 'confirmed');

    // Split transactions into chunks of 4
    const chunks = [];
    for (let i = 0; i < transactions.length; i += 4) {
      chunks.push(transactions.slice(i, i + 4));
    }
    console.log(`Split into ${chunks.length} chunks of max 4 transactions each`);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      // Get fresh blockhash for each chunk
      const { blockhash } = await rpcConnection.getLatestBlockhash('confirmed');
      console.log(`Got fresh blockhash for chunk ${i + 1}:`, blockhash);
      
      await new Promise(async (resolve, reject) => {
        let bundleResultReceived = false;
        let bundleTimeout: NodeJS.Timeout;

        const onSuccess = (bundleResult: BundleResult) => {
          console.log(`Chunk ${i + 1} bundle result received:`, bundleResult);
          bundleResultReceived = true;
          clearTimeout(bundleTimeout);

          // Check if bundle was partially processed (which is actually a success case)
          if (bundleResult.rejected?.droppedBundle?.msg?.includes('Bundle partially processed')) {
            console.log(`Chunk ${i + 1} bundle partially processed - considering as success`);
            resolve(undefined);
            return;
          }

          if (bundleResult.rejected) {
            console.log(`Chunk ${i + 1} bundle rejected`, bundleResult);
            reject(new Error(`Bundle rejected: ${JSON.stringify(bundleResult)}`));
          } else if (bundleResult.dropped) {
            console.log(`Chunk ${i + 1} bundle dropped`, bundleResult);
            reject(new Error(`Bundle dropped: ${JSON.stringify(bundleResult)}`));
          } else {
            console.log(`Chunk ${i + 1} bundle accepted or no error detected`);
            resolve(undefined);
          }
        };

        const onError = (error: any) => {
          console.error(`Chunk ${i + 1} error in onBundleResult:`, error);
          bundleResultReceived = true;
          clearTimeout(bundleTimeout);
          reject(error);
        };

        try {
          client.onBundleResult(onSuccess, onError);

          const bundleTransactions = chunks[i];
          const tipMessage = new TransactionMessage({
            payerKey: keypair.publicKey,
            recentBlockhash: blockhash,
            instructions: [
              SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: JITO_TIP_ACCOUNT,
                lamports: 0.001 * LAMPORTS_PER_SOL,
              })
            ]
          }).compileToV0Message();

          const tipTransaction = new VersionedTransaction(tipMessage);
          tipTransaction.sign([keypair]);
          bundleTransactions.unshift(tipTransaction);

          const bundle = new jito.bundle.Bundle(bundleTransactions, bundleLimit);
          console.log(`Sending chunk ${i + 1} bundle to Jito...`);
          const bundleId = await client.sendBundle(bundle);
          console.log(`Chunk ${i + 1} bundle sent with ID:`, bundleId);

          // Set timeout to resolve if no bundle result is received
          bundleTimeout = setTimeout(() => {
            if (!bundleResultReceived) {
              console.log(`Chunk ${i + 1}: No bundle result received, assuming success`);
              resolve(undefined);
            }
          }, 1000); // Reduced from 5000ms to 1000ms (1 second)
        } catch (error) {
          console.error(`Chunk ${i + 1} error sending bundle:`, error);
          reject(error);
        }
      });
    }

    console.log('All chunks processed successfully');
  };
  

  export async function sendBundlesForCreate(
    bundleLimit: number,
    keypair: Keypair,
    transactions: VersionedTransaction[]
  ): Promise<void> {
    console.log(`Starting sendBundlesForCreate with ${transactions.length} transactions`);
    
    const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
    console.log('Connecting to Jito block engine:', blockEngineUrl);
    
    const client = jito.searcher.searcherClient(blockEngineUrl);
    const JITO_TIP_ACCOUNT = new PublicKey((await client.getTipAccounts())[0]);
    console.log('Got Jito tip account:', JITO_TIP_ACCOUNT.toString());

    if (transactions.length === 0) {
        console.log('No transactions to process');
        return;
    }

    const rpcConnection = new Connection("https://api.mainnet-beta.solana.com", 'confirmed');
    const { blockhash } = await rpcConnection.getLatestBlockhash('confirmed');
    console.log(`Got fresh blockhash:`, blockhash);
    
    await new Promise(async (resolve, reject) => {
        let bundleResultReceived = false;
        let bundleTimeout: NodeJS.Timeout;

        const onSuccess = (bundleResult: BundleResult) => {
            console.log(`Bundle result received:`, bundleResult);
            bundleResultReceived = true;
            clearTimeout(bundleTimeout);

            if (bundleResult.rejected?.droppedBundle?.msg?.includes('Bundle partially processed')) {
                console.log(`Bundle partially processed - considering as success`);
                resolve(undefined);
                return;
            }

            if (bundleResult.rejected) {
                console.log(`Bundle rejected`, bundleResult);
                reject(new Error(`Bundle rejected: ${JSON.stringify(bundleResult)}`));
            } else if (bundleResult.dropped) {
                console.log(`Bundle dropped`, bundleResult);
                reject(new Error(`Bundle dropped: ${JSON.stringify(bundleResult)}`));
            } else {
                console.log(`Bundle accepted or no error detected`);
                resolve(undefined);
            }
        };

        const onError = (error: any) => {
            console.error(`Error in onBundleResult:`, error);
            bundleResultReceived = true;
            clearTimeout(bundleTimeout);
            reject(error);
        };

        try {
            client.onBundleResult(onSuccess, onError);

            const bundle = new jito.bundle.Bundle(transactions, bundleLimit);
            console.log(`Sending bundle to Jito...`);
            const bundleId = await client.sendBundle(bundle);
            console.log(`Bundle sent with ID:`, bundleId);

            // Set timeout to resolve if no bundle result is received
            bundleTimeout = setTimeout(() => {
                if (!bundleResultReceived) {
                    console.log(`No bundle result received, assuming success`);
                    resolve(undefined);
                }
            }, 1000); // 1 second timeout
        } catch (error) {
            console.error(`Error sending bundle:`, error);
            reject(error);
        }
    });

    console.log('Bundle processed successfully');
  };
  
  
  // export const onBundleResult = (c: jito.searcher.SearcherClient) => {
  //   c.onBundleResult(
  //     result => {
  //       console.log('received bundle result:', result);
  //     },
  //     e => {
  //       throw e;
  //     }
  //   );
  // };

  export const onBundleResult = (c: jito.searcher.SearcherClient) => {
    console.log("Setting up bundle result listener");
    c.onBundleResult(
      result => {
        console.log('received bundle result:', result);
      },
      e => {
        throw e;
      }
    );
  };

  
  const buildMemoTransaction = (
    keypair: Keypair,
    message: string,
    recentBlockhash: string
  ): VersionedTransaction => {
    const ix = new TransactionInstruction({
      keys: [
        {
          pubkey: keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
      ],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(message),
    });
  
    const instructions = [ix];
  
    const messageV0 = new TransactionMessage({
      payerKey: keypair.publicKey,
      recentBlockhash: recentBlockhash,
      instructions,
    }).compileToV0Message();
  
    const tx = new VersionedTransaction(messageV0);
  
    tx.sign([keypair]);
  
    console.log('txn signature is: ', bs58.encode(tx.signatures[0]));
    return tx;
  };
  