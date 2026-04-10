import { useState, useRef } from "react";
import { Link } from "react-router-dom";

export default function GetInvolved() {
  return (
    <div className="outerbackgroundhome">
      <div className="topbannerhome">
        <div className="title-container">
          <h1 className="puzzles-title">Getting Involved with Nouse Tech</h1>
        </div>
      </div>

      <div className="puzzles-container">
        <Link to="/crossword" className="puzzle-card">
          <h2 className="puzzle-name">Crossword</h2>
        </Link>
        <a href="https://nouse.co.uk/" className="puzzle-link">
          <div className="puzzle-card">
            <h2 className="puzzle-name">Nouse Home</h2>
          </div>
        </a>
        <Link to="/GetInvolved" className="puzzle-card">
          <h2 className="puzzle-name">Get Involved</h2>
        </Link>
      </div>
    </div>
  );
}
