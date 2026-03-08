/**
 * Application Constants and Configuration
 */

export const CONFIG = {
  // GitHub API configuration
  GITHUB_OWNER: "LPFchan",
  
  // Serial Connection
  BAUDRATE: 115200,
  
  // Provisioning & Keys
  KEY_LEN_BYTES: 16,
  RESET_COUNTER: "00000000",
  
  // Device IDs and Boot Messages
  DEVICE_ID_FOB: "UGUISU_01",
  DEVICE_ID_RX: "GUILLEMOT_01",
  BOOTED_FOB: "BOOTED:Uguisu",
  BOOTED_RX: "BOOTED:Guillemot",
  
  // Timeouts
  TIMEOUT_PROV_MS: 12000,
  TIMEOUT_BOOT_MS: 10000,
  
  // DFU Settings
  DFU_DEFAULT_MTU: 256,
  DFU_BUFFER_SIZE: 8192
};
