import "./App.css";
import CrosswordGame from "./Crossword Puzzle/CrosswordGame";
import Home from "./Puzzles Home/Home";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/crossword" element={<CrosswordGame />} />
    </Routes>
  );
}

export default App;
