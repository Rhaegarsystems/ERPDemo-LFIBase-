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

    tauri_build::build()
}
