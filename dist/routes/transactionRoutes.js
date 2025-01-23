"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const web3_js_1 = require("@solana/web3.js");
const token_1 = require("@solana-program/token");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/buy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const { tokenAddress, amount } = req.body;
    const rpc = (0, web3_js_1.createSolanaRpc)("https://api.mainnet-beta.solana.com");
    const rpcSubscriptions = (0, web3_js_1.createSolanaRpcSubscriptions)('wss://api.mainnet-beta.solana.com');
    const sendAndConfirmTransaction = (0, web3_js_1.sendAndConfirmTransactionFactory)({ rpc, rpcSubscriptions });
    const programId = (0, web3_js_1.address)("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
    console.log("pumpfun Program ID: ", programId);
    const amount = BigInt(35254 * 1000000);
    const maxSol = BigInt(2);
    const bufferData = Buffer.alloc(24);
    bufferData.write("66063d1201daebea", "hex");
    bufferData.writeBigUInt64LE(amount, 8);
    bufferData.writeBigInt64LE(maxSol, 16);
    const data = new Uint8Array(bufferData);
    const keyPairBytes = new Uint8Array([136, 34, 107, 110, 95, 157, 33, 195, 224, 112, 35, 249, 82, 205, 86, 16, 143, 30, 227, 78, 48, 11, 99, 135, 29, 248, 235, 186, 72, 59, 116, 243, 134, 181, 184, 37, 94, 215, 21, 36, 199, 66, 163, 58, 216, 245, 203, 211, 77, 69, 161, 141, 114, 205, 95, 247, 187, 26, 186, 42, 53, 102, 114, 242]);
    const signer = yield (0, web3_js_1.createKeyPairSignerFromBytes)(keyPairBytes);
    const mint = (0, web3_js_1.address)("ATrBkkoJTYaRNP5HUJaZj2KQfPo4oLjhWjGftyQdXkAK");
    const addressEncoder = (0, web3_js_1.getAddressEncoder)();
    const [bondingCurve, _b0] = yield (0, web3_js_1.getProgramDerivedAddress)({
        seeds: ["bonding-curve", addressEncoder.encode(mint)],
        programAddress: programId
    });
    console.log("Bonding Curve: ", bondingCurve);
    const [bondingCurveATA, _b1] = yield (0, token_1.findAssociatedTokenPda)({
        mint,
        owner: bondingCurve,
        tokenProgram: token_1.TOKEN_PROGRAM_ADDRESS
    });
    console.log("Bonding Curve ATA: ", bondingCurveATA);
    const [ata, _bump] = yield (0, token_1.findAssociatedTokenPda)({
        mint,
        owner: signer.address,
        tokenProgram: token_1.TOKEN_PROGRAM_ADDRESS
    });
    console.log("ATA: ", ata);
    const ix = {
        programAddress: programId,
        accounts: [
            { address: (0, web3_js_1.address)("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), role: web3_js_1.AccountRole.READONLY },
            { address: (0, web3_js_1.address)("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), role: web3_js_1.AccountRole.WRITABLE },
            { address: (0, web3_js_1.address)(mint), role: web3_js_1.AccountRole.READONLY },
            { address: (0, web3_js_1.address)(bondingCurve), role: web3_js_1.AccountRole.WRITABLE },
            { address: (0, web3_js_1.address)(bondingCurveATA), role: web3_js_1.AccountRole.WRITABLE },
            { address: (0, web3_js_1.address)(ata), role: web3_js_1.AccountRole.WRITABLE },
            { address: (0, web3_js_1.address)(signer.address), role: web3_js_1.AccountRole.WRITABLE_SIGNER },
            { address: (0, web3_js_1.address)("11111111111111111111111111111111"), role: web3_js_1.AccountRole.READONLY },
            { address: (0, web3_js_1.address)("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), role: web3_js_1.AccountRole.READONLY },
            { address: (0, web3_js_1.address)("SysvarRent111111111111111111111111111111111"), role: web3_js_1.AccountRole.READONLY },
            { address: (0, web3_js_1.address)("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), role: web3_js_1.AccountRole.READONLY },
            { address: (0, web3_js_1.address)(programId), role: web3_js_1.AccountRole.READONLY }
        ],
        data: data
    };
    const ataIx = (0, token_1.getCreateAssociatedTokenInstruction)({
        ata,
        mint,
        owner: signer.address,
        payer: signer
    });
    const { value: latestBlockhash } = yield rpc.getLatestBlockhash().send();
    const tx = (0, web3_js_1.pipe)((0, web3_js_1.createTransactionMessage)({ version: 0 }), tx => (0, web3_js_1.setTransactionMessageFeePayer)(signer.address, tx), tx => (0, web3_js_1.setTransactionMessageLifetimeUsingBlockhash)(latestBlockhash, tx), tx => (0, web3_js_1.appendTransactionMessageInstruction)(ataIx, tx), tx => (0, web3_js_1.appendTransactionMessageInstruction)(ix, tx));
    const signedTx = yield (0, web3_js_1.signTransactionMessageWithSigners)(tx);
    const encodedTx = (0, web3_js_1.getBase64EncodedWireTransaction)(signedTx);
    const MAX_RETRIES = 3;
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const { value: newBlockhash } = yield rpc.getLatestBlockhash().send();
            const updatedTx = (0, web3_js_1.pipe)((0, web3_js_1.createTransactionMessage)({ version: 0 }), tx => (0, web3_js_1.setTransactionMessageFeePayer)(signer.address, tx), tx => (0, web3_js_1.setTransactionMessageLifetimeUsingBlockhash)(newBlockhash, tx), tx => (0, web3_js_1.appendTransactionMessageInstruction)(ataIx, tx), tx => (0, web3_js_1.appendTransactionMessageInstruction)(ix, tx));
            const newSignedTx = yield (0, web3_js_1.signTransactionMessageWithSigners)(updatedTx);
            const signature = yield sendAndConfirmTransaction(newSignedTx, {
                commitment: "confirmed",
                maxRetries: 3,
                skipPreflight: true
            });
            console.log("Transaction confirmed! Signature:", signature);
            return res.status(200).json({ signature });
        }
        catch (error) {
            attempt++;
            if (attempt === MAX_RETRIES) {
                console.error("Failed to submit transaction after", MAX_RETRIES, "attempts:", error);
                return res.status(500).json({ error: "Transaction failed after multiple attempts" });
            }
            console.log(`Attempt ${attempt} failed, retrying...`);
            yield new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}));
exports.default = router;
