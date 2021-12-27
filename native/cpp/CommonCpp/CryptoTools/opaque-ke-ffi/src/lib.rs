use std::ffi::CStr;
use std::os::raw::c_char;
use std::ptr;

use opaque_ke::ciphersuite::CipherSuite;
use opaque_ke::errors::ProtocolError;
use opaque_ke::{
    ClientLogin, ClientLoginFinishParameters, ClientLoginFinishResult, ClientLoginStartParameters,
    ClientLoginStartResult, ClientRegistration, ClientRegistrationFinishParameters,
    ClientRegistrationFinishResult, ClientRegistrationStartResult, CredentialResponse,
    RegistrationResponse,
};

use rand::rngs::OsRng;
use scrypt::ScryptParams;

struct Cipher;
impl CipherSuite for Cipher {
    type Group = curve25519_dalek::ristretto::RistrettoPoint;
    type KeyExchange = opaque_ke::key_exchange::tripledh::TripleDH;
    type Hash = sha2::Sha512;
    type SlowHash = ScryptParams;
}

#[derive(PartialEq)]
#[repr(C)]
pub enum OpaqueStatus {
    Ok = 0,
    Err = 1,
}

#[repr(C)]
pub struct MessageState {
    message: *mut c_char,
    state: *mut c_char,
}

#[repr(C)]
pub struct MessageSession {
    message: *mut c_char,
    session: *mut c_char,
}

#[no_mangle]
pub unsafe extern "C" fn client_register_c(
    password: *const c_char,
    message_state: *mut MessageState,
) -> OpaqueStatus {
    let r = client_register(CStr::from_ptr(password));
    match r {
        Ok(c) => update_registration_message_state(c, message_state),
        Err(_) => OpaqueStatus::Err,
    }
}

#[no_mangle]
pub unsafe extern "C" fn client_register_finish_c(
    client_register_state: *const c_char,
    server_message: *const c_char,
    new_message_buffer: *mut c_char,
) -> OpaqueStatus {
    let client_register_state_c_str = CStr::from_ptr(client_register_state);
    let server_message_c_str = CStr::from_ptr(server_message);
    let c = client_register_finish(client_register_state_c_str, server_message_c_str).unwrap();
    let message_bytes = c.message.serialize();
    let message_encoded = base64::encode_config(message_bytes, base64::URL_SAFE_NO_PAD);
    copy_cstr(&message_encoded, new_message_buffer)
}

#[no_mangle]
pub unsafe extern "C" fn client_login_c(
    password: *const c_char,
    message_state: *mut MessageState,
) -> OpaqueStatus {
    let r = client_login(CStr::from_ptr(password));
    match r {
        Ok(c) => update_login_message_state(c, message_state),
        Err(_) => OpaqueStatus::Err,
    }
}

#[no_mangle]
pub unsafe extern "C" fn client_login_finish_c(
    client_login_state: *const c_char,
    server_message: *const c_char,
    message_session: *mut MessageSession,
) -> OpaqueStatus {
    let client_login_state_c_str = CStr::from_ptr(client_login_state);
    let server_message_c_str = CStr::from_ptr(server_message);
    let c = client_login_finish(client_login_state_c_str, server_message_c_str).unwrap();
    update_message_session(c, message_session)
}

fn client_register(
    password: &CStr,
) -> Result<ClientRegistrationStartResult<Cipher>, ProtocolError> {
    let mut client_rng = OsRng;
    ClientRegistration::<Cipher>::start(&mut client_rng, password.to_bytes())
}

fn client_register_finish(
    client_register_state: &CStr,
    server_message: &CStr,
) -> Result<ClientRegistrationFinishResult<Cipher>, ProtocolError> {
    let state = client_register_state.to_str().unwrap();
    let decoded_state = base64::decode_config(state, base64::URL_SAFE_NO_PAD).unwrap();
    let deserialized_state = ClientRegistration::<Cipher>::deserialize(&decoded_state).unwrap();

    let message = server_message.to_str().unwrap();
    let decoded_message = base64::decode_config(message, base64::URL_SAFE_NO_PAD).unwrap();
    let deserialized_message =
        RegistrationResponse::<Cipher>::deserialize(&decoded_message).unwrap();

    let mut client_rng = OsRng;
    deserialized_state.finish(
        &mut client_rng,
        deserialized_message,
        ClientRegistrationFinishParameters::Default,
    )
}

fn client_login(password: &CStr) -> Result<ClientLoginStartResult<Cipher>, ProtocolError> {
    let mut client_rng = OsRng;
    ClientLogin::<Cipher>::start(
        &mut client_rng,
        password.to_bytes(),
        ClientLoginStartParameters::default(),
    )
}

fn client_login_finish(
    client_login_state: &CStr,
    server_message: &CStr,
) -> Result<ClientLoginFinishResult<Cipher>, ProtocolError> {
    let state = client_login_state.to_str().unwrap();
    let decoded_state = base64::decode_config(state, base64::URL_SAFE_NO_PAD).unwrap();
    let deserialized_state = ClientLogin::<Cipher>::deserialize(&decoded_state).unwrap();

    let message = server_message.to_str().unwrap();
    let decoded_message = base64::decode_config(message, base64::URL_SAFE_NO_PAD).unwrap();
    let deserialized_message = CredentialResponse::<Cipher>::deserialize(&decoded_message).unwrap();

    deserialized_state.finish(deserialized_message, ClientLoginFinishParameters::default())
}

unsafe fn update_registration_message_state(
    reg_start_result: ClientRegistrationStartResult<Cipher>,
    message_state: *mut MessageState,
) -> OpaqueStatus {
    let message_bytes = reg_start_result.message.serialize();
    let state_bytes = reg_start_result.state.serialize();

    let message_encoded = base64::encode_config(message_bytes, base64::URL_SAFE_NO_PAD);
    let state_encoded = base64::encode_config(state_bytes, base64::URL_SAFE_NO_PAD);

    if copy_cstr(&message_encoded, (*message_state).message) == OpaqueStatus::Err {
        return OpaqueStatus::Err;
    }

    copy_cstr(&state_encoded, (*message_state).state)
}

// Pretty redundant... need to combine with above function using a generic type
unsafe fn update_login_message_state(
    login_start_result: ClientLoginStartResult<Cipher>,
    message_state: *mut MessageState,
) -> OpaqueStatus {
    let message_bytes = login_start_result.message.serialize().unwrap();
    let state_bytes = login_start_result.state.serialize().unwrap();

    let message_encoded = base64::encode_config(message_bytes, base64::URL_SAFE_NO_PAD);
    let state_encoded = base64::encode_config(state_bytes, base64::URL_SAFE_NO_PAD);

    if copy_cstr(&message_encoded, (*message_state).message) == OpaqueStatus::Err {
        return OpaqueStatus::Err;
    }

    copy_cstr(&state_encoded, (*message_state).state)
}

unsafe fn update_message_session(
    login_finish_result: ClientLoginFinishResult<Cipher>,
    message_session: *mut MessageSession,
) -> OpaqueStatus {
    let message_bytes = login_finish_result.message.serialize().unwrap();
    let session_bytes = login_finish_result.session_key;

    let message_encoded = base64::encode_config(message_bytes, base64::URL_SAFE_NO_PAD);
    let session_encoded = base64::encode_config(session_bytes, base64::URL_SAFE_NO_PAD);

    if copy_cstr(&message_encoded, (*message_session).message) == OpaqueStatus::Err {
        return OpaqueStatus::Err;
    }

    copy_cstr(&session_encoded, (*message_session).session)
}

unsafe fn copy_cstr(src: &str, dst: *mut c_char) -> OpaqueStatus {
    let len = src.len();
    if dst != ptr::null_mut() {
        let src = src.as_ptr().cast::<c_char>();
        src.copy_to_nonoverlapping(dst, len);
        *dst.add(len) = 0;
        return OpaqueStatus::Ok;
    }
    OpaqueStatus::Err
}
