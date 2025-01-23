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
exports.onBundleResult = void 0;
exports.sendBundlesOld = sendBundlesOld;
exports.sendBundles = sendBundles;
exports.sendBundlesForCreate = sendBundlesForCreate;
// @ts-nocheck
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const jito = __importStar(require("jito-ts"));
const MEMO_PROGRAM_ID = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
function sendBundlesOld(bundleLimit, keypair, transactions) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Starting sendBundles with ${transactions.length} transactions`);
        const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
        console.log('Connecting to Jito block engine:', blockEngineUrl);
        const client = jito.searcher.searcherClient(blockEngineUrl);
        const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield client.getTipAccounts())[0]);
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
                const { blockhash } = yield con2.getLatestBlockhash('confirmed');
                yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let bundleTimeout;
                    // Only reject on explicit errors
                    const onError = (error) => {
                        console.error(`Chunk ${i + 1} error in onBundleResult:`, error);
                        clearTimeout(bundleTimeout);
                        reject(error);
                    };
                    try {
                        client.onBundleResult(() => {
                            clearTimeout(bundleTimeout);
                            resolve(undefined);
                        }, onError);
                        const bundle = new jito.bundle.Bundle(chunks[i], bundleLimit);
                        console.log(`Sending chunk ${i + 1} bundle to Jito...`);
                        const bundleId = yield client.sendBundle(bundle);
                        console.log(`Chunk ${i + 1} bundle sent with ID:`, bundleId);
                        // Assume success after timeout if no explicit error
                        bundleTimeout = setTimeout(() => {
                            console.log(`Chunk ${i + 1}: No bundle result received, assuming success`);
                            resolve(undefined);
                        }, 500);
                    }
                    catch (error) {
                        console.error(`Chunk ${i + 1} error sending bundle:`, error);
                        reject(error);
                    }
                }));
            }
            catch (error) {
                // Only throw if it's an explicit error, not a timeout
                if (error.message && !error.message.includes('timeout')) {
                    throw error;
                }
            }
        }
        console.log('All bundles processed without explicit errors - assuming success');
    });
}
;
function sendBundles(bundleLimit, keypair, transactions) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Starting sendBundles with ${transactions.length} transactions`);
        const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
        console.log('Connecting to Jito block engine:', blockEngineUrl);
        const client = jito.searcher.searcherClient(blockEngineUrl);
        const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield client.getTipAccounts())[0]);
        console.log('Got Jito tip account:', JITO_TIP_ACCOUNT.toString());
        if (transactions.length === 0) {
            console.log('No transactions to process');
            return;
        }
        const rpcConnection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com", 'confirmed');
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
            const { blockhash } = yield rpcConnection.getLatestBlockhash('confirmed');
            console.log(`Got fresh blockhash for chunk ${i + 1}:`, blockhash);
            yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let bundleResultReceived = false;
                let bundleTimeout;
                const onSuccess = (bundleResult) => {
                    var _a, _b, _c;
                    console.log(`Chunk ${i + 1} bundle result received:`, bundleResult);
                    bundleResultReceived = true;
                    clearTimeout(bundleTimeout);
                    // Check if bundle was partially processed (which is actually a success case)
                    if ((_c = (_b = (_a = bundleResult.rejected) === null || _a === void 0 ? void 0 : _a.droppedBundle) === null || _b === void 0 ? void 0 : _b.msg) === null || _c === void 0 ? void 0 : _c.includes('Bundle partially processed')) {
                        console.log(`Chunk ${i + 1} bundle partially processed - considering as success`);
                        resolve(undefined);
                        return;
                    }
                    if (bundleResult.rejected) {
                        console.log(`Chunk ${i + 1} bundle rejected`, bundleResult);
                        reject(new Error(`Bundle rejected: ${JSON.stringify(bundleResult)}`));
                    }
                    else if (bundleResult.dropped) {
                        console.log(`Chunk ${i + 1} bundle dropped`, bundleResult);
                        reject(new Error(`Bundle dropped: ${JSON.stringify(bundleResult)}`));
                    }
                    else {
                        console.log(`Chunk ${i + 1} bundle accepted or no error detected`);
                        resolve(undefined);
                    }
                };
                const onError = (error) => {
                    console.error(`Chunk ${i + 1} error in onBundleResult:`, error);
                    bundleResultReceived = true;
                    clearTimeout(bundleTimeout);
                    reject(error);
                };
                try {
                    client.onBundleResult(onSuccess, onError);
                    const bundleTransactions = chunks[i];
                    const tipMessage = new web3_js_1.TransactionMessage({
                        payerKey: keypair.publicKey,
                        recentBlockhash: blockhash,
                        instructions: [
                            web3_js_1.SystemProgram.transfer({
                                fromPubkey: keypair.publicKey,
                                toPubkey: JITO_TIP_ACCOUNT,
                                lamports: 0.001 * web3_js_1.LAMPORTS_PER_SOL,
                            })
                        ]
                    }).compileToV0Message();
                    const tipTransaction = new web3_js_1.VersionedTransaction(tipMessage);
                    tipTransaction.sign([keypair]);
                    bundleTransactions.unshift(tipTransaction);
                    const bundle = new jito.bundle.Bundle(bundleTransactions, bundleLimit);
                    console.log(`Sending chunk ${i + 1} bundle to Jito...`);
                    const bundleId = yield client.sendBundle(bundle);
                    console.log(`Chunk ${i + 1} bundle sent with ID:`, bundleId);
                    // Set timeout to resolve if no bundle result is received
                    bundleTimeout = setTimeout(() => {
                        if (!bundleResultReceived) {
                            console.log(`Chunk ${i + 1}: No bundle result received, assuming success`);
                            resolve(undefined);
                        }
                    }, 1000); // Reduced from 5000ms to 1000ms (1 second)
                }
                catch (error) {
                    console.error(`Chunk ${i + 1} error sending bundle:`, error);
                    reject(error);
                }
            }));
        }
        console.log('All chunks processed successfully');
    });
}
;
function sendBundlesForCreate(bundleLimit, keypair, transactions) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Starting sendBundlesForCreate with ${transactions.length} transactions`);
        const blockEngineUrl = "frankfurt.mainnet.block-engine.jito.wtf";
        console.log('Connecting to Jito block engine:', blockEngineUrl);
        const client = jito.searcher.searcherClient(blockEngineUrl);
        const JITO_TIP_ACCOUNT = new web3_js_1.PublicKey((yield client.getTipAccounts())[0]);
        console.log('Got Jito tip account:', JITO_TIP_ACCOUNT.toString());
        if (transactions.length === 0) {
            console.log('No transactions to process');
            return;
        }
        const rpcConnection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com", 'confirmed');
        const { blockhash } = yield rpcConnection.getLatestBlockhash('confirmed');
        console.log(`Got fresh blockhash:`, blockhash);
        yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let bundleResultReceived = false;
            let bundleTimeout;
            const onSuccess = (bundleResult) => {
                var _a, _b, _c;
                console.log(`Bundle result received:`, bundleResult);
                bundleResultReceived = true;
                clearTimeout(bundleTimeout);
                if ((_c = (_b = (_a = bundleResult.rejected) === null || _a === void 0 ? void 0 : _a.droppedBundle) === null || _b === void 0 ? void 0 : _b.msg) === null || _c === void 0 ? void 0 : _c.includes('Bundle partially processed')) {
                    console.log(`Bundle partially processed - considering as success`);
                    resolve(undefined);
                    return;
                }
                if (bundleResult.rejected) {
                    console.log(`Bundle rejected`, bundleResult);
                    reject(new Error(`Bundle rejected: ${JSON.stringify(bundleResult)}`));
                }
                else if (bundleResult.dropped) {
                    console.log(`Bundle dropped`, bundleResult);
                    reject(new Error(`Bundle dropped: ${JSON.stringify(bundleResult)}`));
                }
                else {
                    console.log(`Bundle accepted or no error detected`);
                    resolve(undefined);
                }
            };
            const onError = (error) => {
                console.error(`Error in onBundleResult:`, error);
                bundleResultReceived = true;
                clearTimeout(bundleTimeout);
                reject(error);
            };
            try {
                client.onBundleResult(onSuccess, onError);
                const bundle = new jito.bundle.Bundle(transactions, bundleLimit);
                console.log(`Sending bundle to Jito...`);
                const bundleId = yield client.sendBundle(bundle);
                console.log(`Bundle sent with ID:`, bundleId);
                // Set timeout to resolve if no bundle result is received
                bundleTimeout = setTimeout(() => {
                    if (!bundleResultReceived) {
                        console.log(`No bundle result received, assuming success`);
                        resolve(undefined);
                    }
                }, 1000); // 1 second timeout
            }
            catch (error) {
                console.error(`Error sending bundle:`, error);
                reject(error);
            }
        }));
        console.log('Bundle processed successfully');
    });
}
;
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
const onBundleResult = (c) => {
    console.log("Setting up bundle result listener");
    c.onBundleResult(result => {
        console.log('received bundle result:', result);
    }, e => {
        throw e;
    });
};
exports.onBundleResult = onBundleResult;
const buildMemoTransaction = (keypair, message, recentBlockhash) => {
    const ix = new web3_js_1.TransactionInstruction({
        keys: [
            {
                pubkey: keypair.publicKey,
                isSigner: true,
                isWritable: true,
            },
        ],
        programId: new web3_js_1.PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(message),
    });
    const instructions = [ix];
    const messageV0 = new web3_js_1.TransactionMessage({
        payerKey: keypair.publicKey,
        recentBlockhash: recentBlockhash,
        instructions,
    }).compileToV0Message();
    const tx = new web3_js_1.VersionedTransaction(messageV0);
    tx.sign([keypair]);
    console.log('txn signature is: ', bs58_1.default.encode(tx.signatures[0]));
    return tx;
};
