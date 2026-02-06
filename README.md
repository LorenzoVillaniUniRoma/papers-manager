# Papers Manager (Local iPhone Test)

## Run locally and open from iPhone 12+
1. From the project folder, start a local server:
   ```bash
   python -m http.server 8000
   ```
2. Find your computer's local IP address (for example `192.168.1.10`).
   - macOS: `ipconfig getifaddr en0`
   - Windows (PowerShell): `ipconfig | findstr IPv4`
   - Linux: `hostname -I`
3. Make sure your iPhone is on the same Wi‑Fi network as your computer.
4. On iPhone Safari, open:
   ```
   http://<YOUR_IP>:8000
   ```
5. If it does not load, allow the firewall prompt for Python (or open port 8000).

## Notes
- The UI uses iPhone safe‑area insets for the notch and home indicator.
- Data is stored locally in the browser via `localStorage`.
