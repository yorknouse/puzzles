import { Link } from "react-router-dom";
import WordleWidget from "./WordleWidget";

export default function WordleGame() {
  return (
    <div className="wordle-page">
      <header className="wordle-page-topbar">
        <div className="wordle-page-topbar-inner">
          <span className="wordle-page-badge">Nouse Puzzles</span>
          <h1 className="wordle-page-heading">WORDLE</h1>
          <Link to="/" className="wordle-return-home">
            Home
          </Link>
        </div>
      </header>

      <main className="wordle-page-main">
        <WordleWidget />
      </main>

      <p className="footer">
        Made by{" "}
        <a href="https://docs.nouse.co.uk/pages/15%20tech-team.html">
          Nouse Tech
        </a>
      </p>
    </div>
  );
}
