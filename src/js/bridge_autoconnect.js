/**
 * Blackbox Bridge auto-connect module.
 *
 * When the configurator is served from the bridge (detected via the
 * /api/status endpoint), automatically set the port to WebSocket mode
 * and connect to ws://<bridge-host>/ws.
 *
 * This keeps the patch surface on the BF Configurator fork minimal —
 * only main.js imports this module.
 */

import PortHandler from "./port_handler.js";
import { set as setConfig } from "./ConfigStorage.js";

const BRIDGE_STATUS_PATH = "/api/status";
const WS_PATH = "/ws";

/**
 * Attempt to auto-connect to the bridge.
 * Called once after the app is fully initialized.
 */
export async function bridgeAutoConnect() {
    try {
        // Check if we're being served from the bridge by hitting /api/status.
        const resp = await fetch(BRIDGE_STATUS_PATH, { signal: AbortSignal.timeout(2000) });
        if (!resp.ok) return;

        const status = await resp.json();
        console.log("[BRIDGE] Detected bridge, FC connected:", status.fc_connected);

        // Build WebSocket URL relative to the current host.
        const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProto}//${location.host}${WS_PATH}`;

        // Configure the port picker for manual/WebSocket mode.
        PortHandler.portPicker.selectedPort = "manual";
        PortHandler.portPicker.portOverride = wsUrl;
        setConfig({ portOverride: wsUrl });

        if (!status.fc_connected) {
            console.log("[BRIDGE] FC not connected — skipping auto-connect, user can retry");
            return;
        }

        // Hide the firmware flasher button — flashing over WiFi isn't supported.
        const flasherBtn = document.querySelector("a.firmware_flasher_button__link");
        if (flasherBtn) {
            flasherBtn.style.display = "none";
        }

        // Trigger the connect button click after a short delay to let the UI settle.
        setTimeout(() => {
            const connectBtn = document.querySelector("a.connection_button__link");
            if (connectBtn && !connectBtn.classList.contains("disabled")) {
                console.log(`[BRIDGE] Auto-connecting to ${wsUrl}`);
                connectBtn.click();
            }
        }, 500);
    } catch {
        // Not running on the bridge — silently ignore.
    }
}
