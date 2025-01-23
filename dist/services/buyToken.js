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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const pumpdotfun_sdk_1 = require("pumpdotfun-sdk");
const nodewallet_1 = __importDefault(require("@coral-xyz/anchor/dist/cjs/nodewallet"));
const anchor_1 = require("@coral-xyz/anchor");
const bs58_1 = __importDefault(require("bs58"));
const getProvider = () => {
    const connection = new web3_js_1.Connection("https://mainnet.helius-rpc.com/?api-key=f0c11eb0-ccc8-4f5f-afb3-b11308f4e46e");
    const wallet = new nodewallet_1.default(new web3_js_1.Keypair());
    return new anchor_1.AnchorProvider(connection, wallet, { commitment: "finalized" });
};
const buyTokens = () => __awaiter(void 0, void 0, void 0, function* () {
    const provider = getProvider();
    const sdk = new pumpdotfun_sdk_1.PumpFunSDK(provider);
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode("2VyTa5ypPuSwhXYL9ZHxaVhyZ6DqAj9KfD9HZ4YX2VoizRM8tJGgRAiYhrYZwxNdYEBQodh36mU2STP16RXXmHYM"));
    const SLIPPAGE_BASIS_POINTS = 100n;
    const buyResults = yield sdk.buy(keypair, new web3_js_1.PublicKey("DMsgAFxBi2jfryEHAJQpwBUScmw1yEUAXhpQgcj8pump"), BigInt(0.00001 * web3_js_1.LAMPORTS_PER_SOL), SLIPPAGE_BASIS_POINTS, {
        unitLimit: 250000,
        unitPrice: 250000,
    });
    if (buyResults.success) {
        console.log("Buy successful");
    }
    else {
        console.log("Buy failed");
    }
});
const sellTokens = () => __awaiter(void 0, void 0, void 0, function* () {
});
exports.default = buyTokens;
