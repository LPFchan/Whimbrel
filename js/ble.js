/**
 * Whimbrel BLE: Web Bluetooth manager.
 */

(function() {
  const COMMAND_UUID = "438c5641-3825-40be-80a8-97bc261e0ee9";
  const RESPONSE_UUID = "da43e428-803c-401b-9915-4c1529f453b1";
  
  class BLEManager {
    constructor() {
      this.device = null;
      this.server = null;
      this.service = null;
      this.cmdChar = null;
      this.resChar = null;
      this.onResponse = null;
    }

    async connect() {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "Immogen" }, { namePrefix: "Uguisu" }, { namePrefix: "Guillemot" }],
        optionalServices: [ "942c7a1e-362e-4676-a22f-39130faf2272" ]
      });

      this.device.addEventListener('gattserverdisconnected', () => this.onDisconnected());

      this.server = await this.device.gatt.connect();
      const services = await this.server.getPrimaryServices();
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics();
          let hasCmd = false;
          let hasRes = false;
          for (const char of chars) {
            if (char.uuid === COMMAND_UUID) {
              this.cmdChar = char;
              hasCmd = true;
            }
            if (char.uuid === RESPONSE_UUID) {
              this.resChar = char;
              hasRes = true;
            }
          }
          if (hasCmd && hasRes) {
            this.service = svc;
            break;
          }
        } catch (e) {
          console.warn("Could not read chars for service", svc.uuid);
        }
      }

      if (!this.cmdChar || !this.resChar) {
        throw new Error("Management characteristics not found");
      }

      await this.resChar.startNotifications();
      this.resChar.addEventListener('characteristicvaluechanged', (e) => this.handleResponse(e));
    }

    handleResponse(event) {
      const value = event.target.value;
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(value);
      if (this.onResponse) {
        this.onResponse(text);
      }
    }

    onDisconnected() {
      console.log("BLE Disconnected");
    }

    async sendCommand(commandStr) {
      if (!this.cmdChar) throw new Error("Not connected");
      const encoder = new TextEncoder();
      const data = encoder.encode(commandStr);
      await this.cmdChar.writeValue(data);
    }

    disconnect() {
      if (this.device && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }
    }
  }

  window.Whimbrel.BLEManager = BLEManager;
})();
