# AntiGravity Project (Monorepo)

A dual-platform focused interface project designed to enhance user concentration through "Anti-Vibe" aesthetics and functional tools.

## Project Structure

This monorepo contains two distinct implementations:

- **`/Web_Version`**: The original web-based implementation providing a browser-accessible experience.
- **`/Desktop_Widget`**: An Electron-based desktop widget with transparency, always-on-top capability, and system-level integrations.

---

## 1. Web Version (`/Web_Version`)

A lightweight, browser-based version of the Anti-Vibe tool.

### Tech Stack
- **HTML5 / CSS3** (Vanilla)
- **p5.js** for creative coding visualizations.
- **MediaPipe Vision** for computer vision capabilities.

### Getting Started
1. Navigate to the `Web_Version` folder.
2. Open `index.html` in any modern web browser.
   - *Recommendation*: Use a local development server (like Live Server in VS Code) for the best experience with camera permissions.

---

## 2. Desktop Widget (`/Desktop_Widget`)

A dedicated desktop application that floats on your screen as a transparent widget.

### Tech Stack
- **Electron.js**: App runtime.
- **Node.js**: Backend logic.
- **p5.js & MediaPipe**: Visualization and vision processing.

### Features
- **Transparent, Frameless Window**: Blends seamlessly with your desktop.
- **"Soft Mode" UI**: Cyber-inspired aesthetic for minimal distraction.
- **Click-Through**: Intelligent mouse event handling allowing you to click through the widget when needed.
- **System Integration**: Tray icons and shortcuts.

### Getting Started
#### Prerequisites
- Node.js installed on your system.

#### Installation & Run
1. Open a terminal and navigate to the `Desktop_Widget` directory:
   ```bash
   cd Desktop\_Widget
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

---

## Deployment & Management

### Firebase (Hosting)
*Setup instructions coming soon...*

### GitHub
*Repository details coming soon...*
