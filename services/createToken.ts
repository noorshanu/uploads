import bs58 from "bs58";
import fetch from 'node-fetch';
import fs from "fs/promises";
import FormData from "form-data";
import * as anchor from "@coral-xyz/anchor";
import mongoose from "mongoose";

import {Keypair, Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction, VersionedTransaction, TransactionMessage} from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

import { encodeCreateInstruction } from "./decode";
import { METADATA_PROGRAM_ID } from "@raydium-io/raydium-sdk";



const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_FUN_ACCOUNT = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1")

// const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e";
// const rpc = createSolanaRpc(RPC_ENDPOINT);

export async function createMetadata(formData: any, keypairType: string, grindedPrivateKey: string, displayPublicKey: string, marketplaceId: string) {

  console.log("keypairType", keypairType);
  console.log("grindedPrivateKey", grindedPrivateKey);
  console.log("displayPublicKey", displayPublicKey);
  console.log("marketplaceId", marketplaceId);

  const logoFileBuffer = await fs.readFile("public/logo.png");
  let mintKeypair;
  if(keypairType === "random") {
    mintKeypair = Keypair.generate(); // Generate random keypair
  }

  if(keypairType === "marketplace") {
    const marketplace = await mongoose.model('Marketplace').findById(marketplaceId);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }
    // if (marketplace.used) {
    //   throw new Error('This marketplace keypair has already been used');
    // }
    mintKeypair = Keypair.fromSecretKey(bs58.decode(marketplace.mintPrivateKey));
    console.log("mintKeypair public from service", mintKeypair.publicKey);
    // Mark the marketplace as used
    marketplace.used = true;
    await marketplace.save();
  }
  
  if (marketplaceId === "grinded") {
    console.log("grinded private key", grindedPrivateKey);
    mintKeypair = Keypair.fromSecretKey(bs58.decode(grindedPrivateKey));
    console.log("mintKeypair", mintKeypair);
    console.log("mintKeypair public key", mintKeypair.publicKey);
  }

  const ipfsFormData = new FormData();
  console.log(formData.name);

  ipfsFormData.append("file", logoFileBuffer, "logo.png");
  ipfsFormData.append("name", formData.name);
  ipfsFormData.append("symbol", formData.symbol);
  ipfsFormData.append("description", formData.description);
  ipfsFormData.append("twitter", formData.twitter);
  ipfsFormData.append("telegram", formData.telegram);
  ipfsFormData.append("website", formData.website);
  ipfsFormData.append("showName", "true");

  const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
    method: "POST",
    body: ipfsFormData,
    headers: ipfsFormData.getHeaders()
  });

  return {
    mintKeypair,
  };
}


export async function createToken2(mintSecretKey: string, deployerSecretKey: string, metadataUri: string, name: string, symbol: string, initialBuyAmount: number) {
  const signerKeyPair = Keypair.fromSecretKey(bs58.decode(deployerSecretKey));
  const mintKeypair = Keypair.fromSecretKey(bs58.decode(mintSecretKey));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  const [bondingCurve2] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()],
    programId
  );

  const associatedBondingCurve = getAssociatedTokenAddressSync(mintKeypair.publicKey, bondingCurve2, true);


  const [metadata2] = PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()], METADATA_PROGRAM_ID)

  console.log("metadata2:", metadata2);


  const encodedData = encodeCreateInstruction({
    tokenName: name,
    symbol: symbol,
    uri: metadataUri
  });

  console.log("encodedData:", encodedData);

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
      {pubkey: new PublicKey(signerKeyPair.publicKey), isSigner: true, isWritable: true},
      {pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false},
      {pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false},
      {pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false},
      {pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false},
      {pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false},
      {pubkey: programId, isSigner: false, isWritable: false}
    ],
    data: Buffer.from(encodedData, "hex")
  });

  // Create TransactionMessage
  const latestBlockhash = await connection.getLatestBlockhash();
  
  const messageV0 = new TransactionMessage({
    payerKey: signerKeyPair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [createTokenIx]
  }).compileToV0Message();

  // Create VersionedTransaction
  const versionedTransaction = new VersionedTransaction(messageV0);
  
  // Sign the transaction
  versionedTransaction.sign([signerKeyPair, mintKeypair]);

  try {
    // const simulation = await connection.simulateTransaction(versionedTransaction, {
    //   signerPubkeys: [signerKeyPair.publicKey, mintKeypair.publicKey]
    // });
    
    // if (simulation.value.err) {
    //   throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
    // }

    return {
      instruction: createTokenIx
    };
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  }
}