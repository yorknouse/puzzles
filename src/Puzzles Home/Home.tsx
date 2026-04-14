import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import WhatsappQR from "../Images/WhatsappQR.png";
import Muselogo from "../Images/Muselogo.png";

const pages = [
  "Home",
  "Crossword",
  "Sudoku",
  "Wordle",
  "Cat Invasion",
  "Text Adventure",
  "Muse Home",
];

export default function Home() {
  const [active, setActive] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock background scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleNav = (page: string) => {
    setActive(page);
    setMenuOpen(false);
    if (page === "Muse Home") {
      window.location.href = "https://nouse.co.uk/muse";
    }
  };

  return (
    <div className="outerbackgroundhome">

      {/* Sticky header wrapper */}
      <div className="sticky-header">
        <div className="topbannerhome">
          <button
            className="burger-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <div className="title-container">
            <h1 className="puzzles-title">Nouse Puzzles</h1>
          </div>
        </div>

        <nav className="navbarhome">
          {pages.map((page) => (
            <button
              key={page}
              className={`nav-link ${active === page ? "nav-link-active" : ""}`}
              onClick={() => handleNav(page)}
            >
              {page === "Muse Home" ? (
                <img src={Muselogo} className="muse-logo" alt="Muse Home" />
              ) : (
                page
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Slide-out drawer — mobile only */}
      <div className={`mobile-drawer ${menuOpen ? "mobile-drawer-open" : ""}`}>
        {/* Title stays visible at top of drawer */}
        <div className="drawer-header">
          <h1 className="drawer-title">Nouse Puzzles</h1>
          <button className="drawer-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        {pages.map((page) => (
          <button
            key={page}
            className={`drawer-link ${active === page ? "drawer-link-active" : ""}`}
            onClick={() => handleNav(page)}
          >
            {page === "Muse Home" ? (
              <img src={Muselogo} className="muse-logo" alt="Muse Home" />
            ) : (
              page
            )}
          </button>
        ))}
      </div>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)} />
      )}

      <div className="puzzles-container">
        {active === "Home" && (
          <>
            <h2 className="home-message">Welcome to Nouse Puzzles!</h2>
            <br />
            <p className="home-description">
              Currently, we have just the Crossword puzzle available, and we are
              still adding new features. We are planning to build more
              puzzles/games in the future, as you can see in the navbar. If you
              have any interest in building web games, we at the Nouse Tech Team
              are always looking for new team members, so please get in touch!
              You could build the above games, or make your own!
            </p>
            <br />
            <p className="home-description">
              If you are interested in joining, you can email us at{" "}
              <a href="mailto:info@nouse.co.uk">info@nouse.co.uk</a>
              {" "}or join our <a href = "https://chat.whatsapp.com/CRJfRi94TkKEW70HdakYT7">WhatsApp group </a> 
               by scanning the QR code below. We also have meetings every Thursday at 6pm in the SLB. 
              We look forward to hearing from you!
              <br /><br />
              Sincerely, the Nouse Tech Team.
            </p>
            <img
              src={WhatsappQR}
              alt="QR code to join Nouse Tech WhatsApp group - https://chat.whatsapp.com/CRJfRi94TkKEW70HdakYT7"
              className="qr-code"
            />
          </>
        )}
        {active === "Crossword" && (
          <>
            <p className="crosswords-description">
              Here you can choose to play crosswords by our puzzles editor, the
              tech team, or user made ones! Or you can make your own! (This page
              is under development)
            </p>
            <div className="crosswords-container">
              <div className="puzzle-card-header">Muse edition</div>
              <div className="puzzle-card-header">Tech Team</div>
              <div className="puzzle-card-header">User made</div>
              <Link to="/crossword" className="crossword-card">
                <h2 className="crossword-name">Crossword</h2>
              </Link>
            </div>
            <Link to="/crossword" className="puzzle-card">
              <h2 className="puzzle-name">Make your own!</h2>
            </Link>
          </>
        )}
        {active === "Sudoku" && (
          <>
            <h2 className="crossword-name">(This page is under development)</h2>
            <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Sudoku</h2></Link>
          </>
        )}
        {active === "Wordle" && (
          <>
            <h2 className="crossword-name">(This page is under development)</h2>
            <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Wordle</h2></Link>
          </>
        )}
        {active === "Cat Invasion" && (
          <>
            <h2 className="crossword-name">(This page is under development)</h2>
            <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Cat Invasion</h2></Link>
          </>
        )}
        {active === "Text Adventure" && (
          <>
            <h2 className="crossword-name">(This page is under development)</h2>
            <Link to="/crossword" className="puzzle-card"><h2 className="puzzle-name">Text Adventure</h2></Link>
          </>
        )}
      </div>
    </div>
  );
}