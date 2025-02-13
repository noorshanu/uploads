// @ts-nocheck
import { AccountRole, address, appendTransactionMessageInstruction, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, createTransactionMessage, getAddressEncoder, getBase64EncodedWireTransaction, getProgramDerivedAddress, IInstruction, pipe, sendAndConfirmTransactionFactory, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners } from "@solana/web3.js"
import * as path from "path";
import { readFileSync } from "fs";
import { findAssociatedTokenPda, getCreateAssociatedTokenInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { Router } from "express";
import { Transaction } from "@solana/web3.js";


const router = Router();

router.post('/buy', async (req: Request, res: Response) => {
    // const { tokenAddress, amount } = req.body;
    const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
    const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com');

    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({rpc, rpcSubscriptions});


    const programId = address("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
    console.log("pumpfun Program ID: ", programId);

    const amount = BigInt(35254 * 1000000);
    const maxSol = BigInt(2);

    const bufferData = Buffer.alloc(24);
    bufferData.write("66063d1201daebea", "hex");
    bufferData.writeBigUInt64LE(amount, 8)
    bufferData.writeBigInt64LE(maxSol, 16)


    const data = new Uint8Array(bufferData);

    const keyPairBytes = new Uint8Array([136,34,107,110,95,157,33,195,224,112,35,249,82,205,86,16,143,30,227,78,48,11,99,135,29,248,235,186,72,59,116,243,134,181,184,37,94,215,21,36,199,66,163,58,216,245,203,211,77,69,161,141,114,205,95,247,187,26,186,42,53,102,114,242]);
    const signer = await createKeyPairSignerFromBytes(keyPairBytes);

    const mint = address("ATrBkkoJTYaRNP5HUJaZj2KQfPo4oLjhWjGftyQdXkAK");

    const addressEncoder = getAddressEncoder();

    const [bondingCurve, _b0] = await getProgramDerivedAddress({
        seeds: ["bonding-curve", addressEncoder.encode(mint)],
        programAddress: programId
    });

    console.log("Bonding Curve: ", bondingCurve);

    const [bondingCurveATA, _b1] = await findAssociatedTokenPda({
        mint,
        owner: bondingCurve,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
    });

    console.log("Bonding Curve ATA: ", bondingCurveATA);

    const [ata, _bump] = await findAssociatedTokenPda({
        mint,
        owner: signer.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
    });

    console.log("ATA: ", ata);

    const ix: IInstruction = {
        programAddress: programId,
        accounts: [
            {address: address("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), role: AccountRole.READONLY},
            {address: address("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), role: AccountRole.WRITABLE},
            {address: address(mint), role: AccountRole.READONLY},
            {address: address(bondingCurve), role: AccountRole.WRITABLE},
            {address: address(bondingCurveATA), role: AccountRole.WRITABLE},
            {address: address(ata), role: AccountRole.WRITABLE},
            {address: address(signer.address), role: AccountRole.WRITABLE_SIGNER},
            {address: address("11111111111111111111111111111111"), role: AccountRole.READONLY},
            {address: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), role: AccountRole.READONLY},
            {address: address("SysvarRent111111111111111111111111111111111"), role: AccountRole.READONLY},
            {address: address("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), role: AccountRole.READONLY},
            {address: address(programId), role: AccountRole.READONLY}
        ],
        data: data
    };

    const ataIx = getCreateAssociatedTokenInstruction({
        ata,
        mint,
        owner: signer.address,
        payer: signer
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const tx = pipe(
        createTransactionMessage({version: 0}),
        tx => setTransactionMessageFeePayer(signer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstruction(ataIx, tx),
        tx => appendTransactionMessageInstruction(ix, tx)
    );

    const signedTx = await signTransactionMessageWithSigners(tx);
    const encodedTx = getBase64EncodedWireTransaction(signedTx);

    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
        try {
            const { value: newBlockhash } = await rpc.getLatestBlockhash().send();
            
            const updatedTx = pipe(
                createTransactionMessage({version: 0}),
                tx => setTransactionMessageFeePayer(signer.address, tx),
                tx => setTransactionMessageLifetimeUsingBlockhash(newBlockhash, tx),
                tx => appendTransactionMessageInstruction(ataIx, tx),
                tx => appendTransactionMessageInstruction(ix, tx)
            );
            
            const newSignedTx = await signTransactionMessageWithSigners(updatedTx);
            
            const signature = await sendAndConfirmTransaction(newSignedTx, {
                commitment: "confirmed",
                maxRetries: 3,
                skipPreflight: true
            });
            
            console.log("Transaction confirmed! Signature:", signature);
            return res.status(200).json({ signature });
            
        } catch (error) {
            attempt++;
            if (attempt === MAX_RETRIES) {
                console.error("Failed to submit transaction after", MAX_RETRIES, "attempts:", error);
                return res.status(500).json({ error: "Transaction failed after multiple attempts" });
            }
            console.log(`Attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}); 

export default router;