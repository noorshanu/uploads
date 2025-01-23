import mongoose, { Document, Schema } from 'mongoose';

interface IMarketplace extends Document {
  mintPrivateKey: string;
  publicKey: string;  // Added publicKey field
  price: number;  // Price in SOL
  recipientPublicKey: string;
  used: boolean;
  createdAt: Date;
}

const MarketplaceSchema: Schema = new Schema({
  mintPrivateKey: { 
    type: String, 
    required: true,
    trim: true 
  },
  publicKey: {     // Added publicKey field
    type: String,
    required: true,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0 
  },
  recipientPublicKey: { 
    type: String, 
    required: true,
    trim: true 
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

export default mongoose.model<IMarketplace>('Marketplace', MarketplaceSchema);
