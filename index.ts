import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Schema, Types } from 'mongoose';

// MARK: setup
const mongoServer = await MongoMemoryServer.create();
await mongoose.connect(mongoServer.getUri());
mongoose.set({ debug: true });

// MARK: create model
type AddressInfo = {
  type: 'po-box';
  boxNumber: number;
  lastEmptied?: number;
};

type User = {
  _id: Types.ObjectId;
  name: string;
  address: AddressInfo;
};

const AddressSchema = new Schema({ invalidatedAt: Number }, { discriminatorKey: 'type', _id: false });
const UserSchema = new Schema({
  name: String,
  address: AddressSchema,
});

UserSchema.path<Schema.Types.Subdocument>('address').discriminator(
  'po-box',
  new Schema(
    {
      boxNumber: { type: Number, required: true },
      lastEmptied: Number,
    },
    { _id: false }
  )
);

const User = mongoose.model<User>('User', UserSchema, 'users');

// MARK: bug repro
const user = await User.create({
  name: 'foo',
  address: {
    type: 'po-box',
    boxNumber: 123,
  },
});

console.log(user);

await User.findByIdAndUpdate(user._id, { $set: { 'name': 'bar' } }); // works fine
await User.findByIdAndUpdate(user._id, { $set: { 'address.lastEmptied': 123 } }); // does not work

const updatedUser = await User.findById(user._id);
console.log(updatedUser);

// MARK: cleanup
await mongoose.disconnect();
await mongoServer.stop();