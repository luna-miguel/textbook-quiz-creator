import React, {useState, useEffect} from 'react';
import './style.css';

function App() {

  // Uploaded file
  const [file, setFile] = useState();

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
  // Index of current quiz question that should be shown, assuming only one can be seen at a time 
  const [currentQuestion, setCurrentQuestion] = useState(0);
  // Strings that indicates if the current definition should be visible, should the user toggle visibilty
  // Should only ever take values "none" for invisible and "block" for visible (this goes to the element's display in style)
  const [viewDefinition, setViewDefinition] = useState("none");

  // Array of materials for quiz game
  // Array should contain the JSON item itself, as well as a list of 4 strings. 
  // This list should contain the correct answer and the three incorrect answers.
  const [questions, setQuestions] = useState();
  // Score for quiz
  const [score, setScore] = useState(0);

  // Send uploaded file to backend once it is received
  useEffect(() => {

    if (file !== undefined) {

      document.getElementById("input").style.display = "none";

      console.log(file)

      const formData = new FormData();
      formData.append('file', file);

      // Get text to backend
      fetch('/upload', {
        method: "POST",
        body: formData
      })
      .then(res => res.json())
      .then(data => { console.log(data); })

      setStatus("Generating response...")
    
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

    
  }, [file])

  useEffect(() => {
    if(cards !== undefined) { // Setup view once GPT response is loaded
      // Initialize definition view array
      setViewDefinition("none");
    }
  }, [cards, currentCard]) // Retrigger when current card changes to re-hide definitions

  useEffect(() => { // Trigger when mode changes (reset card view)
    setCurrentCard(0); 
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
  function generateQuiz(event) {
    event.preventDefault() 

    setStatus("Generating response...");

    const formData = new FormData();
    formData.append('file', file);
  
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

    document.getElementById("make-quiz").disabled = false;
    setMode(1);

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
    document.getElementById(`next-${q}`).style.display = "block";
  }

  // Send questions to backend and create PDF document of quiz
  function exportQuiz() {

    fetch('/export', {
      method: "POST",
      body: JSON.stringify(questions),
      headers: {'Content-type': 'application/json'}
    })
    .then(res => { return res.blob(); })
    .then(
      blob => { // Download exported file once received
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    )
  }

  return (
    <div>
      <h1> Textbook Quiz Creator </h1>

      <input type="file" id="input" onChange={(e) => setFile(e.target.files[0])} accept=".pdf, .docx, .txt"/> <br/>

      { status }

      { cards !== undefined ?
        <div>

          { mode === 0 ? // Flashcard mode
            <div> 
              { questions !== undefined ? 
                <div> <button onClick={(e) => setMode(1)}>Go to quiz</button> <br/> </div>
                : <div> <button id="make-quiz" onClick={generateQuiz}>Generate quiz</button> <br/> </div>
              }
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
              currentQuestion < questions.length ?
                <div> 
                  {questions.map((q, i) => 
                    i === currentQuestion ?
                    <div>
                      <div> Current score: {score} / {questions.length} </div> 
                      <div id={`question-${q}`}> {i+1}. {q[0].question} </div>
                      <form id={`choices-${q}`}>
                      {q[1].map((choice, j) => 
                          <>
                          <input type='radio' id={`${q}-${j}`} name={`${q}`} value={`${choice}`} onclick={(e) => checkAnswer(q)}></input>
                          <label id={`label-${choice}`} htmlFor={`${q}-${j}`}> {choice} </label> <br/>
                          </>
                      )}
                      </form>
                      <button id={`submit-${q}`} onClick={(e) => checkAnswer(q)}>Check</button>
                      <button id={`next-${q}`} style={{"display": "none"}} onClick={(e) => setCurrentQuestion(currentQuestion+1)}>Next</button>
                    </div>
                    : <div/>
                  )}
                </div>
                :                     
                <div>
                  <div> Your score: {score} / {questions.length} </div> 
                  <button onClick={exportQuiz}>Export quiz</button>
                  <button onClick={(e) => {setCurrentQuestion(0); setScore(0);}}>Retry</button>
                  <button onClick={(e) => {setCurrentQuestion(0); setScore(0); setMode(0);}}>Back to flashcards</button>
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