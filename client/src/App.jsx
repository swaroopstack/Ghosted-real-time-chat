import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Chat from "./Chat";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Chat />} />
    </Routes>
  );
}

export default App;