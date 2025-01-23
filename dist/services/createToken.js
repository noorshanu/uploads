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
exports.createMetadata = createMetadata;
exports.createToken2 = createToken2;
const bs58_1 = __importDefault(require("bs58"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const promises_1 = __importDefault(require("fs/promises"));
const form_data_1 = __importDefault(require("form-data"));
const anchor = __importStar(require("@coral-xyz/anchor"));
const mongoose_1 = __importDefault(require("mongoose"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const decode_1 = require("./decode");
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const programId = new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_FUN_ACCOUNT = new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
// const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e";
// const rpc = createSolanaRpc(RPC_ENDPOINT);
function createMetadata(formData, keypairType, grindedPrivateKey, displayPublicKey, marketplaceId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("keypairType", keypairType);
        console.log("grindedPrivateKey", grindedPrivateKey);
        console.log("displayPublicKey", displayPublicKey);
        console.log("marketplaceId", marketplaceId);
        const logoFileBuffer = yield promises_1.default.readFile("public/logo.png");
        let mintKeypair;
        if (keypairType === "random") {
            mintKeypair = web3_js_1.Keypair.generate(); // Generate random keypair
        }
        if (keypairType === "marketplace") {
            const marketplace = yield mongoose_1.default.model('Marketplace').findById(marketplaceId);
            if (!marketplace) {
                throw new Error('Marketplace not found');
            }
            // if (marketplace.used) {
            //   throw new Error('This marketplace keypair has already been used');
            // }
            mintKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(marketplace.mintPrivateKey));
            console.log("mintKeypair public from service", mintKeypair.publicKey);
            // Mark the marketplace as used
            marketplace.used = true;
            yield marketplace.save();
        }
        if (marketplaceId === "grinded") {
            console.log("grinded private key", grindedPrivateKey);
            mintKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(grindedPrivateKey));
            console.log("mintKeypair", mintKeypair);
            console.log("mintKeypair public key", mintKeypair.publicKey);
        }
        const ipfsFormData = new form_data_1.default();
        console.log(formData.name);
        ipfsFormData.append("file", logoFileBuffer, "logo.png");
        ipfsFormData.append("name", formData.name);
        ipfsFormData.append("symbol", formData.symbol);
        ipfsFormData.append("description", formData.description);
        ipfsFormData.append("twitter", formData.twitter);
        ipfsFormData.append("telegram", formData.telegram);
        ipfsFormData.append("website", formData.website);
        ipfsFormData.append("showName", "true");
        const metadataResponse = yield (0, node_fetch_1.default)("https://pump.fun/api/ipfs", {
            method: "POST",
            body: ipfsFormData,
            headers: ipfsFormData.getHeaders()
        });
        return {
            mintKeypair,
        };
    });
}
function createToken2(mintSecretKey, deployerSecretKey, metadataUri, name, symbol, initialBuyAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        const signerKeyPair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(deployerSecretKey));
        const mintKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(mintSecretKey));
        const connection = new web3_js_1.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const [bondingCurve2] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()], programId);
        const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mintKeypair.publicKey, bondingCurve2, true);
        const [metadata2] = web3_js_1.PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("metadata"), raydium_sdk_1.METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()], raydium_sdk_1.METADATA_PROGRAM_ID);
        console.log("metadata2:", metadata2);
        const encodedData = (0, decode_1.encodeCreateInstruction)({
            tokenName: name,
            symbol: symbol,
            uri: metadataUri
        });
        console.log("encodedData:", encodedData);
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
                { pubkey: new web3_js_1.PublicKey(signerKeyPair.publicKey), isSigner: true, isWritable: true },
                { pubkey: new web3_js_1.PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
                { pubkey: new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
                { pubkey: programId, isSigner: false, isWritable: false }
            ],
            data: Buffer.from(encodedData, "hex")
        });
        // Create TransactionMessage
        const latestBlockhash = yield connection.getLatestBlockhash();
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: signerKeyPair.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [createTokenIx]
        }).compileToV0Message();
        // Create VersionedTransaction
        const versionedTransaction = new web3_js_1.VersionedTransaction(messageV0);
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
        }
        catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    });
}
