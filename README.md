# 🎬 Watch Party - P2P Synchronized Video Watching

A Next.js application that enables peer-to-peer synchronized video watching using WebRTC. Watch videos together with friends in perfect sync, completely private with no server uploads.

## ✨ Features

- **🔒 Completely Private**: Direct peer-to-peer connection using WebRTC - no data passes through servers
- **⚡ Perfect Synchronization**: Advanced sync mechanism ensures both viewers watch in perfect harmony
- **📁 Local Files**: Watch any video file from your computer without uploads
- **🎨 Modern UI**: Beautiful, responsive interface with dark mode support
- **⌨️ Keyboard Shortcuts**: Space for play/pause, arrow keys for seeking
- **🔄 Real-time Sync**: Play, pause, and seek events are instantly synchronized

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Two devices or browser windows for testing

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 How to Use

### Hosting a Watch Party

1. Click **"Host a Room"** on the landing page
2. Click **"Generate Room Key"** - this creates a signaling offer
3. **Copy** the generated room key (automatically copied to clipboard)
4. **Share** this key with your guest via any messaging app
5. **Wait** for the guest to send back their response
6. **Paste** the guest's response in the text area
7. Click **"Connect"**
8. Once connected, load your video file and start watching!

### Joining a Watch Party

1. Click **"Join a Room"** on the landing page
2. **Paste** the host's room key in the text area
3. Click **"Generate Response & Connect"**
4. **Copy** your response key (automatically copied to clipboard)
5. **Send** this response back to the host
6. Once the host pastes your response, you'll be connected!
7. Load the same video file as the host and enjoy synchronized playback

### Watching Together

- Both users need to load the **same video file** locally
- The host controls playback, but sync works both ways
- Play, pause, and seek actions are automatically synchronized
- Use keyboard shortcuts:
  - **Space**: Play/Pause
  - **Left Arrow**: Seek backward 5 seconds
  - **Right Arrow**: Seek forward 5 seconds

## 🏗️ Technical Architecture

### Tech Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, responsive styling
- **SimplePeer**: WebRTC wrapper for easy peer connections
- **STUN Servers**: Google and Twilio STUN servers for NAT traversal

### Project Structure

```
watch-party/
├── app/
│   ├── page.tsx          # Main application with routing logic
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── RoomCreator.tsx   # Host room creation component
│   ├── RoomJoiner.tsx    # Guest room joining component
│   ├── VideoPlayer.tsx   # Synchronized video player
│   └── ConnectionStatus.tsx # Connection state indicator
├── lib/
│   ├── webrtc.ts         # WebRTC connection utilities
│   └── types.ts          # TypeScript interfaces
└── package.json
```

### How WebRTC Synchronization Works

1. **Signaling Exchange**:
   - Host generates an "offer" (WebRTC signaling data)
   - Guest receives offer and generates an "answer"
   - Both exchange this data via any external channel (copy/paste)

2. **Peer Connection**:
   - Once signaling is complete, WebRTC establishes direct P2P connection
   - No central server needed after initial setup

3. **Video Sync Messages**:
   ```typescript
   {
     action: 'play' | 'pause' | 'seek' | 'ready',
     timestamp: number,  // Current video time
     senderId: string    // Unique peer ID
   }
   ```

4. **Sync Logic**:
   - When user performs action (play/pause/seek), message sent to peer
   - Receiving peer updates video state with ±0.5s tolerance
   - Debouncing prevents sync loops

## 🔧 Configuration

### Customizing STUN Servers

Edit `lib/webrtc.ts` to add more STUN servers:

```typescript
config: {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // Add more STUN servers here
  ]
}
```

### Adjusting Sync Tolerance

In `components/VideoPlayer.tsx`, modify the time difference threshold:

```typescript
const timeDiff = Math.abs(video.currentTime - message.timestamp);
if (timeDiff > 0.5) {  // Change this value (in seconds)
  video.currentTime = message.timestamp;
}
```

## 🐛 Troubleshooting

### Connection Issues

- **Firewall/Network**: Ensure your firewall allows WebRTC connections
- **Different Networks**: Use additional STUN/TURN servers for complex NAT situations
- **Browser Compatibility**: Works best on Chrome/Edge, Firefox, and Safari

### Video Sync Issues

- **Ensure both users load the same video file**
- **Check network latency** - high latency can affect sync quality
- **Try refreshing** the connection by going back and reconnecting

### Common Errors

- **"Invalid room key format"**: Ensure you copied the entire JSON data
- **"Connection error"**: Check your internet connection and firewall settings
- **Video won't load**: Ensure the file format is supported (MP4, WebM recommended)

## 🎯 Future Enhancements

- [ ] Add TURN server support for better NAT traversal
- [ ] Support for more than 2 peers (group watch parties)
- [ ] Chat functionality during watching
- [ ] QR code sharing for mobile connections
- [ ] Subtitle synchronization
- [ ] Picture-in-picture mode
- [ ] Automatic reconnection on network interruptions

## 📝 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome/Edge (Chromium) | ✅ Full Support |
| Firefox | ✅ Full Support |
| Safari | ✅ Full Support |
| Mobile Browsers | ⚠️ Limited (file access restrictions) |

## 🔐 Privacy & Security

- **No uploads**: Videos stay on your device, never uploaded anywhere
- **No tracking**: No analytics or user tracking
- **Direct P2P**: Data flows directly between peers, not through servers
- **Local processing**: All video processing happens in your browser

## 📄 License

MIT License - Feel free to use and modify for your own projects!

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- WebRTC powered by [SimplePeer](https://github.com/feross/simple-peer)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Built with ❤️ using Next.js, WebRTC, and TypeScript**
