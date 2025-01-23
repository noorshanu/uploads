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
exports.valueToBase = exports.baseToValue = exports.printSPLBalance = exports.getSPLBalance = exports.printSOLBalance = void 0;
exports.getOrCreateKeypair = getOrCreateKeypair;
exports.getDiscriminator = getDiscriminator;
const bytes_1 = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const js_sha256_1 = require("js-sha256");
const fs_1 = __importDefault(require("fs"));
function getOrCreateKeypair(dir, keyName) {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    const authorityKey = dir + "/" + keyName + ".json";
    if (fs_1.default.existsSync(authorityKey)) {
        const data = JSON.parse(fs_1.default.readFileSync(authorityKey, "utf-8"));
        return web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(data.secretKey));
    }
    else {
        const keypair = web3_js_1.Keypair.generate();
        keypair.secretKey;
        fs_1.default.writeFileSync(authorityKey, JSON.stringify({
            secretKey: bytes_1.bs58.encode(keypair.secretKey),
            publicKey: keypair.publicKey.toBase58(),
        }));
        return keypair;
    }
}
const printSOLBalance = (connection_1, pubKey_1, ...args_1) => __awaiter(void 0, [connection_1, pubKey_1, ...args_1], void 0, function* (connection, pubKey, info = "") {
    const balance = yield connection.getBalance(pubKey);
    console.log(`${info ? info + " " : ""}${pubKey.toBase58()}:`, balance / web3_js_1.LAMPORTS_PER_SOL, `SOL`);
});
exports.printSOLBalance = printSOLBalance;
const getSPLBalance = (connection_1, mintAddress_1, pubKey_1, ...args_1) => __awaiter(void 0, [connection_1, mintAddress_1, pubKey_1, ...args_1], void 0, function* (connection, mintAddress, pubKey, allowOffCurve = false) {
    try {
        let ata = (0, spl_token_1.getAssociatedTokenAddressSync)(mintAddress, pubKey, allowOffCurve);
        const balance = yield connection.getTokenAccountBalance(ata, "processed");
        return balance.value.uiAmount;
    }
    catch (e) { }
    return null;
});
exports.getSPLBalance = getSPLBalance;
const printSPLBalance = (connection_1, mintAddress_1, user_1, ...args_1) => __awaiter(void 0, [connection_1, mintAddress_1, user_1, ...args_1], void 0, function* (connection, mintAddress, user, info = "") {
    const balance = yield (0, exports.getSPLBalance)(connection, mintAddress, user);
    if (balance === null) {
        console.log(`${info ? info + " " : ""}${user.toBase58()}:`, "No Account Found");
    }
    else {
        console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
    }
});
exports.printSPLBalance = printSPLBalance;
const baseToValue = (base, decimals) => {
    return base * Math.pow(10, decimals);
};
exports.baseToValue = baseToValue;
const valueToBase = (value, decimals) => {
    return value / Math.pow(10, decimals);
};
exports.valueToBase = valueToBase;
//i.e. account:BondingCurve
function getDiscriminator(name) {
    return js_sha256_1.sha256.digest(name).slice(0, 8);
}
