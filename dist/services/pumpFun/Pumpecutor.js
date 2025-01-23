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
const web3_js_1 = require("@solana/web3.js");
const PumpFunProgram_1 = require("../pumpFun/PumpFunProgram");
const anchor_1 = require("@coral-xyz/anchor");
const wallet_1 = require("../pumpFun/wallet");
const spl_token_1 = require("@solana/spl-token");
const config_1 = require("../config");
class PumpeCutor {
    constructor(mint, globalPublicKey, feeRecipient, bondingCurve, associatedBondingCurve, wallet) {
        this.mint = mint;
        this.globalPublicKey = globalPublicKey;
        this.feeRecipient = feeRecipient;
        this.bondingCurve = bondingCurve;
        this.associatedBondingCurve = associatedBondingCurve;
        this.wallet = wallet;
        this.createBuyTransaction = (tokenAmountOut, solAmountIn, priorityFees) => __awaiter(this, void 0, void 0, function* () {
            console.log(' Creating Token Buy Transaction for ' + this.wallet.publicKey.toBase58());
            const associatedAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(this.mint, this.wallet.publicKey, true);
            const keys = [
                { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: associatedAddress, isSigner: false, isWritable: true },
                { pubkey: this.wallet.publicKey, isSigner: false, isWritable: false },
                { pubkey: this.mint, isSigner: false, isWritable: false },
                { pubkey: web3_js_1.SystemProgram.programId, "isSigner": false, "isWritable": false },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, "isSigner": false, "isWritable": false },
            ];
            const tnxs = new web3_js_1.TransactionInstruction({
                keys,
                programId: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
                data: Buffer.from([0x1]),
            });
            const buyTnx = [];
            const ataInst = (0, spl_token_1.createAssociatedTokenAccountInstruction)(this.wallet.publicKey, associatedAddress, this.wallet.publicKey, this.mint);
            const buytnx = yield this.pfProgram.methods.buy(tokenAmountOut, solAmountIn).accounts({
                global: this.globalPublicKey,
                feeRecipient: this.feeRecipient,
                mint: this.mint,
                bondingCurve: this.bondingCurve,
                associatedBondingCurve: this.associatedBondingCurve,
                associatedUser: associatedAddress
            }).instruction();
            buyTnx.push(ataInst);
            buyTnx.push(buytnx);
            return buyTnx;
        });
        this.programID = new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
        this.provider = new anchor_1.AnchorProvider(config_1.connection, new wallet_1.CustomWallet(wallet), anchor_1.AnchorProvider.defaultOptions());
        this.pfProgram = (0, PumpFunProgram_1.pumpFunProgram)({
            provider: this.provider,
            programId: this.programID,
        });
    }
}
exports.default = PumpeCutor;
