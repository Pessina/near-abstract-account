export abstract class AuthIdentity<AuthIdentityType, AuthData> {
  /**
   * Get the identity information needed for registration
   * Returns format should match the contract's expected format
   */
  abstract getAuthIdentity(
    args: Record<string, string>
  ): Promise<AuthIdentityType | null>;

  /**
   * Sign a message and return auth data needed for authentication
   * @param message - Message to sign
   */
  abstract sign(message: string): Promise<AuthData | null>;
}
