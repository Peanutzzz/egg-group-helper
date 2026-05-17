use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortableContext {
    root_dir: String,
    data_dir: String,
    state_file: String,
    has_data_dir: bool,
    has_state_file: bool,
}

fn executable_root() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    exe.parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法定位程序所在目录".to_string())
}

fn portable_data_dir(root: &Path) -> PathBuf {
    root.join("rocom_data")
}

fn portable_state_file(root: &Path) -> PathBuf {
    root.join("rocom-user-data.json")
}

#[tauri::command]
fn get_portable_context() -> Result<PortableContext, String> {
    let root = executable_root()?;
    let data_dir = portable_data_dir(&root);
    let state_file = portable_state_file(&root);

    Ok(PortableContext {
        root_dir: root.to_string_lossy().to_string(),
        data_dir: data_dir.to_string_lossy().to_string(),
        state_file: state_file.to_string_lossy().to_string(),
        has_data_dir: data_dir.exists(),
        has_state_file: state_file.exists(),
    })
}

#[tauri::command]
fn read_portable_text(relative_path: String) -> Result<String, String> {
    let root = executable_root()?;
    let full_path = root.join(relative_path);
    fs::read_to_string(full_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_portable_state(contents: String) -> Result<(), String> {
    let root = executable_root()?;
    let state_file = portable_state_file(&root);
    fs::write(state_file, contents).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_portable_context,
            read_portable_text,
            write_portable_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
