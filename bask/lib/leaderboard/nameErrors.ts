export class LeaderboardNameTakenError extends Error {
  constructor() {
    super('This name is already taken. Try another.');
    this.name = 'LeaderboardNameTakenError';
  }
}

export function isAnonymousNameTakenError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  return (
    message.includes('anonymous_name_taken') ||
    message.includes('idx_leaderboard_users_anonymous_name') ||
    message.includes('leaderboard_users_anonymous_name')
  );
}
