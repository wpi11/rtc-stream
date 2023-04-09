import React from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    name: "",
    room: "",
  });

  const handleConfsNavigation = () => {
    navigate(`conference?name=${form.name}&room=${form.room}`);
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setForm((state) => ({ ...state, [target.id]: target.value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfsNavigation();
  };

  return (
    <div className="container">
      <h1 className="title">Lobby</h1>
      <input
        id="name"
        type="text"
        className="name"
        placeholder="Whats your name?"
        defaultValue={form.name}
        onChange={handleOnChange}
      />
      <input
        id="room"
        type="text"
        className="name"
        placeholder="Enter room name"
        defaultValue={form.room}
        onChange={handleOnChange}
        onKeyDown={handleKeyDown}
      />
      <div>
        <button id="join-btn" onClick={handleConfsNavigation}>
          Join Conference
        </button>
      </div>
      {/* <div>
				<button
					id='call-btn'
					onClick={handleConfsNavigation}>
					Create Call
				</button>
			</div> */}
    </div>
  );
}
