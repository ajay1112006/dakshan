import { ChatInterface } from '@/components/ChatInterface';
import CandyShoal from '@/components/CandyShoal';

export default function Home() {
  return (
    <main className="main-viewport">
      {/* 3D WebGL Glossy Cluster Background */}
      <div className="canvas-bg-wrapper" aria-hidden="true">
        <CandyShoal
          background="#070c10"
          colors={["#FFB21E", "#E0142F", "#3A3BFF", "#12C9B0"]}
          count={50}
          scale={168}
          speed={45}
        />
      </div>

      {/* Standalone Centered Chatbox */}
      <div className="chatbox-wrapper">
        <ChatInterface />
      </div>
    </main>
  );
}
