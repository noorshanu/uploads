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
exports.getUnixTs = void 0;
exports.sleep = sleep;
exports.simulateAndWriteBuys = simulateAndWriteBuys;
exports.initializeLookupTable = initializeLookupTable;
exports.sendV0Transaction = sendV0Transaction;
exports.waitForNewBlock = waitForNewBlock;
exports.getRandomUniqueNumber = getRandomUniqueNumber;
exports.sendSignedTransaction = sendSignedTransaction;
exports.sendWithConfirm = sendWithConfirm;
exports.getSolprice = getSolprice;
exports.sendSignedTransaction2 = sendSignedTransaction2;
const web3 = __importStar(require("@solana/web3.js"));
const logger_1 = require("../services/logger");
const config_1 = require("../config");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const node_fs_1 = require("node:fs");
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, ms));
    });
}
function simulateAndWriteBuys() {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenDecimals = 10 ** 6;
        const tokenTotalSupply = 1000000000 * tokenDecimals;
        let initialRealSolReserves = 0;
        let initialVirtualTokenReserves = 1073000000 * tokenDecimals;
        let initialRealTokenReserves = 793100000 * tokenDecimals;
        let totalTokensBought = 0;
        const buys = [];
        for (let it = 0; it <= 24; it++) {
            let keypair;
            let solInput;
            if (it === 0) {
                solInput = 0.1;
                solInput = Number(solInput) * 1.21;
                keypair = web3_js_1.Keypair.generate();
            }
            else {
                solInput = 0.1;
                keypair = web3_js_1.Keypair.generate();
            }
            const solAmount = solInput * web3_js_1.LAMPORTS_PER_SOL;
            if (isNaN(solAmount) || solAmount <= 0) {
                console.log(`Invalid input for wallet ${it}, skipping.`);
                continue;
            }
            const e = new bn_js_1.default(solAmount);
            const initialVirtualSolReserves = 30 * web3_js_1.LAMPORTS_PER_SOL + initialRealSolReserves;
            const a = new bn_js_1.default(initialVirtualSolReserves).mul(new bn_js_1.default(initialVirtualTokenReserves));
            const i = new bn_js_1.default(initialVirtualSolReserves).add(e);
            const l = a.div(i).add(new bn_js_1.default(1));
            let tokensToBuy = new bn_js_1.default(initialVirtualTokenReserves).sub(l);
            tokensToBuy = bn_js_1.default.min(tokensToBuy, new bn_js_1.default(initialRealTokenReserves));
            const tokensBought = tokensToBuy.toNumber();
            const percentSupply = (tokensBought / tokenTotalSupply) * 100;
            console.log(`Wallet ${it}: Bought ${tokensBought / tokenDecimals} tokens for ${e.toNumber() / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            console.log(`Wallet ${it}: Owns ${percentSupply.toFixed(4)}% of total supply\n`);
            buys.push({ pubkey: keypair.publicKey, solAmount: Number(solInput), tokenAmount: tokensToBuy, percentSupply });
            initialRealSolReserves += e.toNumber();
            initialRealTokenReserves -= tokensBought;
            initialVirtualTokenReserves -= tokensBought;
            totalTokensBought += tokensBought;
        }
        console.log("Final real sol reserves: ", initialRealSolReserves / web3_js_1.LAMPORTS_PER_SOL);
        console.log("Final real token reserves: ", initialRealTokenReserves / tokenDecimals);
        console.log("Final virtual token reserves: ", initialVirtualTokenReserves / tokenDecimals);
        console.log("Total tokens bought: ", Number((totalTokensBought / (tokenTotalSupply)).toFixed(0)));
        console.log("Total % of tokens bought: ", Number((totalTokensBought / (tokenTotalSupply)).toFixed(2)) * 100);
        console.log(); // \n
        writeBuysToFile(buys);
    });
}
function writeBuysToFile(buys) {
    let existingData = {};
    if ((0, node_fs_1.existsSync)('./info.json')) {
        existingData = JSON.parse((0, node_fs_1.readFileSync)('./info.json', "utf-8"));
    }
    // Convert buys array to an object keyed by public key
    const buysObj = buys.reduce((acc, buy) => {
        acc[buy.pubkey.toString()] = {
            solAmount: buy.solAmount.toString(),
            tokenAmount: buy.tokenAmount.toString(),
            percentSupply: buy.percentSupply,
        };
        return acc;
    }, existingData); // Initialize with existing data
    // Write updated data to file
    (0, node_fs_1.writeFileSync)('./info.json', JSON.stringify(buysObj, null, 2), "utf8");
    console.log("Buys have been successfully saved to keyinfo.json");
}
function initializeLookupTable(user, connection, addresses) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the current slot
        const slot = yield connection.getSlot();
        // Create an instruction for creating a lookup table
        // and retrieve the address of the new lookup table
        const [lookupTableInst, lookupTableAddress] = web3.AddressLookupTableProgram.createLookupTable({
            authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
            payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
            recentSlot: slot - 10, // The recent slot to derive lookup table's address
        });
        logger_1.logger.debug("lookup table address:", lookupTableAddress.toBase58());
        // Create an instruction to extend a lookup table with the provided addresses
        const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
            payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
            authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
            lookupTable: lookupTableAddress, // The address of the lookup table to extend
            addresses: addresses.slice(0, 30), // The addresses to add to the lookup table
        });
        yield sendV0Transaction(connection, user, [
            lookupTableInst,
            extendInstruction,
        ]);
        var remaining = addresses.slice(30);
        while (remaining.length > 0) {
            const toAdd = remaining.slice(0, 30);
            remaining = remaining.slice(30);
            const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
                payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
                authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
                lookupTable: lookupTableAddress, // The address of the lookup table to extend
                addresses: toAdd, // The addresses to add to the lookup table
            });
            yield sendV0Transaction(connection, user, [extendInstruction]);
        }
        return lookupTableAddress;
    });
}
function sendV0Transaction(connection, user, instructions, lookupTableAccounts) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the latest blockhash and last valid block height
        const { lastValidBlockHeight, blockhash } = yield connection.getLatestBlockhash();
        // Create a new transaction message with the provided instructions
        const messageV0 = new web3.TransactionMessage({
            payerKey: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
            recentBlockhash: blockhash, // The blockhash of the most recent block
            instructions, // The instructions to include in the transaction
        }).compileToV0Message(lookupTableAccounts);
        logger_1.logger.debug('Create a new transaction object with the message');
        const transaction = new web3.VersionedTransaction(messageV0);
        // Sign the transaction with the user's keypair
        transaction.sign([user]);
        // Send the transaction to the cluster
        const txid = yield connection.sendTransaction(transaction);
        logger_1.logger.debug('Sent transaction object with the id ' + txid);
        // Confirm the transaction
        yield connection.confirmTransaction({
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight,
            signature: txid,
        }, "finalized");
        // Log the transaction URL on the Solana Explorer
        logger_1.logger.debug(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
        return txid;
    });
}
function waitForNewBlock(connection, targetHeight) {
    logger_1.logger.debug(`Waiting for ${targetHeight} new blocks`);
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        // Get the last valid block height of the blockchain
        const { lastValidBlockHeight } = yield connection.getLatestBlockhash();
        // Set an interval to check for new blocks every 1000ms
        const intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            // Get the new valid block height
            const { lastValidBlockHeight: newValidBlockHeight } = yield connection.getLatestBlockhash();
            // logger.debug(newValidBlockHeight)
            // Check if the new valid block height is greater than the target block height
            if (newValidBlockHeight > lastValidBlockHeight + targetHeight) {
                // If the target block height is reached, clear the interval and resolve the promise
                clearInterval(intervalId);
                resolve();
            }
        }), 1000);
    }));
}
const getUnixTs = () => {
    return new Date().getTime() / 1000;
};
exports.getUnixTs = getUnixTs;
function getRandomUniqueNumber(min, max, precision) {
    const precisionFactor = Math.pow(10, precision);
    const uniqueNumbers = new Set();
    while (true) {
        const randomNumber = Math.floor(Math.random() * (max * precisionFactor - min * precisionFactor + 1) + min * precisionFactor) / precisionFactor;
        if (!uniqueNumbers.has(randomNumber)) {
            uniqueNumbers.add(randomNumber);
            return randomNumber;
        }
    }
}
function sendSignedTransaction(_a) {
    return __awaiter(this, arguments, void 0, function* ({ signedTransaction, connection, successCallback, sendingCallback, confirmStatus, timeout = config_1.CONFIRMATIONTIMEOUT, skipPreflight = true, }) {
        const rawTransaction = signedTransaction.serialize();
        const startTime = (0, exports.getUnixTs)();
        const txid = yield connection.sendRawTransaction(rawTransaction, {
            skipPreflight,
        });
        sendingCallback && sendingCallback(txid);
        console.log("Started awaiting confirmation for", txid);
        let done = false;
        (() => __awaiter(this, void 0, void 0, function* () {
            while (!done && (0, exports.getUnixTs)() - startTime < timeout) {
                connection.sendRawTransaction(rawTransaction, {
                    skipPreflight: true,
                });
                yield sleep(1000);
            }
        }))();
        try {
            yield awaitTransactionSignatureConfirmation(txid, timeout, connection, confirmStatus);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            if (err.timeout) {
                throw new Error("Timed out awaiting confirmation on transaction");
            }
            const simulateResult = yield connection.simulateTransaction(signedTransaction);
            if (simulateResult && simulateResult.value.err) {
                if (simulateResult.value.logs) {
                    for (let i = simulateResult.value.logs.length - 1; i >= 0; --i) {
                        const line = simulateResult.value.logs[i];
                        if (line.startsWith("Program log: ")) {
                            throw new Error("Transaction failed: " + line.slice("Program log: ".length));
                        }
                    }
                }
                confirmStatus(txid, 'AlreadyProcessed');
            }
            throw new Error("Transaction failed");
        }
        finally {
            done = true;
        }
        console.log("Latency", txid, Number((0, exports.getUnixTs)() - startTime).toFixed(0) + 'Seconds');
        successCallback && successCallback(txid);
        return txid;
    });
}
function awaitTransactionSignatureConfirmation(txid, timeout, connection, confirmStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        let done = false;
        const result = yield new Promise((resolve, reject) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                while (!done) {
                    // eslint-disable-next-line no-loop-func
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const signatureStatuses = yield connection.getSignatureStatuses([
                                txid,
                            ]);
                            const result = signatureStatuses && signatureStatuses.value[0];
                            if (!done) {
                                if (!result) {
                                    // console.log('REST null result for', txid, result);
                                }
                                else if (result.err) {
                                    console.log("REST error for", txid, result.confirmationStatus);
                                    done = true;
                                    confirmStatus(txid, result.confirmationStatus);
                                    reject(result.err);
                                }
                                else if (!(result.confirmations ||
                                    result.confirmationStatus === "confirmed" ||
                                    result.confirmationStatus === "finalized")) {
                                    console.log("REST not confirmed", txid, result.confirmationStatus);
                                    confirmStatus(txid, result.confirmationStatus);
                                }
                                else {
                                    console.log("REST confirmed", txid, result.confirmationStatus);
                                    confirmStatus(txid, result.confirmationStatus);
                                    done = true;
                                    resolve(result);
                                }
                            }
                        }
                        catch (e) {
                            if (!done) {
                                console.log("REST connection error: txid", txid, e);
                            }
                        }
                    }))();
                    yield sleep(1000);
                }
            }))();
        });
        done = true;
        return result;
    });
}
function sendWithConfirm(connection, transaction, payers) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { blockhash, lastValidBlockHeight } = yield connection.getLatestBlockhash();
        let blockheight = yield connection.getBlockHeight();
        let signature = '';
        while (blockheight < lastValidBlockHeight) {
            if (signature != '') {
                const a = yield connection.getSignatureStatus(signature);
                if (!((_a = a.value) === null || _a === void 0 ? void 0 : _a.err))
                    break;
            }
            const { blockhash, lastValidBlockHeight } = yield connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.sign(...payers);
            const rawTransaction = transaction.serialize();
            signature = yield connection.sendRawTransaction(rawTransaction, {
                skipPreflight: false,
            });
            console.log(`Signature: ${signature}`);
            yield sleep(500);
            blockheight = yield connection.getBlockHeight();
        }
        return signature;
    });
}
function getSolprice() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const data = yield fetch("https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/So11111111111111111111111111111111111111112");
        const json = yield data.json();
        const solPrice = (_b = (_a = json === null || json === void 0 ? void 0 : json.data) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.token_prices.So11111111111111111111111111111111111111112;
        return solPrice;
    });
}
function sendSignedTransaction2(_a) {
    return __awaiter(this, arguments, void 0, function* ({ signedTransaction, connection, successCallback, sendingCallback, confirmStatus, timeout = 30000, skipPreflight = true, }) {
        const rawTransaction = signedTransaction.serialize();
        const startTime = (0, exports.getUnixTs)();
        const txid = yield connection.sendRawTransaction(rawTransaction, {
            skipPreflight,
        });
        sendingCallback && sendingCallback(txid);
        console.log("Started awaiting confirmation for", txid);
        let done = false;
        (() => __awaiter(this, void 0, void 0, function* () {
            while (!done && (0, exports.getUnixTs)() - startTime < timeout) {
                connection.sendRawTransaction(rawTransaction, {
                    skipPreflight: true,
                });
                yield sleep(2000);
            }
        }))();
        try {
            yield awaitTransactionSignatureConfirmation(txid, timeout, connection, confirmStatus);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            if (err.timeout) {
                throw new Error("Timed out awaiting confirmation on transaction");
            }
            throw new Error("Transaction failed");
        }
        finally {
            done = true;
        }
        console.log("Latency", txid, Number((0, exports.getUnixTs)() - startTime).toFixed(0) + 'Seconds');
        successCallback && successCallback(txid);
        return txid;
    });
}
function awaitTransactionSignatureConfirmation2(txid, timeout, connection, confirmStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        let done = false;
        const result = yield new Promise((resolve, reject) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                while (!done) {
                    // eslint-disable-next-line no-loop-func
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const signatureStatuses = yield connection.getSignatureStatuses([
                                txid,
                            ]);
                            const result = signatureStatuses && signatureStatuses.value[0];
                            if (!done) {
                                if (!result) {
                                    // console.log('REST null result for', txid, result);
                                }
                                else if (result.err) {
                                    console.log("REST error for", txid, result.confirmationStatus);
                                    done = true;
                                    confirmStatus(txid, result.confirmationStatus);
                                    reject(result.err);
                                }
                                else if (!(result.confirmations ||
                                    result.confirmationStatus === "confirmed" ||
                                    result.confirmationStatus === "finalized")) {
                                    console.log("REST not confirmed", txid, result.confirmationStatus);
                                    confirmStatus(txid, result.confirmationStatus);
                                }
                                else {
                                    console.log("REST confirmed", txid, result.confirmationStatus);
                                    confirmStatus(txid, result.confirmationStatus);
                                    done = true;
                                    resolve(result);
                                }
                            }
                        }
                        catch (e) {
                            if (!done) {
                                console.log("REST connection error: txid", txid, e);
                            }
                        }
                    }))();
                    yield sleep(1000);
                }
            }))();
        });
        done = true;
        return result;
    });
}
