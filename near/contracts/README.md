# auth-smart-contracts

## TODO

- Check if you can validate ownership of phone number and telegram ID as Osman did on Email
  - Check if those auth methods allow to sign the tx + nonce as challenge as we do for WebAuthn to avoid replay attacks
- Create relayer project to sponsor Near transactions
- Investigate if you should use auth contracts or just make them utility function and call on the main contracts
  - Issue with OIDC contract as it has state that has to be update by external oracle
- Add Storage Management standard to this contract
- The Auth Identities should include permissions
