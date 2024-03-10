import { existsSync, promises } from 'fs';
import { ObjectId } from 'mongodb';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import dBClient from './db';

export const FOLDER = 'folder';
const FILE = 'file';
const IMAGE = 'image';
const VALID_FILE_TYPES = [FOLDER, FILE, IMAGE];
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const MAX_PAGE_SIZE = 20;
const { mkdir, writeFile } = promises;

/**
 * FilesCollection class to manage file documents
 */
export class FilesCollection {
  constructor() {
    this.files = dBClient.filesCollection();
  }

  async findById(id) {
    return this.files.findOne({ _id: ObjectId(id) });
  }

  async addFile(file) {
    const result = await this.files.insertOne(file);
    const { _id, ...rest } = result.ops[0];
    return { id: _id, ...rest };
  }

  async findUserFileById(userId, fileId, removeLocalPath = true) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }
    const result = await this.files.findOne({
      userId: ObjectId(userId),
      _id: ObjectId(fileId),
    });
    if (!result) {
      return null;
    }
    if (removeLocalPath) {
      return FilesCollection.removeLocalPath(
        FilesCollection.replaceDefaultMongoId(result),
      );
    }
    return FilesCollection.replaceDefaultMongoId(result);
  }

  async findPublicOrOwnFile(userId, fileId) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }

    const result = await this.files.findOne({
      _id: ObjectId(fileId),
    });
    if (!result) {
      return null;
    }

    if (!result.isPublic && (!userId || !result.userId.equals(userId))) {
      return null;
    }

    if (result.type !== FOLDER && !existsSync(result.localPath)) {
      return null;
    }

    return FilesCollection.replaceDefaultMongoId(result);
  }

  async findAllUserFilesByParentId(userId, parentId, page) {
    let query = { userId: ObjectId(userId) };

    if (parentId !== 0) {
      if (!ObjectId.isValid(parentId)) {
        return [];
      }
      const parent = await this.findById(parentId);
      if (!parent || parent.type !== FOLDER) {
        return [];
      }
      query = {
        ...query,
        parentId: ObjectId(parentId),
      };
    }
    const results = await this.files
      .find(query)
      .skip(page * MAX_PAGE_SIZE)
      .limit(MAX_PAGE_SIZE)
      .toArray();
    return results
      .map(FilesCollection.replaceDefaultMongoId)
      .map(FilesCollection.removeLocalPath);
  }

  async updateFilePublication(userId, fileId, isPublished) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }
    const result = await this.files.updateOne(
      {
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      },
      { $set: { isPublic: isPublished } },
    );
    if (result.matchedCount !== 1) {
      return null;
    }
    const doc = await this.findById(fileId);
    return FilesCollection.removeLocalPath(
      FilesCollection.replaceDefaultMongoId(doc),
    );
  }

  static replaceDefaultMongoId(document) {
    const { _id, ...rest } = document;
    return { id: _id, ...rest };
  }

  static removeLocalPath(document) {
    const doc = { ...document };
    delete doc.localPath;
    return doc;
  }
}

/**
 * A File class that represents a file document
 */
export default class File {
  constructor(userId, name, type, parentId, isPublic, data) {
    this.userId = userId;
    this.name = name;
    this.type = type;
    this.parentId = parentId || 0;
    this.isPublic = isPublic || false;
    this.data = data;
    this.filesCollection = new FilesCollection();
  }

  async validate() {
    if (!this.name) {
      return 'Missing name';
    }

    if (!this.type || !VALID_FILE_TYPES.includes(this.type)) {
      return 'Missing type';
    }

    if (!this.data && this.type !== FOLDER) {
      return 'Missing data';
    }

    if (this.parentId) {
      const parent = await this.filesCollection.findById(this.parentId);
      if (!parent) {
        return 'Parent not found';
      }

      if (parent.type !== FOLDER) {
        return 'Parent is not a folder';
      }
    }

    return null;
  }

  async save() {
    const error = await this.validate();
    if (error) {
      throw new Error(error);
    }

    if (this.type === FOLDER) {
      return this.filesCollection.addFile({
        userId: ObjectId(this.userId),
        name: this.name,
        type: FOLDER,
        parentId: this.parentId,
      });
    }
    await mkdir(FOLDER_PATH, { recursive: true });
    const localPath = join(FOLDER_PATH, uuidv4());
    await writeFile(localPath, Buffer.from(this.data, 'base64'));
    return this.filesCollection.addFile({
      userId: ObjectId(this.userId),
      name: this.name,
      type: this.type,
      isPublic: this.isPublic,
      parentId: this.parentId ? ObjectId(this.parentId) : 0,
      localPath,
    });
  }
}
