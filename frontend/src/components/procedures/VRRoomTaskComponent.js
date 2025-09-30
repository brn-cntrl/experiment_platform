import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ProcedureComponents.css';
import { recordTaskAudio, playBeep, setEventMarker, setCondition } from '../utils/helpers';

function VRRoomTaskComponent({ 
  procedure, 
  sessionId, 
  onTaskComplete
}) {
  const [taskState, setTaskState] = useState('instructions');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sectionStatus, setSectionStatus] = useState({
    audio1: '',
    audio2: '',
    audio3: '',
    audio4: ''
  });

  // Audio refs
  const audioRefs = {
    player1: useRef(null),
    player2: useRef(null),
    player3: useRef(null),
    player4: useRef(null)
  };

  // Constants
  const ANSWER_PERIOD = 90000; // 90 seconds
  const BEEP_ALERT_PERIOD = 75000; // 75 seconds (90 - 15)

  // Task control functions
  const startTask = useCallback(() => {
    setTaskState('active');
    setTimeElapsed(0);
  }, []);

  const completeTask = useCallback(() => {
    const taskResults = {
      sessionId: sessionId,
      taskType: 'VRRoomTask',
      results: {
        timeToSetup: timeElapsed,
        completedAt: new Date().toISOString(),
        status: 'completed'
      }
    };
    console.log('VR Room Task Results:', taskResults);
    onTaskComplete();
  }, [sessionId, timeElapsed, onTaskComplete]);

  // Timer for elapsed time
  useEffect(() => {
    let timer;
    if (taskState === 'active') {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [taskState]);

  // Setup audio event listeners
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (taskState !== 'active') return;

    const eventMarker = localStorage.getItem('currentEventMarker');
    const condition = localStorage.getItem('currentCondition');

    // Check for required data
    if (!eventMarker || eventMarker === 'null' || eventMarker === 'undefined' || 
        !condition || condition === 'null' || condition === 'undefined') {
      alert('No condition found for task. Please go back to the main interface and select a condition.');
      return;
    }

    // Set up audio event listeners
    const setupAudioListeners = () => {
      const player1 = audioRefs.player1.current;
      const player2 = audioRefs.player2.current;
      const player3 = audioRefs.player3.current;
      const player4 = audioRefs.player4.current;

      // Player 1 - Intro
      const handlePlayer1Play = () => {
        setSectionStatus(prev => ({ ...prev, audio1: 'Introduction is now playing...' }));
      };

      const handlePlayer1Ended = () => {
        setSectionStatus(prev => ({ ...prev, audio1: '60 second timer has started.' }));
        setTimeout(() => {
          player2.play();
          setSectionStatus(prev => ({ ...prev, audio1: 'Section finished.' }));
        }, 60000);
      };

      // Player 2 - Instructions
      const handlePlayer2Play = () => {
        setSectionStatus(prev => ({ ...prev, audio2: 'Instructions are now playing...' }));
      };

      const handlePlayer2Ended = () => {
        setTimeout(() => {
          player3.play();
          setSectionStatus(prev => ({ ...prev, audio2: 'Section finished.' }));
        }, 2000);
      };

      // Player 3 - Question 1
      const handlePlayer3Play = () => {
        setSectionStatus(prev => ({ ...prev, audio3: 'Question 1 is now playing...' }));
      };

      const handlePlayer3Ended = () => {
        setSectionStatus(prev => ({ ...prev, audio3: 'Recording started... 90 second timer started.' }));
        
        // Start recording and play beep
        if (recordTaskAudio) {
          recordTaskAudio(eventMarker, condition, 'start', 1, 
            (msg) => setSectionStatus(prev => ({ ...prev, audio3: msg })));
        }
        if (playBeep) playBeep();

        // Set up warning beeps
        setTimeout(() => {
          let beepCount = 0;
          const interval = setInterval(() => {
            if (playBeep) playBeep();
            beepCount++;
            if (beepCount === 2) {
              clearInterval(interval);
            }
          }, 500);
        }, BEEP_ALERT_PERIOD);

        // Stop recording and move to next question
        setTimeout(() => {
          if (recordTaskAudio) {
            recordTaskAudio(eventMarker, condition, 'stop', 1, 
              (msg) => setSectionStatus(prev => ({ ...prev, audio3: msg })));
          }
          player4.play();
        }, ANSWER_PERIOD);
      };

      // Player 4 - Question 2
      const handlePlayer4Play = () => {
        setSectionStatus(prev => ({ ...prev, audio4: 'Question 2 is now playing...' }));
      };

      const handlePlayer4Ended = () => {
        setSectionStatus(prev => ({ ...prev, audio4: 'Recording started... 90 second timer started.' }));
        
        // Start recording and play beep
        if (recordTaskAudio) {
          recordTaskAudio(eventMarker, condition, 'start', 2, 
            (msg) => setSectionStatus(prev => ({ ...prev, audio4: msg })));
        }
        if (playBeep) playBeep();

        // Set up warning beeps
        setTimeout(() => {
          let beepCount = 0;
          const interval = setInterval(() => {
            if (playBeep) playBeep();
            beepCount++;
            if (beepCount === 2) {
              clearInterval(interval);
            }
          }, 1000);
        }, BEEP_ALERT_PERIOD);

        // Stop recording and complete task
        setTimeout(() => {
          if (recordTaskAudio) {
            recordTaskAudio(eventMarker, condition, 'stop', 2, 
              (msg) => setSectionStatus(prev => ({ ...prev, audio4: msg })));
          }
          if (setCondition) setCondition('None');
          if (setEventMarker) setEventMarker('subject_idle');
          setSectionStatus(prev => ({ ...prev, audio4: 'Recording has stopped. Task is complete.' }));
          
          // Auto-complete the task after a brief delay
          setTimeout(() => {
            completeTask();
          }, 2000);
        }, ANSWER_PERIOD);
      };

      // Add event listeners
      player1.addEventListener('play', handlePlayer1Play);
      player1.addEventListener('ended', handlePlayer1Ended);
      player2.addEventListener('play', handlePlayer2Play);
      player2.addEventListener('ended', handlePlayer2Ended);
      player3.addEventListener('play', handlePlayer3Play);
      player3.addEventListener('ended', handlePlayer3Ended);
      player4.addEventListener('play', handlePlayer4Play);
      player4.addEventListener('ended', handlePlayer4Ended);

      // Cleanup function
      return () => {
        player1.removeEventListener('play', handlePlayer1Play);
        player1.removeEventListener('ended', handlePlayer1Ended);
        player2.removeEventListener('play', handlePlayer2Play);
        player2.removeEventListener('ended', handlePlayer2Ended);
        player3.removeEventListener('play', handlePlayer3Play);
        player3.removeEventListener('ended', handlePlayer3Ended);
        player4.removeEventListener('play', handlePlayer4Play);
        player4.removeEventListener('ended', handlePlayer4Ended);
      };
    };

    const cleanup = setupAudioListeners();
    return cleanup;
  }, [taskState, audioRefs.player1, audioRefs.player2, audioRefs.player3, audioRefs.player4, completeTask]);

  // Instructions view
  if (taskState === 'instructions') {
    return (
      <div className="procedure-instructions">
        <h4>Room Observation Task</h4>
        <div className="instruction-content">
          <h5>Instructions</h5>
          <ul>
            <li>Ensure the subject is fitted with their microphone, airpods or headphones.</li>
            <li>When they are ready, press play on the introduction audio player.</li>
            <li>Each section is timed and will pause for responses automatically.</li>
            <li>Recording will also start and stop automatically.</li>
            <li>The subject will hear a "beep" to indicate that recording has started</li>
            <li>They will hear a short series of beeps 15 seconds before the time for each question is up.</li>
            <li>When the last notification indicates recording has stopped, the subject has finished the task.</li>
          </ul>
        </div>
        <button onClick={startTask} className="start-task-btn">
          Begin Room Observation Task
        </button>
      </div>
    );
  }

  // Active task view
  if (taskState === 'active') {
    return (
      <div className="room-observation-container">
        <h2>Room Observation Task</h2>
        
        {/* Audio 1 - Intro */}
        <div className="audio-section">
          <p><strong>Intro</strong></p>
          <audio controls ref={audioRefs.player1}>
            <source src="/static/room_observation_audio/1-Task1-Intro.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="audio-status">{sectionStatus.audio1}</div>
        </div>

        {/* Audio 2 - Instructions */}
        <div className="audio-section">
          <p><strong>Instructions</strong></p>
          <audio controls ref={audioRefs.player2}>
            <source src="/static/room_observation_audio/2-Task1-PostObservation.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="audio-status">{sectionStatus.audio2}</div>
        </div>

        {/* Audio 3 - Question 1 */}
        <div className="audio-section">
          <p><strong>Question 1</strong></p>
          <audio controls ref={audioRefs.player3}>
            <source src="/static/room_observation_audio/3-Task1-Q1.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="audio-status">{sectionStatus.audio3}</div>
        </div>

        {/* Audio 4 - Question 2 */}
        <div className="audio-section">
          <p><strong>Question 2</strong></p>
          <audio controls ref={audioRefs.player4}>
            <source src="/static/room_observation_audio/4-Task1-Q2.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="audio-status">{sectionStatus.audio4}</div>
        </div>

        <div className="task-info">
          <p>Time Elapsed: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</p>
        </div>
      </div>
    );
  }

  return null;
}

export default VRRoomTaskComponent;