import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from 'bs58';

export const startBump = async (walletPrivate: string, txn_amount: number, tokenAddress: string) => {
    const keypair = Keypair.fromSecretKey(bs58.decode(walletPrivate));
    const mint = new PublicKey(tokenAddress);
    console.log(keypair.publicKey.toString(), txn_amount, mint);
}