import React, { useState, useEffect, useRef } from 'react';
import './ProcedureComponents.css';

function SARTComponent({ procedure, sessionId, onTaskComplete }) {
  const [taskState, setTaskState] = useState('instructions');
  const [currentDigit, setCurrentDigit] = useState(null);
  const [trialCount, setTrialCount] = useState(0);
  const [results, setResults] = useState([]);
  const [showDigit, setShowDigit] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  
  const trialStartTimeRef = useRef(null);
  const hasRespondedRef = useRef(false);
  const currentTrialRef = useRef(null);
  const trialTimeoutRef = useRef(null);
  const handleTrialEndRef = useRef(null);

  const maxTrials = 50;
  const stimulusDuration = 500;
  const responseWindow = 1000;
  const targetDigit = 3;

  // Cleanup function
  useEffect(() => {
    return () => {
      if (trialTimeoutRef.current) clearTimeout(trialTimeoutRef.current);
    };
  }, []);

  const generateRandomDigit = () => {
    return Math.floor(Math.random() * 10);
  };

  const recordTrialResult = (digit, responded, responseTime) => {
    const isTarget = digit === targetDigit;
    const isNoGo = isTarget;
    
    let responseType;
    let isCorrect;

    if (isNoGo && responded) {
      responseType = 'commission_error';
      isCorrect = false;
    } else if (isNoGo && !responded) {
      responseType = 'correct_rejection';
      isCorrect = true;
    } else if (!isNoGo && responded) {
      responseType = 'hit';
      isCorrect = true;
    } else {
      responseType = 'omission_error';
      isCorrect = false;
    }

    const trialResult = {
      trial: trialCount,
      digit: digit,
      isTarget: isTarget,
      isNoGo: isNoGo,
      responded: responded,
      responseType: responseType,
      isCorrect: isCorrect,
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    };

    setResults(prev => [...prev, trialResult]);
    console.log(`Trial ${trialCount}: Digit ${digit} (${isNoGo ? 'NO-GO' : 'GO'}) - ${responded ? 'RESPONDED' : 'NO RESPONSE'} - ${responseType.toUpperCase()}`);
  };

  const startTrial = () => {
    const digit = generateRandomDigit();
    currentTrialRef.current = digit;
    hasRespondedRef.current = false;
    trialStartTimeRef.current = Date.now();
    
    setCurrentDigit(digit);
    setShowDigit(true);
    setIsWaitingForResponse(true);
    
    setTimeout(() => {
      setShowDigit(false);
    }, stimulusDuration);
    
    trialTimeoutRef.current = setTimeout(() => {
      if (handleTrialEndRef.current) {
        handleTrialEndRef.current();
      }
    }, responseWindow);
  };

  const startTask = () => {
    setTaskState('active');
    setTrialCount(1);
    setResults([]);
    startTrial();
  };

  useEffect(() => {
    const handleTrialEnd = () => {
      const digit = currentTrialRef.current;
      const responded = hasRespondedRef.current;
      const responseTime = responded ? Date.now() - trialStartTimeRef.current : null;
      
      setIsWaitingForResponse(false);
      setShowDigit(false);
      
      recordTrialResult(digit, responded, responseTime);
      
      if (trialCount >= maxTrials) {
        setTaskState('completed');
      } else {
        setTimeout(() => {
          setTrialCount(prev => prev + 1);
          startTrial();
        }, 500);
      }
    };

    // Store the function in ref for external access
    handleTrialEndRef.current = handleTrialEnd;

    const handleKeyPress = (e) => {
      if (e.code === 'Space' && taskState === 'active' && isWaitingForResponse && !hasRespondedRef.current) {
        e.preventDefault();
        hasRespondedRef.current = true;
        
        if (trialTimeoutRef.current) {
          clearTimeout(trialTimeoutRef.current);
          handleTrialEnd();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  });

  const completeTask = () => {
    const goTrials = results.filter(r => !r.isNoGo);
    const noGoTrials = results.filter(r => r.isNoGo);
    
    const hits = results.filter(r => r.responseType === 'hit').length;
    const omissionErrors = results.filter(r => r.responseType === 'omission_error').length;
    const commissionErrors = results.filter(r => r.responseType === 'commission_error').length;
    const correctRejections = results.filter(r => r.responseType === 'correct_rejection').length;
    
    const hitRate = goTrials.length > 0 ? (hits / goTrials.length) * 100 : 0;
    const falseAlarmRate = noGoTrials.length > 0 ? (commissionErrors / noGoTrials.length) * 100 : 0;
    const correctResponses = results.filter(r => r.isCorrect).length;
    const accuracy = results.length > 0 ? (correctResponses / results.length) * 100 : 0;
    
    const hitTrials = results.filter(r => r.responseType === 'hit' && r.responseTime);
    const meanRT = hitTrials.length > 0 ? 
      hitTrials.reduce((sum, r) => sum + r.responseTime, 0) / hitTrials.length : 0;

    const taskResults = {
      sessionId: sessionId,
      taskType: 'SART',
      results: results,
      summary: {
        totalTrials: results.length,
        goTrials: goTrials.length,
        noGoTrials: noGoTrials.length,
        hits: hits,
        omissionErrors: omissionErrors,
        commissionErrors: commissionErrors,
        correctRejections: correctRejections,
        hitRate: Math.round(hitRate * 100) / 100,
        falseAlarmRate: Math.round(falseAlarmRate * 100) / 100,
        accuracy: Math.round(accuracy * 100) / 100,
        meanResponseTime: Math.round(meanRT),
        completedAt: new Date().toISOString()
      }
    };
    
    console.log('SART Results:', taskResults);
    onTaskComplete();
  };

  if (taskState === 'instructions') {
    return (
      <div className="procedure-instructions">
        <h4>Sustained Attention to Response Task (SART)</h4>
        <div className="instruction-content">
          <p><strong>This is a Go/No-Go task:</strong></p>
          <ul>
            <li>You will see single digits (0-9) appearing one at a time</li>
            <li><strong>GO trials:</strong> Press SPACEBAR for all digits <strong>EXCEPT {targetDigit}</strong></li>
            <li><strong>NO-GO trial:</strong> When you see <strong>{targetDigit}</strong>, do NOT press the spacebar</li>
            <li>Respond as quickly as possible for GO trials</li>
            <li>Withhold your response for NO-GO trials (when you see {targetDigit})</li>
            <li>You will see {maxTrials} digits total</li>
            <li>Stay alert and focused throughout the task</li>
          </ul>
          <p><strong>Remember:</strong> Press SPACEBAR for all digits EXCEPT {targetDigit}</p>
        </div>
        <button onClick={startTask} className="start-task-btn">
          Start SART Task
        </button>
      </div>
    );
  }

  if (taskState === 'active') {
    return (
      <div className="sart-task-container">
        <div className="sart-header">
          <div className="trial-info">Trial {trialCount} of {maxTrials}</div>
        </div>

        <div className="sart-stimulus-area">
          {showDigit ? (
            <div className="digit-display">
              <span className={`digit ${currentDigit === targetDigit ? 'target no-go' : 'non-target go'}`}>
                {currentDigit}
              </span>
            </div>
          ) : (
            <div className="digit-display">
              <span className="placeholder">+</span>
            </div>
          )}
        </div>


      </div>
    );
  }

  if (taskState === 'completed') {
    return (
      <div className="task-summary">
        <h3>SART Task Complete!</h3>
        <div className="results-summary">
          <p>Thank you for completing the Sustained Attention to Response Task.</p>
        </div>
        <button onClick={completeTask} className="complete-task-btn">
          Continue
        </button>
      </div>
    );
  }

  return null;
}

export default SARTComponent;