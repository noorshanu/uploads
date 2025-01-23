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
exports.transformTable = exports.calculateWalletsOutgo = void 0;
exports.checkValues = checkValues;
exports.getWalletTokenAccount = getWalletTokenAccount;
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const logger_1 = require("../services/logger");
const web3_js_1 = require("@solana/web3.js");
const config_1 = require("../config");
const anchor_1 = require("@coral-xyz/anchor");
function checkValues(r, n, i, e) {
    let t = n.mul(i);
    let o = n.add(e);
    let l = t.div(o).add(new anchor_1.BN(1));
    let s = i.sub(l);
    s = anchor_1.BN.min(s, r).div(new anchor_1.BN(1e6));
    return s;
}
const calculateWalletsOutgo = (devTradeAmount, initialBuyAmount, numberOfWallets, buyIncrementPercentage, tokenAccountCreationFee, priorityFee, tokenCreationFee) => __awaiter(void 0, void 0, void 0, function* () {
    const results = [];
    console.log({
        devTradeAmount,
        initialBuyAmount,
        numberOfWallets,
        buyIncrementPercentage,
        tokenAccountCreationFee,
        priorityFee,
        tokenCreationFee
    });
    const tokenDecimals = 10 ** 6;
    const tokenTotalSupply = 1000000000 * tokenDecimals;
    let initialRealSolReserves = 0;
    let initialVirtualTokenReserves = 1073000000 * tokenDecimals;
    let initialRealTokenReserves = 793100000 * tokenDecimals;
    let totalTokensBought = 0;
    let totalOutgo = 0;
    let walletBuy = initialBuyAmount;
    for (let it = 0; it <= numberOfWallets; it++) {
        let keypair;
        let solInput;
        if (it === 0) {
            solInput = devTradeAmount;
            keypair = config_1.mainWallet;
            console.log(solInput);
            const e = new anchor_1.BN(solInput * web3_js_1.LAMPORTS_PER_SOL);
            const initialVirtualSolReserves = 30 * web3_js_1.LAMPORTS_PER_SOL + initialRealSolReserves;
            const a = new anchor_1.BN(initialVirtualSolReserves).mul(new anchor_1.BN(initialVirtualTokenReserves));
            const i = new anchor_1.BN(initialVirtualSolReserves).add(e);
            const l = a.div(i).add(new anchor_1.BN(1));
            let tokensToBuy = new anchor_1.BN(initialVirtualTokenReserves).sub(l);
            tokensToBuy = anchor_1.BN.min(tokensToBuy, new anchor_1.BN(initialRealTokenReserves));
            solInput = Number(solInput) * 1.21;
            const tokensBought = tokensToBuy.toNumber();
            totalOutgo += solInput;
            results.push({
                tokenType: 'Dev',
                walletNumber: 'Wallet-Dev',
                buyAmount: Number(Number(devTradeAmount).toFixed(5)),
                transferAmount: Number(Number(solInput).toFixed(5)) + tokenCreationFee + 2 * tokenAccountCreationFee + 0.00005 + 2 * priorityFee,
                tokensBought: Number(Number(tokensBought / tokenDecimals).toFixed(0)),
            });
            initialRealSolReserves += e.toNumber();
            initialRealTokenReserves -= tokensBought;
            initialVirtualTokenReserves -= tokensBought;
            totalTokensBought += tokensBought;
        }
        else {
            solInput = walletBuy;
            keypair = web3_js_1.Keypair.generate();
            walletBuy = walletBuy * (1 + buyIncrementPercentage / 100);
            const e = new anchor_1.BN(solInput * web3_js_1.LAMPORTS_PER_SOL);
            const initialVirtualSolReserves = 30 * web3_js_1.LAMPORTS_PER_SOL + initialRealSolReserves;
            const a = new anchor_1.BN(initialVirtualSolReserves).mul(new anchor_1.BN(initialVirtualTokenReserves));
            const i = new anchor_1.BN(initialVirtualSolReserves).add(e);
            const l = a.div(i).add(new anchor_1.BN(1));
            let tokensToBuy = new anchor_1.BN(initialVirtualTokenReserves).sub(l);
            tokensToBuy = anchor_1.BN.min(tokensToBuy, new anchor_1.BN(initialRealTokenReserves));
            solInput = Number(solInput) * 1.21;
            const tokensBought = tokensToBuy.toNumber();
            totalOutgo += solInput;
            results.push({
                tokenType: 'Bundle',
                walletNumber: 'Wallet-Buyer',
                buyAmount: Number(Number(solInput).toFixed(4)),
                transferAmount: Number(Number(solInput * 1.21).toFixed(4)) + 4 * tokenAccountCreationFee + 0.001 + 4 * priorityFee,
                tokensBought: Number(Number(tokensBought / tokenDecimals).toFixed(0)),
            });
            initialRealSolReserves += e.toNumber();
            initialRealTokenReserves -= tokensBought;
            initialVirtualTokenReserves -= tokensBought;
            totalTokensBought += tokensBought;
        }
    }
    logger_1.logger.debug(`Total Outgo: ${totalOutgo.toFixed(6)} SOL`);
    logger_1.logger.debug(`Total Tokens Bought: ${totalTokensBought}`);
    return { results: results, totalOutgo: totalOutgo, totalTokensBought };
});
exports.calculateWalletsOutgo = calculateWalletsOutgo;
const customHeaders = {
    walletNumber: 'Wallet ID',
    buyAmount: 'Amount for Buy',
    transferAmount: 'Total Amount Required',
    tokensBought: 'Estimated Tokens Bought'
};
const transformTable = (data) => {
    return data.map(item => {
        const transformedItem = {};
        for (const key in item) {
            if (customHeaders[key]) {
                transformedItem[customHeaders[key]] = isNaN(item[key]) ? item[key] : Number(item[key].toFixed(4));
            }
        }
        return transformedItem;
    });
};
exports.transformTable = transformTable;
function getWalletTokenAccount(connection, wallet, tokenMint) {
    return __awaiter(this, void 0, void 0, function* () {
        const walletTokenAccount = yield connection.getTokenAccountsByOwner(wallet, {
            mint: tokenMint
        });
        return walletTokenAccount.value.map((i) => ({
            pubkey: i.pubkey,
            programId: i.account.owner,
            accountInfo: raydium_sdk_1.SPL_ACCOUNT_LAYOUT.decode(i.account.data),
        }));
    });
}
