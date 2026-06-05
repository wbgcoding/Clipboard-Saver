// Windows release: no console window.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clipboard_saver_lib::run();
}
