// Raw message allows direct signature verification by wallets and other auth methods
pub trait SignableMessage {
    type Context<'a>;

    fn to_signed_message(&self, context: Self::Context<'_>) -> String;
}
