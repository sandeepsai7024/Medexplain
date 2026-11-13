import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { auditLogs, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || '',
        consentGrantedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || '',
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to upsert user:', error);
    throw new Error('Database error while synchronizing user profile.', {
      cause: error,
    });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] ?? null;
  } catch (error) {
    console.error('Failed to fetch user by UID:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: {
    preferredCountry?: string;
    preferredLanguage?: string;
    largePrintEnabled?: boolean;
    role?: string;
  }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    throw new Error('Failed to save user preferences.', { cause: error });
  }
}

export async function deleteUserAccountData(uid: string, email: string) {
  try {
    const existing = await getUserByUid(uid);
    if (!existing) return false;

    await db.insert(auditLogs).values({
      actorUid: uid,
      actorEmail: email,
      actorRole: existing.role,
      action: 'USER_DATA_DELETION_REQUESTED',
      targetType: 'user',
      targetId: uid,
      details: { compliance: 'UK_GDPR_ART_17_INDIA_DPDP' },
    });

    await db.delete(users).where(eq(users.uid, uid));
    return true;
  } catch (error) {
    console.error('Failed to delete user data:', error);
    throw new Error('Failed to delete user account data.', { cause: error });
  }
}
