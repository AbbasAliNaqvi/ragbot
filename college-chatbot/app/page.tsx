import ChatWidget from "./components/ChatWidget";

export default function Home() {
  return (
    <main style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#ffffff', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      
      <div style={{ textAlign: 'center', color: '#333' }}>
        <h2>THIS IS TEST WEBSITE FOR </h2>
          <h3>AI CHAT SUPPORT</h3>
        <p>The chat widget is in the bottom right corner ↘</p>
      </div>

      <ChatWidget />
      
    </main>
  );
}