import { MongoClient, ObjectId } from 'mongodb';
import sha1 from 'sha1';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';

/**
 * A MongoDB Client Class
 */
class DBClient {
  constructor() {
    this.client = new MongoClient(
      `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`,
    );
    this.isConnected = false;
    this.db = null;
    this.client.connect((err) => {
      if (!err) {
        this.isConnected = true;
        this.db = this.client.db(DB_DATABASE);
      }
    });
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  filesCollection() {
    return this.db.collection('files');
  }

  findUserByEmail(email) {
    return this.db.collection('users').findOne({ email });
  }

  findUserById(userId) {
    return this.db.collection('users').findOne({ _id: ObjectId(userId) });
  }

  async addUser(email, password) {
    const hashedPassword = sha1(password);
    const result = await this.db.collection('users').insertOne({
      email,
      password: hashedPassword,
    });
    return {
      email: result.ops[0].email,
      id: result.ops[0]._id,
    };
  }
}

const dBClient = new DBClient();
export default dBClient;
