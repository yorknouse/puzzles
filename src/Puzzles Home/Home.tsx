import { useState, useRef } from "react";
import { Link } from "react-router-dom";

export default function Home() {
    return (
       <div className="outerbackground">
      <div className="innerbackground">
        <div className="title-container">
          <h1 className="puzzles-title">Nouse Puzzles</h1>
          </div>
            <div className="puzzles-container">
                <div className="puzzles-container">
                    <Link to="/crossword" className="puzzle-card">
                        <h2 className="puzzle-title">Crossword</h2>
                    </Link>
                </div>
                <a href="https://nouse.co.uk/" className="puzzle-link">
                    <div className="puzzle-card">
                        <h2 className="puzzle-title">Nouse Home</h2>
                    </div>
                </a>
                <a href="/get-involved" className="puzzle-link">
                    <div className="puzzle-card">
                        <h2 className="puzzle-title">Get Involved</h2>
                    </div>
                </a>
            </div>
        </div>
      <p className="footer">
          Made by{" "}
          <a href="https://docs.nouse.co.uk/pages/15%20tech-team.html">
            Nouse Tech
          </a>
        </p>
    </div>
    );
};