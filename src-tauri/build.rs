fn main() {
    #[cfg(target_os = "windows")]
    {
        use std::fs;
        use std::path::Path;

        let out_dir = std::env::var("OUT_DIR").unwrap();
        let resources_dir = Path::new("resources");

        if !resources_dir.exists() {
            fs::create_dir_all(resources_dir).ok();
        }

        for dll in &["libcrypto-3-x64.dll", "libssl-3-x64.dll"] {
            let src = Path::new(&out_dir).join("deps").join(dll);
            let dest = resources_dir.join(dll);
            if src.exists() {
                fs::copy(&src, &dest).ok();
            }
        }
    }

    dotenvy::dotenv().ok();
    dotenvy::from_filename(".env.production").ok();

    if let Ok(auth) = std::env::var("BACKUP_AUTH_SECRETS") {
        println!("cargo:rustc-env=BACKUP_AUTH_SECRETS={}", auth);
    }
    if let Ok(region) = std::env::var("MY_AWS_REGION") {
        println!("cargo:rustc-env=MY_AWS_REGION={}", region);
    }
    if let Ok(bucket) = std::env::var("AWS_S3_BUCKET") {
        println!("cargo:rustc-env=AWS_S3_BUCKET={}", bucket);
    }
    if let Ok(url) = std::env::var("API_GATEWAY_URL") {
        println!("cargo:rustc-env=API_GATEWAY_URL={}", url);
    }
    if let Ok(url) = std::env::var("API_GATEWAY_KEY_URL") {
        println!("cargo:rustc-env=API_GATEWAY_KEY_URL={}", url);
    }

    tauri_build::build()
}
