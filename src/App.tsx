import "./App.css";
import CrosswordGame from "./Crossword Puzzle/CrosswordGame";
import GetInvolved from "./Puzzles Home/GetInvolved";
import Home from "./Puzzles Home/Home";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/crossword" element={<CrosswordGame />} />
      <Route path="/GetInvolved" element={<GetInvolved />} />
    </Routes>
  );
}

export default App;
