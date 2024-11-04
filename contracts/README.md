# auth-smart-contracts

## TODO

- Use Action type from near crate instead of define them on this codebase
- Use Rust lib to parse input instead of manual parse input. 
  - e.g: 

    ```rust
    type Args = String; // Vec<u8>: Base64
    function_call.args.as_bytes().to_vec(),
    ```

    The type should be defined as Vec<u8> and not as String
- Check if you can validate ownership of phone number and telegram ID as Osman did on Email
  - Check if those auth methods allow to sign the tx + nonce as challenge as we do for WebAuthn to avoid replay attacks
- Include factory contract for Abstract Account generation
- Create relayer project to sponsor Near transactions
- Update multichain-tools package to support near browser wallets