import mongoose, { Schema, Document } from 'mongoose';

interface IBumpWallet extends Document {
    address: string;
    privateKey: string;
    amountFunded: number;
}

const BumpWalletSchema: Schema = new Schema({
    address: { type: String, required: true },
    privateKey: { type: String, required: true },
    amountFunded: { type: Number, required: true },
    txnAmount: { type: Number, required: true },
    bumps: { type: Number, required: true }
});

const BumpWallet = mongoose.model<IBumpWallet>('BumpWallet', BumpWalletSchema);

export default BumpWallet;
