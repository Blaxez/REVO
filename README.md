# REVO - Advanced Video Speed Controller

![REVO Banner](assets/icons/logo.png)

**Enhance your video watching experience with precision control across all HTML5 video platforms.**

REVO is a powerful Chrome extension that allows you to control the playback speed of any HTML5 video with a beautiful glassmorphic UI. Whether you're watching educational content, entertainment videos, or tutorials, REVO gives you the perfect speed for your needs.

## Features

### 🚀 Universal Compatibility

- Works with YouTube, Vimeo, Netflix, educational platforms, and all HTML5 video websites
- No site restrictions or limitations

### 🎨 Glassmorphic UI

- Modern, frosted glass interface that blends seamlessly with any website
- Light and dark theme support based on system preferences
- Smooth animations and transitions for premium feel

### ⚙️ Precision Control

- Adjust playback speed from 0.25x to 8x
- Fine-grained control with 0.05x increments
- Keyboard shortcuts for quick adjustments

### 🔧 Smart Customization

- Per-site speed preferences that automatically save
- Customizable keyboard shortcuts
- Auto-apply last speed setting option
- Toggle overlay visibility

## Installation


### Download Options

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/Blaxez/REVO.git
   ```

2. **Download as ZIP**:
   - Click the green "Code" button at the top of the repository
   - Select "Download ZIP"
   - Extract the ZIP file to a folder of your choice
=======
### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "REVO Video Speed Controller"
3. Click "Add to Chrome"
>>>>>>> efd340cc04762a12da49cddfd82b258386196dac

### Manual Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The REVO icon will appear in your toolbar

## Usage

### Quick Start

1. Navigate to any webpage with HTML5 video content
2. Click the REVO icon in your browser toolbar
3. Use the slider to adjust playback speed
4. Enjoy your perfectly paced video experience!

### Keyboard Shortcuts

By default, REVO includes these keyboard shortcuts:

- **Speed Up**: `Shift + ↑` (Increase by 0.25x)
- **Speed Down**: `Shift + ↓` (Decrease by 0.25x)
- **Fine Speed Up**: `Ctrl + Shift + ↑` (Increase by 0.05x)
- **Fine Speed Down**: `Ctrl + Shift + ↓` (Decrease by 0.05x)
- **Reset Speed**: `Ctrl + Shift + 0` (Reset to 1.0x)
- **Focus Video**: `Ctrl + Shift + X` (Focus on largest video)
- **Toggle Overlay**: (Toggle visibility of speed indicator)
- **Toggle Fullscreen**: (Toggle fullscreen mode)

All shortcuts can be customized in the extension popup.

## UI Preview

The extension features a clean, intuitive interface with:

- Quick speed controls
- Global and per-site preferences
- Keyboard shortcut customization
- Theme-aware design

> **Note**: To see the UI preview, install the extension and click on the REVO icon in your browser toolbar. A screenshot of the interface is available in the [docs](docs) directory as `popup-preview.png`.

## Technical Details

### Manifest Version

- Built with Manifest V3 for enhanced security and performance

### Permissions

- `storage`: To save your preferences and settings
- `activeTab`: To interact with video elements on the current page
- `<all_urls>`: To work with videos on all websites

### Architecture

- **Background Script**: Manages global state and keyboard shortcuts
- **Content Script**: Interacts with video elements and displays overlays
- **Popup Interface**: Provides user configuration and controls

## Development

### Prerequisites

- Google Chrome or Chromium-based browser
- Basic understanding of JavaScript, HTML, and CSS

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Blaxez/REVO.git
   ```
2. Follow the manual installation steps above

### Project Structure

```

REVO/
├── assets/
│   └── icons/
│       └── logo.png
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   ├── content.js
│   │   └── overlay.css
│   └── popup/
│       ├── popup.css
│       ├── popup.html
│       └── popup.js
├── manifest.json
├── showcase.html
└── README.md
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/Blaxez/REVO/issues) on GitHub.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v3.0.1

- Improved performance and stability
- Enhanced UI with refined glassmorphic effects
- Better keyboard shortcut handling
- Fixed minor bugs

### v3.0.0

- Major rewrite with Manifest V3
- Completely redesigned UI with glassmorphic design
- Added per-site speed preferences
- Improved keyboard shortcut customization
- Better theme detection

## Acknowledgments

- Inspired by the need for better video speed control
- Built with modern web technologies
- Designed with user experience in mind

---

**Enjoy faster learning, faster entertainment, and faster everything with REVO!**
