import { existsSync, promises } from 'fs';
import mime from 'mime-types';
import { getCurrentUser } from '../utils/auth';
import File, { FOLDER, FilesCollection } from '../utils/file';
import fileQueue from '../worker';

const { readFile } = promises;

/**
 * FilesController class to manage user files
 */
class FilesController {
  static async postUpload(request, response) {
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const {
      name, type, parentId, isPublic, data,
    } = request.body;

    try {
      const file = new File(
        currentUser.id,
        name,
        type,
        parentId,
        isPublic,
        data,
      );
      const savedFile = await file.save();
      if (savedFile.type === 'image') {
        fileQueue.add({
          userId: currentUser.id,
          fileId: savedFile.id,
        });
      }
      return response.status(201).json(savedFile);
    } catch (error) {
      return response.status(400).json({
        error: error.message,
      });
    }
  }

  static async getShow(request, response) {
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = request.params;
    const filesCollection = new FilesCollection();
    const file = await filesCollection.findUserFileById(currentUser.id, id);
    if (!file) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    return response.status(200).json(file);
  }

  static async getIndex(request, response) {
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    let { parentId, page } = request.query;
    if (parentId === '0' || !parentId) parentId = 0;
    page = Number.isNaN(page) ? 0 : Number(page);

    const filesCollection = new FilesCollection();
    const files = await filesCollection.findAllUserFilesByParentId(
      currentUser.id,
      parentId,
      page,
    );

    return response.status(200).json(files);
  }

  static async putPublish(request, response) {
    return FilesController.updatePublication(request, response, true);
  }

  static async putUnpublish(request, response) {
    return FilesController.updatePublication(request, response, false);
  }

  static async updatePublication(request, response, isPublished) {
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    const { id } = request.params;
    const filesCollection = new FilesCollection();
    const file = await filesCollection.updateFilePublication(
      currentUser.id,
      id,
      isPublished,
    );
    if (!file) {
      return response.status(404).json({
        error: 'Not found',
      });
    }
    return response.status(200).json(file);
  }

  static async getFile(request, response) {
    const currentUser = await getCurrentUser(request);

    const { id } = request.params;
    const { size } = request.query;
    const filesCollection = new FilesCollection();
    const file = await filesCollection.findPublicOrOwnFile(
      currentUser ? currentUser.id : null,
      id,
    );
    if (!file) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    if (file.type === FOLDER) {
      return response.status(400).json({
        error: "A folder doesn't have content",
      });
    }

    let filePath = file.localPath;
    if (!Number.isNaN(size) && [500, 250, 100].includes(Number(size))) {
      filePath += `_${size}`;
    }

    if (!existsSync(filePath)) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    const mimeType = mime.lookup(file.name);
    response.set('Content-Type', mimeType);
    const data = await readFile(filePath);
    return response.status(200).send(data);
  }
}

export default FilesController;
