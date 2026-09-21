import bcrypt from 'bcryptjs';


import { prisma } from '../prisma.js';

// Password complexity rules:
// - Min 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
};

// Check if password has been used before (prevent reuse of previous passwords)
export const isPasswordReused = async (userId: string, newPasswordPlain: string): Promise<boolean> => {
  // Fetch password history for this user
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5, // Check last 5 passwords
  });

  for (const record of history) {
    const matched = await bcrypt.compare(newPasswordPlain, record.passwordHash);
    if (matched) {
      return true;
    }
  }

  // Also check the current active password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (user) {
    const matchedCurrent = await bcrypt.compare(newPasswordPlain, user.passwordHash);
    if (matchedCurrent) {
      return true;
    }
  }

  return false;
};

// Log a password change in the history
export const logPasswordChange = async (userId: string, passwordHash: string): Promise<void> => {
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  });
};
