use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const ITERATIONS: u32 = 100_000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedData {
    pub salt: String,
    pub nonce: String,
    pub ciphertext: String,
}

pub fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, ITERATIONS, &mut key);
    key
}

pub fn encrypt(data: &[u8], password: &str) -> Result<EncryptedData, String> {
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce_bytes);

    let key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, data).map_err(|e| e.to_string())?;

    Ok(EncryptedData {
        salt: BASE64.encode(salt),
        nonce: BASE64.encode(nonce_bytes),
        ciphertext: BASE64.encode(ciphertext),
    })
}

pub fn decrypt(encrypted: &EncryptedData, password: &str) -> Result<Vec<u8>, String> {
    let salt = BASE64
        .decode(&encrypted.salt)
        .map_err(|e| format!("Invalid salt: {}", e))?;
    let nonce_bytes = BASE64
        .decode(&encrypted.nonce)
        .map_err(|e| format!("Invalid nonce: {}", e))?;
    let ciphertext = BASE64
        .decode(&encrypted.ciphertext)
        .map_err(|e| format!("Invalid ciphertext: {}", e))?;

    let key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Invalid password or corrupted data".to_string())?;

    Ok(plaintext)
}

pub fn encrypt_to_string(data: &[u8], password: &str) -> Result<String, String> {
    let encrypted = encrypt(data, password)?;
    Ok(serde_json::to_string(&encrypted).map_err(|e| e.to_string())?)
}

pub fn decrypt_from_string(encrypted_str: &str, password: &str) -> Result<Vec<u8>, String> {
    let encrypted: EncryptedData = serde_json::from_str(encrypted_str)
        .map_err(|e| format!("Invalid encrypted data: {}", e))?;
    decrypt(&encrypted, password)
}
