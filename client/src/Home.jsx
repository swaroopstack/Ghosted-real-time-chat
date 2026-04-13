import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const createRoom = async () => {
    const res = await fetch("http://localhost:5000/api/create-room", {
      method: "POST"
    });
    const data = await res.json();

    navigate(`/room/${data.roomId}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Ghosted</h1>
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
}

export default Home;