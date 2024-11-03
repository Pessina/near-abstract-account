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
- Include BTC, EVM wallet as auth methods
- Check if you can validate ownership of phone number and telegram ID as Osman did on Email