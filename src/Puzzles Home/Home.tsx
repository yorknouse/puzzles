import { useState } from "react";
import { Link } from "react-router-dom";
import WhatsappQR from "../Images/WhatsappQR.png";

const pages = ["Home", "Crossword", "Sudoku", "Wordle", "Cat Invasion", "Text Adventure", "Nouse Home"];

export default function Home() {
  const [active, setActive] = useState("Home");

  return (
    <div className="outerbackgroundhome">
      <div className="topbannerhome">
        <div className="title-container">
          <h1 className="puzzles-title">Nouse Puzzles</h1>
        </div>
      </div>

      <nav className="navbarhome">
        {pages.map(page => (
          <button
            key={page}
            className={`nav-link ${active === page ? "nav-link-active" : ""}`}
            onClick={() => setActive(page)}
          >
            {page}
          </button>
        ))}
      </nav>

      <div className="puzzles-container">
        {active === "Home" && (
          <>
            <h2 className="home-message">Welcome to Nouse Puzzles!</h2>
            <br/>
            <p className="home-description">
              Currently, we have just the Crossword puzzle available, and we are still adding new features. 
              We are planning to build more puzzles/games in the future, as you can see in the navbar. If you
              have any interest in building web games, we at the Nouse Tech Team are always looking for new
              team members, so please get in touch! You could build the above games, or make your own!
            </p>
            <br/>
            <p className="home-description">
              If you are interested in joining, you can email us at <a href="mailto: info@nouse.co.uk">info@nouse.co.uk </a>
               or join our Whatsapp group by scanning the QR code below. We look forward to hearing from you! <br/><br/>
              Sincerely, the Nouse Tech Team.
            </p>
            <br/>
            <img src={WhatsappQR} alt="QR code to join Nouse Tech Whatsapp group" className = "qr-code"/>
          </>
        )}
        {active === "Crossword" && <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Crossword</h2></Link>}
        {active === "Sudoku" && <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Sudoku</h2></Link>}
        {active === "Wordle" && <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Wordle</h2></Link>}
        {active === "Cat Invasion" && <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Cat Invasion</h2></Link>}
        {active === "Text Adventure" && <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Text Adventure</h2></Link>}
        {active === "Nouse Home" && (window.location.href = "https://nouse.co.uk/")}
      </div>
    </div>
  );
};