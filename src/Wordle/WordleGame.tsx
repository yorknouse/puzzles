import { Link } from "react-router-dom";
import WordleWidget from "./WordleWidget";
import NouseWordleLogo from "../../Logos/Nouse Wordle Logo.svg";

export default function WordleGame() {
  return (
    <div className="wordle-page">
      <header className="wordle-page-topbar">
        <div className="wordle-page-topbar-inner">
          <span className="wordle-topbar-spacer" aria-hidden="true" />
          <h1 className="puzzle-logo-heading">
            <img
              src={NouseWordleLogo}
              alt="Nouse Wordle"
              className="wordle-header-logo"
            />
          </h1>
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
