import mongoose, { Document, Schema } from 'mongoose';

interface IProject extends Document {
  id: string;
  name: string;
  description: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: false, default: '' },
  owner: { type: String, required: true, trim: true },
}, { timestamps: true });

export default mongoose.model<IProject>('Project', ProjectSchema);


