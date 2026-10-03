import { Request, Response, NextFunction } from 'express';
import { getAdminAuth, getAdminDb, isFirebaseAdminReady } from '../firebaseAdmin.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  isPremium: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * requireAuth middleware
 * Strictly verifies real Firebase ID Tokens via Firebase Admin SDK.
 * Prohibits fake tokens, slice, replace, or client-supplied UIDs.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Cabeçalho Authorization com token Bearer é obrigatório.',
      },
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Token de autenticação ausente ou em formato inválido.',
      },
    });
    return;
  }

  // Check if Firebase Admin is initialized
  if (!isFirebaseAdminReady()) {
    // Only in explicit non-production DEMO_MODE allow simulated verification
    if (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true') {
      console.warn('[requireAuth] MODO DEMO ATIVO: Firebase Admin ausente. Apenas para testes locais isolados.');
      req.user = {
        uid: 'demo_user_authenticated_dev',
        email: 'demo@calu.ai',
        emailVerified: true,
        isPremium: false,
      };
      next();
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Serviço de autenticação Firebase Admin não inicializado no servidor.',
      },
    });
    return;
  }

  try {
    // REAL server-side verification using Firebase Admin SDK
    const decodedToken = await getAdminAuth().verifyIdToken(token, true);

    if (!decodedToken || !decodedToken.uid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token de autenticação inválido.',
        },
      });
      return;
    }

    // Determine user plan strictly on the server from Firestore (Anti-bypass)
    let isPremium = false;
    try {
      const db = getAdminDb();
      const profileSnap = await db.doc(`users/${decodedToken.uid}/preferences/profile`).get();
      if (profileSnap.exists) {
        const data = profileSnap.data();
        isPremium = data?.plan === 'premium';
      }
    } catch (dbErr: any) {
      // In case of transient DB read error, default safely to isPremium = false
      console.warn('[requireAuth] Não foi possível verificar plano no Firestore:', dbErr.message);
      isPremium = false;
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      isPremium,
    };

    next();
  } catch (error: any) {
    const errorCode = error.code || '';
    console.error('[requireAuth] Falha na validação do Firebase ID Token:', errorCode, error.message);

    if (errorCode === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_EXPIRED',
          message: 'Sua sessão expirou. Por favor, autentique-se novamente.',
        },
      });
      return;
    }

    if (errorCode === 'auth/id-token-revoked') {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REVOKED',
          message: 'A sessão foi revogada. Por favor, faça login novamente.',
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token de autenticação inválido ou rejeitado pelo Firebase.',
      },
    });
    return;
  }
}
