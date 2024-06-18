import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Schema, Types } from 'mongoose';

// MARK: setup
const mongoServer = await MongoMemoryServer.create();
await mongoose.connect(mongoServer.getUri());
mongoose.set({ debug: true });

// MARK: create model
type KeyInfo = {
  id: string;
  publicKey: string;
}

type LoginInfo = {
  type: 'ssh-key';
  keys: KeyInfo[];
};


type User = {
  _id: Types.ObjectId;
  name: string;
  login: LoginInfo;
};

const LoginSchema = new Schema({}, { discriminatorKey: 'type', _id: false });
const UserSchema = new Schema({
  name: String,
  login: LoginSchema,
});

UserSchema.path<Schema.Types.Subdocument>('login').discriminator(
  'ssh-key',
  new Schema(
    {
      keys: {
        type: [{
          id: { type: String, required: true },
          publicKey: { type: String, required: true }
        }],
        default: [],
      }
    },
    { _id: false }
  )
);

const User = mongoose.model<User>('User', UserSchema, 'users');

// MARK: bug repro
let user: User | null = await User.create({
  name: 'foo',
  login: { type: 'ssh-key' },
});

console.log(user);

user = await User.findOneAndUpdate(
  { _id: user._id, 'login.type': 'ssh-key' },
  { $push: { 'login.keys': { id: '123', publicKey: 'AAA' } } },
  { new: true }
);

console.log(user);

// works fine
// user = await User.findOneAndUpdate(
//   { _id: user?._id, 'login.type': 'ssh-key' },
//   { $set: { 'login.keys': [] } },
//   { new: true }
// );

// does not work
user = await User.findOneAndUpdate(
  { _id: user?._id, 'login.type': 'ssh-key' },
  { $pull: { 'login.keys': { id: '123' } } },
  { new: true }
);

console.log(user);

// MARK: cleanup
await mongoose.disconnect();
await mongoServer.stop();