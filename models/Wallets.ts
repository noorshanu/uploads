import mongoose, { Schema, Document } from 'mongoose';

interface IWallet extends Document {
  ownerAddress: string;
  publicKey: string;
  secretKey: Buffer;
  createdAt: Date;
  projectId: string;
}

const WalletSchema = new Schema({
  ownerAddress: {
    type: String,
    required: true,
    index: true
  },
  publicKey: {
    type: String,
    required: true,
    unique: true
  },
  secretKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  projectId: {
    type: String,
    required: true
  }
});

export default mongoose.model<IWallet>('Wallet', WalletSchema);
