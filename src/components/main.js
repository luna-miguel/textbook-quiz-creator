import React, {useState, useEffect} from 'react';
import '../style.css';

function App() {

  // Uploaded file
  var file;

  const [status, setStatus] = useState("");

  // Cards: list of concepts and definitions as JSON objects
  // Should contain the ChatGPT response in JSON format
  const [cards, setCards] = useState();

  // Quiz: Quiz questions and choices as JSON objects
  // Should contain the ChatGPT response in JSON format
  const [quiz, setQuiz] = useState();

  // Mode of study the user would like to use 
  // Should only ever take values 0 for flashcards, 1 for quiz
  const [mode, setMode] = useState(0);

  // Index of current flashcard that should be shown, assuming only one can be seen at a time 
  const [currentCard, setCurrentCard] = useState(0);
  // Strings that indicates if the current definition should be visible, should the user toggle visibilty
  // Should only ever take values "none" for invisible and "block" for visible (this goes to the element's display in style)
  const [viewDefinition, setViewDefinition] = useState("none");

  // Array of materials for quiz game
  // Array should contain the JSON item itself, as well as a list of 4 strings. 
  // This list should contain the correct answer and the three incorrect answers.
  const [questions, setQuestions] = useState();
  // Score for quiz
  const [score, setScore] = useState(0);

  useEffect(() => {
    if(cards !== undefined) { // Setup view once GPT response is loaded

      // Initialize definition view array
      setViewDefinition("none");

      // Remove button usage
      document.getElementById("upload").display = "none";

    }
  }, [cards, currentCard]) // Retrigger when current card changes to re-hide definitions

  useEffect(() => { // Trigger when mode changes (reset card view and quiz score)
    setCurrentCard(0); 
    setScore(0);
  }, [mode])

  useEffect(() => {
    if(quiz !== undefined) { // Setup view once GPT response is loaded
      const res = quiz.all.map(item => {
        var array = Array(item.correct_answer).concat(item.incorrect_answers);
        // Shuffle answer choices
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return [item, array];
      });
      setQuestions(res);
    }
  }, [quiz]);

  // Set file, toggle button controls, send to backend
  function handleInput(event) {
    file = event.target.files[0];

    if (event.target.files[0] !== undefined) { document.getElementById("submit").disabled = false; }
    else { document.getElementById("submit").disabled = true; }

    const formData = new FormData();
    formData.append('file', file);

    // Get text to backend
    fetch('/upload', {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(data => { console.log(data); })
  }
  
  // Begin GPT inference for flashcards
  function handleSubmit(event) {
    event.preventDefault() 

    setStatus("Generating response...")

    // Toggle button controls
    document.getElementById("upload").style.display = "none";
  
    // Make API call to backend
    fetch('/generate_cards', {
      method: "POST",
    })
    .then(res => res.json())
    .then(data => { 
      console.log(data); 
      if("message" in data) { setStatus("An error occurred. Please try again.") }
      else { setCards(data); setStatus("") }
    })

  }
  
  // Set file, toggle button controls, send to backend
  function generateQuiz(event) {
    event.preventDefault() 

    setStatus("Generating response...");

    const formData = new FormData();
    formData.append('file', file);
  
    document.getElementById("restart").disabled = true;
    document.getElementById("make-quiz").disabled = true;

    // Make API call to backend
    fetch('/generate_quiz', {
      method: "POST",
    })
    .then(res => res.json())
    .then(
      data => { 
        console.log(data);
        if("message" in data) { setStatus("An error occurred. Please try again.") }
        else { setQuiz(data); setStatus(""); }
      }
    )

    document.getElementById("restart").disabled = false;
    document.getElementById("make-quiz").disabled = false;

  }

  // Check chosen quiz answer
  function checkAnswer(q) {

    // Find question and chosen answer in document
    var form = document.getElementById(`choices-${q}`);
    var response = form.elements[`${q}`].value;

    if(!response) {
      return;
    }

    // Reference question and answer in data
    var question = document.getElementById(`question-${q}`);
    var answer = q[0].correct_answer;

    // Disable radio buttons and submit button
    document.getElementById(`submit-${q}`).disabled = true;
    var elements = form.elements;
    for (var i = 0, len = elements.length; i < len; ++i) {
      elements[i].disabled = true;
    }

    // Check answer and set score + display
    if(response === answer){
      question.innerText += "\t✅";
      question.style.color = "green";
      setScore(score + 1);
    }
    else{
      question.innerText += "\t❌";
      question.style.color = "red";
      document.getElementById(`label-${response}`).style.color = "red";
    }
    document.getElementById(`label-${answer}`).style.color = "green";

  }

  // Send questions to backend and create PDF document of quiz
  function exportQuiz() {

    fetch('/export', {
      method: "POST",
      body: JSON.stringify(questions),
      headers: {'Content-type': 'application/json'}
    })
    .then(res => res.json())
    .then(
      data => { 
        console.log(data);
        if("message" in data) { setStatus("An error occurred. Please try again.") }
        else { setQuestions(data); setStatus(""); }
      }
    )
  }

  return (
    <div>
      <h1> Textbook Quiz Creator </h1>

      <form id="upload" onSubmit={handleSubmit}>
      <input type="file" id="input" onChange={handleInput} accept=".pdf, .doc, .docx, .txt"/> <br/>
      <button type="submit" id="submit" disabled>Upload</button>
      </form>

      { status }

      { cards !== undefined ?
        <div>
          
          <button id="restart" onClick={(e) => window.location.reload()}>Upload another file</button> <br/> 

          { questions !== undefined ?
          <div>
          <input type="radio" id="cards" name="mode" onClick={(e) => {setMode(0)}}></input> 
          <label htmlFor="cards">Flashcards</label>
          <input type="radio" id="quiz" name="mode" onClick={(e) => {setMode(1)}}></input>
          <label htmlFor="quiz">Quiz</label> 
          </div> 
          : <div> <button id="make-quiz" onClick={generateQuiz}>Generate quiz</button> <br/> </div>
          }


          { mode === 0 ? // Flashcard mode
            <div> 
              { cards.all.map((item, i) => 
                i === currentCard ?
                  <div>
                    <div>
                      <h3> {item.concept} </h3>
                      { viewDefinition !== undefined ? 
                        
                        <div> 
                          <p style={{display: viewDefinition}} id={`definition-${i}`}> {item.definition} </p>
                          <input id={`show-${i}`} type='checkbox'  onClick={(e) =>{ setViewDefinition(viewDefinition === "none" ? "block" : "none") }} ></input> 
                          <label htmlFor='show'> Show definition </label> 
                        </div>

                      : <div/> 
                      }
                    </div>

                    <button id="previous" disabled={i === 0} onClick={() => setCurrentCard(i-1)}>Previous</button>
                    {i+1} of {Object.keys(cards.all).length}
                    <button id="next" disabled={i === Object.keys(cards.all).length-1} onClick={() => setCurrentCard(i+1)}>Next</button>
                  </div>

                : <div/>
              )}

            </div>

          : // Quiz mode
          <div>
            { questions !== undefined ? 
              <div> 
                <div> Current score: {score} / {questions.length} </div> 
                <button onClick={exportQuiz}>Export quiz</button>
                {questions.map((q, i) => 
                  <div>
                    <div id={`question-${q}`}> {i+1}. {q[0].question} </div>
                    <form id={`choices-${q}`}>
                    {q[1].map((choice, j) => 
                        <>
                        <input type='radio' id={`${q}-${j}`} name={`${q}`} value={`${choice}`}></input>
                        <label id={`label-${choice}`} htmlFor={`${q}-${j}`}> {choice} </label> <br/>
                        </>
                    )}
                    </form>
                    <button id={`submit-${q}`} onClick={(e) => checkAnswer(q)}>Check</button>
                  </div>
                )}
              </div>
              : <div/>
            }
          </div> 
          }

        </div>

      : <div/> }
    </div>
  );
}

export default App;