import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * AppController class
 */
class AppController {
  /**
   * getStatus - check the status of the API
   * @param {Object} request - request object
   * @param {Object} response - response object
   * @return {void}
   */
  static getStatus(request, response) {
    response.statusCode = 200;
    response.send({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  static async getStats(request, response) {
    response.statusCode = 200;
    response.send({
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    });
  }
}

export default AppController;
