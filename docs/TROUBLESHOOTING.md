# FloatCam Troubleshooting Guide

## Common Issues & Solutions

### 1. "Port 9211 is already in use"
- **Cause**: Another instance of FloatCam or a conflicting local server is running on port `9211`.
- **Fix**: Check running processes with `lsof -i :9211` and terminate conflicting processes:
  ```bash
  lsof -i :9211
  kill -9 <PID>
  ```

### 2. Phone cannot connect to the Mac URL
- **Verify Same Network**: Ensure both your Mac and phone are connected to the exact same Wi-Fi SSID.
- **Client / AP Isolation**: Some guest or office networks prevent devices on the same Wi-Fi from talking to each other. Use a home network or your phone's personal hotspot.
- **Mac Firewall**: Ensure incoming connections are permitted for FloatCam under **System Settings -> Network -> Firewall**.

### 3. "Camera Permission Denied" on Phone
- On iOS: Open **Settings -> Safari -> Camera** and set to **Ask** or **Allow**.
- On Android: Tap the lock icon in Chrome's address bar -> **Permissions** -> toggle **Camera** on.

### 4. Video feed is black or disconnected
- Tap **Flip Camera** or **Start Camera** on the phone.
- Verify that your Mac's preview window is visible (**Show Floating Preview** toggle in dashboard).
- If needed, tap **Regenerate Certs** in the **Help & SSL** tab of the dashboard.
