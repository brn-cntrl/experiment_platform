import React, { useState } from 'react';
import './ProcedureComponents.css';

function PsychoPyTransitionComponent({ procedure, sessionId }) {
  const [taskState, setTaskState] = useState('instructions');
//   const [timeElapsed, setTimeElapsed] = useState(0);

//   useEffect(() => {
//     let timer;
//     if (taskState === 'psychopy') {
//       timer = setInterval(() => {
//         setTimeElapsed(prev => prev + 1);
//       }, 1000);
//     }
//     return () => clearInterval(timer);
//   }, [taskState]);

  const startPsychoPyTask = () => {
    setTaskState('psychopy');
    // setTimeElapsed(0);
  };

//   const completeTask = () => {
//     const taskResults = {
//       sessionId: sessionId,
//       taskType: 'PsychoPy_Task',
//       taskName: procedure.name,
//       results: {
//         timeInPsychoPy: timeElapsed,
//         completedAt: new Date().toISOString(),
//         status: 'completed'
//       }
//     };
    
//     console.log('PsychoPy Task Results:', taskResults);
//     onTaskComplete();
//   };

  // Get custom instructions if provided, otherwise use default
  const getCustomInstructions = () => {
    const psychopyConfig = procedure.configuration?.['psychopy-setup'];
    return psychopyConfig?.psychopyInstructions || null;
  };

  const getTaskName = () => {
    // Extract a clean task name for display
    return procedure.name || 'Cognitive Task';
  };

  if (taskState === 'instructions') {
    const customInstructions = getCustomInstructions();
    
    return (
      <div className="procedure-instructions">
        <h4>Switch to PsychoPy</h4>
        <div className="instruction-content">
          <p><strong>You will now perform the {getTaskName()} in PsychoPy.</strong></p>
          
          {customInstructions ? (
            <div className="custom-instructions">
              <h5>Task-Specific Instructions:</h5>
              <p>{customInstructions}</p>
            </div>
          ) : (
            <div className="default-instructions">
              <ul>
                <li>Please wait for the experimenter to launch PsychoPy</li>
                <li>Follow the instructions displayed in the PsychoPy window</li>
                <li>Complete the task as directed</li>
                <li>Return to this window when the task is finished</li>
              </ul>
            </div>
          )}
          
          <div className="psychopy-notice">
            <p><strong>Important:</strong> Do not close this browser window. You will return here after completing the PsychoPy task.</p>
          </div>
        </div>
        
        <button onClick={startPsychoPyTask} className="start-task-btn">
          Ready to Start {getTaskName()}
        </button>
      </div>
    );
  }

  if (taskState === 'psychopy') {
    return (
      <div className="psychopy-waiting-container">
        <div className="psychopy-waiting-content">
          <h3>Performing {getTaskName()} in PsychoPy</h3>
          <p>Please focus on the PsychoPy window to complete your task.</p>
          <p>Follow the instructions displayed in PsychoPy.</p>
          
          {/* <div className="waiting-stats">
            <div className="waiting-time">
              <span className="time-label">Time Elapsed</span>
              <span className="time-value">
                {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div> */}
          
          {/* <div className="experimenter-instructions">
            <h4>For Experimenter:</h4>
            <p>Monitor the participant's progress in PsychoPy. When the task is complete, instruct the participant to click "Task Complete" below.</p>
          </div>
          
          <button onClick={completeTask} className="complete-task-btn">
            Task Complete - Return to Experiment
          </button> */}
        </div>
      </div>
    );
  }

  return null;
}

export default PsychoPyTransitionComponent;