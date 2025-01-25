export abstract class IdentityClass<Identity, AuthData> {
  /**
   * Get the AddIdentity information needed for registration
   * Returns format should match the contract's expected format
   */
  abstract getIdentity(args: Record<string, string>): Promise<Identity>;

  /**
   * Sign a message and return auth data needed for authentication
   * @param message - Message to sign
   */
  abstract sign(message: string): Promise<{
    authIdentity: Identity;
    credentials: AuthData;
  }>;
}
