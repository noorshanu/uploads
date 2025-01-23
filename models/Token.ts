import mongoose, { Document, Schema } from 'mongoose';

interface IToken extends Document {
  name: string;
  symbol: string;
  logo: string;
  telegramUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  contractAddress: string;
  owner: string;
  initialBuyAmount?: number;
}

const TokenSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  symbol: { type: String, required: true, uppercase: true, trim: true },
  logo: { type: String, required: true },
  telegramUrl: { type: String, required: false, default: '' },
  websiteUrl: { type: String, required: false, default: '' },
  twitterUrl: { type: String, required: false, default: '' },
  contractAddress: { type: String, required: true, unique: true, trim: true },
  owner: { type: String, required: true, trim: true },
  isDeployed: { type: Boolean, required: true, default: false },
  mintSecretKey: { type: String, required: false, default: '' },
  keypairType: { type: String, required: false, default: '' },
  deployerSecretKey: { type: String, required: false, default: '' },
  metadataUri: { type: String, required: false, default: '' },
  projectId: { type: String, required: true, unique: true, trim: true },
  initialBuyAmount: { type: Number, required: false, default: 0 },
}, { timestamps: true });

export default mongoose.model<IToken>('Token', TokenSchema);
