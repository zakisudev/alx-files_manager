import {
  authenticateUser,
  deleteSessionToken,
  generateSessionToken,
  getBasicAuthToken,
  getCurrentUser,
  getSessionToken,
} from '../utils/auth';

/**
 * AuthController class to handle authentication
 */
class AuthController {
  static async getConnect(request, response) {
    const { email, password } = getBasicAuthToken(request);
    if (!email || !password) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    const token = await generateSessionToken(user._id);
    return response.status(200).json(token);
  }

  static async getDisconnect(request, response) {
    const token = getSessionToken(request);
    if (!token) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const result = await deleteSessionToken(token);
    if (!result) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    return response.sendStatus(204);
  }

  static async getMe(request, response) {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    return response.status(200).json(currentUser);
  }
}

export default AuthController;
