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
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const config_1 = require("../config");
const PumpFunProgram_1 = require("./PumpFunProgram");
const wallet_1 = require("./wallet");
const index_1 = require("../config/index");
class PumpFun {
    constructor() {
        this.getGlobal = () => __awaiter(this, void 0, void 0, function* () {
            const global = new web3_js_1.PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
            const globalVars = yield this.pfProgram.account['global'].fetch(global);
            return globalVars;
        });
        this.programID = new web3_js_1.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
        this.provider = new anchor_1.AnchorProvider(index_1.connection, new wallet_1.CustomWallet(config_1.mainWallet), anchor_1.AnchorProvider.defaultOptions());
        this.pfProgram = (0, PumpFunProgram_1.pumpFunProgram)({
            provider: this.provider,
            programId: this.programID,
        });
    }
}
exports.default = PumpFun;
