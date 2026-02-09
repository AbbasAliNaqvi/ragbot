import ChatWidget from "./components/ChatWidget";

export default function Home() {
  return (
    <main style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#ffffff', // Plain white page
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      
      {/* Some dummy content so the page isn't totally empty */}
      <div style={{ textAlign: 'center', color: '#333' }}>
        <h1>Welcome to My Website</h1>
        <p>The chat widget is in the bottom right corner ↘️</p>
      </div>

      {/* The Chat Widget Component */}
      <ChatWidget />
      
    </main>
  );
}