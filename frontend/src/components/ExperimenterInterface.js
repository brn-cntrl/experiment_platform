import React, { useState, useEffect } from 'react';
import './ExperimenterInterface.css';
import { setDevice, fetchAudioDevices, setEventMarker } from './utils/helpers';
import PRSComponent from './procedures/PRSComponent';
import MainTaskComponent from './procedures/MainTaskComponent';

function PreTestInstructionsWizard({ 
  onClose, 
  onComplete, 
  launchSubjectInterface, 
  availableMetrics, 
  allowEventMarkers,
  currentSession,
  experimentData,
  // Shared state props
  emotiBitRunning,
  vernierRunning,
  selectedMicrophone,
  audioDevices,
  isLoadingDevices,
  audioTestStarted,
  audioTestCompleted,
  // Shared functions
  toggleEmotiBit,
  toggleVernier,
  handleMicrophoneChange,
  resetAudio,
  testAudio,
  startAudioTest
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [instructionSteps, setInstructionSteps] = useState({});
  const [instructionsLoading, setInstructionsLoading] = useState(true);
  const [instructionsError, setInstructionsError] = useState(null);

  useEffect(() => {
    const loadInstructionSteps = async () => {
      try {
        setInstructionsLoading(true);
        const response = await fetch('/instruction-steps.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load instruction steps: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setInstructionSteps(data);
        setInstructionsError(null);
      } catch (error) {
        console.error('Error loading instruction steps:', error);
        setInstructionsError(error.message);
        setInstructionSteps({});
      } finally {
        setInstructionsLoading(false);
      }
    };

    loadInstructionSteps();
  }, []);

  const getSensorSteps = () => {
    const sensorInstructions = instructionSteps['sensor-placement'];
    if (sensorInstructions && sensorInstructions.steps) {
      return sensorInstructions.steps;
    }
    return [];
  };

  const getConsentStep = () => {
    return {
      id: 'consent-form',
      title: 'Consent Form',
      description: 'Have participant complete the informed consent process'
    };
  };

  
  const getConsentFormConfig = () => {
    if (!experimentData?.procedures) return null;
    
    const consentProcedure = experimentData.procedures.find(proc => 
      proc.id === 'consent' || proc.name?.toLowerCase().includes('consent')
    );
    
    if (!consentProcedure) return null;
    
    // Check multiple possible locations for consent configuration
    const config = consentProcedure.configuration?.document || {};
    const wizardData = consentProcedure.wizardData || {};
    const rawConfig = wizardData.rawConfiguration?.document || {};
    
    // Return configuration with fallback chain
    return {
      consentMethod: config.consentMethod || wizardData.consentMethod || rawConfig.consentMethod,
      consentLink: config.consentLink || wizardData.consentLink || rawConfig.consentLink,
      consentFilePath: config.consentFilePath || wizardData.consentFilePath || rawConfig.consentFilePath,
      consentFile: config.consentFile || wizardData.consentFile || rawConfig.consentFile,
      // Include the entire procedure for passing to ConsentForm component
      procedure: consentProcedure
    };
  };

  const getAllSteps = () => {
    const consentStep = getConsentStep();
    const sensorSteps = getSensorSteps();
    return [consentStep, ...sensorSteps];
  };

  const steps = getAllSteps();
  const consentConfig = getConsentFormConfig();
  const isConsentStep = currentStep === 0;
  const isSettingsStep = currentStep >= steps.length;
  const currentStepData = isSettingsStep ? 
    { id: 'settings', title: 'Settings & Launch', description: 'Configure experiment settings and launch subject interface' } :
    steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const renderInstructionStep = (stepData) => {
    return (
      <div className="instruction-step-content">
        <div className="instruction-label">
          <h4>{stepData.label}</h4>
        </div>
        <div className="instruction-content">
          {stepData.content.split('\n').map((line, index) => (
            <p key={index} className={line.trim() === '' ? 'instruction-spacing' : 'instruction-line'}>
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  };

  const launchEmbeddedConsentForm = () => {
    if (!currentSession) {
      alert('No active session found');
      return;
    }
    
    // Open the subject interface in consent mode (will show ConsentForm component first)
    const consentUrl = `http://localhost:3000/subject?session=${currentSession}&mode=consent`;
    window.open(
      consentUrl, 
      'consent-form', 
      'width=900,height=700,left=500,top=100,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,status=no'
    );
  };

  const renderConsentStep = () => {
    const handleConsentLaunch = () => {
      if (!consentConfig) {
        alert('No consent form configuration found. Please configure the consent form in the experiment builder.');
        return;
      }

      // Check for external link first
      if (consentConfig.consentMethod === 'link' && consentConfig.consentLink) {
        // External link - open BOTH the external link AND the subject interface
        window.open(consentConfig.consentLink, 'consent-external', 'width=800,height=600,scrollbars=yes,resizable=yes');
        // Also launch subject interface showing participant form
        launchSubjectInterface();
      } else if (consentConfig.consentMethod === 'upload' && consentConfig.consentFilePath) {
        // Uploaded file - open BOTH the file AND the subject interface  
        window.open(`/consent-forms/${consentConfig.consentFilePath}`, 'consent-file', 'width=800,height=600,scrollbars=yes,resizable=yes');
        // Also launch subject interface showing participant form
        launchSubjectInterface();
      } else {
        // No external link or file - launch embedded consent form
        launchEmbeddedConsentForm();
      }
    };

    return (
      <div className="consent-step-content">
        <div className="instruction-step-content">
          <div className="instruction-label">
            <h4>Informed Consent Process</h4>
          </div>
          <div className="instruction-content">
            <p className="instruction-line">Before beginning the experiment, the participant must complete the informed consent process.</p>
            <p className="instruction-spacing"></p>
            <p className="instruction-line">1. Click the button below to open the consent form</p>
            <p className="instruction-line">2. Have the participant read through the entire consent form</p>
            <p className="instruction-line">3. Answer any questions the participant may have</p>
            <p className="instruction-line">4. Ensure the participant provides their consent before proceeding</p>
            <p className="instruction-spacing"></p>
            <p className="instruction-line"><strong>Note:</strong> The participant cannot be registered until consent is properly obtained.</p>
          </div>
        </div>
        
        <div className="consent-launch-section">
          <button 
            onClick={handleConsentLaunch}
            className="launch-consent-btn"
            disabled={!consentConfig}
          >
            Open Consent Form
          </button>
          {!consentConfig && (
            <small style={{ color: '#dc3545', marginTop: '8px', display: 'block' }}>
              ⚠️ No consent form configured. Please set up consent form in experiment builder.
            </small>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsStep = () => {
    return (
      <div className="launch-settings-content">
        <div className="settings-section">
          <h4>⚙️ Experiment Settings</h4>
          {/* <div className="launch-section">
            <h4>🖥️ Subject Interface</h4>
            <p>Launch the subject interface to begin the experiment</p> */}
            {/* <button 
              onClick={launchSubjectInterface} 
              className="launch-subject-btn"
            >
              🖥️ Launch Subject Interface
            </button> */}
          {/* </div> */}
          
          {(
            <div className="metric-control-group">
              <h5>EmotiBit (Biometrics)</h5>
              <button 
                onClick={toggleEmotiBit}
                className={emotiBitRunning ? 'stop-btn' : 'start-btn'}
                disabled={!allowEventMarkers}
              >
                {emotiBitRunning ? '⏹️ Stop Event Markers' : '▶️ Start Event Markers'}
              </button>
              {!allowEventMarkers && (
                <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                  ⚠️ Waiting for participant registration to enable event markers
                </small>
              )}
            </div>
          )}
          {availableMetrics.includes('respiratory') && (
            <div className="metric-control-group">
              <h5>Respiratory (Vernier Belt)</h5>
              <button 
                onClick={toggleVernier}
                className={vernierRunning ? 'stop-btn' : 'start-btn'}
                disabled={!allowEventMarkers}
              >
                {vernierRunning ? '⏹️ Stop Vernier Stream' : '▶️ Start Vernier Stream'}
              </button>
              {!allowEventMarkers && (
                <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                  ⚠️ Waiting for participant registration to enable streaming
                </small>
              )}
            </div>
          )}
          {availableMetrics.includes('audio_ser') && (
            <div className="metric-control-group">
              <h5>Audio Recording / SER</h5>
              <div className="audio-controls">
                <button onClick={testAudio}>🎤 Test Audio</button>
                <button onClick={resetAudio}>🔄 Reset Audio</button>
                <select 
                  value={selectedMicrophone} 
                  onChange={handleMicrophoneChange}
                  className="microphone-select"
                  disabled={isLoadingDevices}
                >
                  <option value="">
                    {isLoadingDevices ? 'Loading devices...' : 'Select Microphone'}
                  </option>
                  {audioDevices.map((device) => (
                    <option key={device.index} value={device.index}>
                      {device.name}
                    </option>
                  ))}
                </select>
                {audioDevices.length === 0 && !isLoadingDevices && (
                  <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                    No audio devices found. Please check your microphone connection.
                  </small>
                )}
              </div>
            </div>
          )}
          {/* Audio Test Section - only show if audio is required */}
          {availableMetrics.includes('audio_ser') && (
            <div className="metric-control-group">
              <h5>Audio System Test</h5>
              {!audioTestStarted ? (
                <button 
                  onClick={startAudioTest}
                  className="start-btn"
                  disabled={!allowEventMarkers}
                >
                  Test Subject Audio
                </button>
              ) : !audioTestCompleted ? (
                <div className="audio-test-panel">
                  <div className="test-instructions">
                    <p><strong>Audio Test In Progress</strong></p>
                    <p>Please instruct the subject to follow the directions on their screen.</p>
                    <div className="test-status">
                      <span className="status-dot active"></span>
                      Waiting for subject to complete audio test...
                    </div>
                  </div>
                </div>
              ) : (
                <div className="audio-test-completed">
                  <span className="test-complete-icon">✅</span>
                  <span>Audio test completed successfully</span>
                </div>
              )}
              {!allowEventMarkers && (
                <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                  ⚠️ Waiting for participant registration to enable audio test
                </small>
              )}
            </div>
          )}
          
        </div>
      </div>
    );
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-header">
          <div className="header-content">
            <h3>Pre-Test Setup Instructions</h3>
          </div>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {instructionsLoading ? (
          <div className="wizard-content">
            <div className="loading-state">
              <p>Loading instruction steps...</p>
            </div>
          </div>
        ) : instructionsError ? (
          <div className="wizard-content">
            <div className="error-state">
              <p>⚠️ Failed to load instruction steps: {instructionsError}</p>
              <p>Using fallback configuration mode.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="wizard-breadcrumbs">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`breadcrumb ${index === currentStep ? 'active' : ''} ${
                    index < currentStep ? 'completed' : ''
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <span className="breadcrumb-number">{index + 1}</span>
                  <span className="breadcrumb-title">{step.title}</span>
                </div>
              ))}
              <div
                className={`breadcrumb ${isSettingsStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(steps.length)}
              >
                <span className="breadcrumb-number">{steps.length + 1}</span>
                <span className="breadcrumb-title">Settings</span>
              </div>
            </div>

            <div className="wizard-content">
              <h3>{currentStepData.title}</h3>
              {currentStepData.description && <p>{currentStepData.description}</p>}
              
              {isSettingsStep ? (
                renderSettingsStep()
              ) : isConsentStep ? (
                renderConsentStep()
              ) : (
                renderInstructionStep(currentStepData)
              )}
            </div>

            <div className="wizard-footer">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="wizard-btn secondary"
              >
                ← Previous
              </button>
              
              <span className="step-indicator">
                Step {currentStep + 1} of {steps.length + 1}
              </span>
              
              {isSettingsStep ? (
                <button 
                  onClick={handleComplete} 
                  className="wizard-btn primary"
                >
                  Complete Configuration
                </button>
              ) : (
                <button onClick={handleNext} className="wizard-btn primary">
                  Next →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProcedureInstructionWizard({ 
  procedure, 
  onClose, 
  onSkip, 
  onComplete 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [instructionSteps, setInstructionSteps] = useState({});
  const [instructionsLoading, setInstructionsLoading] = useState(true);
  const [instructionsError, setInstructionsError] = useState(null);

  useEffect(() => {
    const loadInstructionSteps = async () => {
      try {
        setInstructionsLoading(true);
        const response = await fetch('/instruction-steps.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load instruction steps: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setInstructionSteps(data);
        setInstructionsError(null);
      } catch (error) {
        console.error('Error loading instruction steps:', error);
        setInstructionsError(error.message);
        setInstructionSteps({});
      } finally {
        setInstructionsLoading(false);
      }
    };

    loadInstructionSteps();
  }, []);

  const getSteps = () => {
    const procedureInstructions = instructionSteps[procedure.id];
    if (procedureInstructions && procedureInstructions.steps) {
      return procedureInstructions.steps;
    }
    
    return [{
      id: 'generic',
      title: 'Procedure Instructions',
      label: procedure.name,
      content: `Follow the standard protocol for ${procedure.name}.\n\nRefer to your experiment documentation for specific details.`
    }];
  };

  const steps = getSteps();
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderInstructionStep = (stepData) => {
    return (
      <div className="instruction-step-content">
        <div className="instruction-label">
          <h4>{stepData.label}</h4>
        </div>
        <div className="instruction-content">
          {stepData.content.split('\n').map((line, index) => (
            <p key={index} className={line.trim() === '' ? 'instruction-spacing' : 'instruction-line'}>
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        <div className="wizard-header">
          <div className="header-content">
            <h3>📝 Instructions: {procedure.name}</h3>
          </div>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {instructionsLoading ? (
          <div className="wizard-content">
            <div className="loading-state">
              <p>Loading instruction steps...</p>
            </div>
          </div>
        ) : instructionsError ? (
          <div className="wizard-content">
            <div className="error-state">
              <p>⚠️ Failed to load instruction steps: {instructionsError}</p>
              <p>Using fallback instructions.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="wizard-breadcrumbs">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`breadcrumb ${index === currentStep ? 'active' : ''} ${
                    index < currentStep ? 'completed' : ''
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <span className="breadcrumb-number">{index + 1}</span>
                  <span className="breadcrumb-title">{step.title}</span>
                </div>
              ))}
            </div>

            <div className="wizard-content">
              <h3>{currentStepData.title}</h3>
              
              {renderInstructionStep(currentStepData)}
            </div>

            <div className="wizard-footer">
              <div className="left-buttons">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="wizard-btn secondary"
                >
                  ← Previous
                </button>
                
                <button
                  onClick={onSkip}
                  className="wizard-btn secondary skip-btn"
                >
                  ⏭️ Skip Instructions
                </button>
              </div>
              
              <span className="step-indicator">
                Step {currentStep + 1} of {steps.length}
              </span>
              
              {isLastStep ? (
                <button onClick={onComplete} className="wizard-btn primary">
                  ✅ Complete & Start Procedure
                </button>
              ) : (
                <button onClick={handleNext} className="wizard-btn primary">
                  Next →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ 
  isOpen, 
  onClose, 
  availableMetrics, 
  allowEventMarkers, 
  launchSubjectInterface, 
  currentSession,
  // Shared state props
  emotiBitRunning,
  vernierRunning,
  selectedMicrophone,
  audioDevices,
  isLoadingDevices,
  // Shared functions
  toggleEmotiBit,
  toggleVernier,
  handleMicrophoneChange,
  resetAudio,
  testAudio,
  // Add these new props
  openEmotibitFilePicker,
  uploadEmotibitStatus,
  emotibitFilePath
}) {
  const [audioProcessingStatus, setAudioProcessingStatus] = useState('');
  const [audioProcessingPath, setAudioProcessingPath] = useState('');

  const processAudioFiles = async () => {
    setAudioProcessingStatus('Processing audio files, this might take a while...');
    setAudioProcessingPath('');
    
    try {
      const response = await fetch('/process_audio_files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.message) {
        setAudioProcessingStatus(data.message);
        if (data.path) {
          setAudioProcessingPath(`Transcription/SER CSV location: ${data.path}`);
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('Error processing audio files:', error);
      setAudioProcessingStatus('Error processing audio files.');
      setAudioProcessingPath('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h3>⚙️ Tools</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="launch-settings-content">
          <div className="settings-section">
            {(
              <div className="metric-control-group">
                <h5>EmotiBit (Biometrics)</h5>
                <button 
                  onClick={toggleEmotiBit}
                  className={emotiBitRunning ? 'stop-btn' : 'start-btn'}
                  disabled={!allowEventMarkers}
                >
                  {emotiBitRunning ? '⏹️ Stop Event Markers' : '▶️ Start Event Markers'}
                </button>
              </div>
            )}
            
            {availableMetrics.includes('audio_ser') && (
              <div className="metric-control-group">
                <h5>Audio Recording / SER</h5>
                <div className="audio-controls">
                  <button onClick={testAudio}>🎤 Test Audio</button>
                  <button onClick={resetAudio}>🔄 Reset Audio</button>
                  <select 
                    value={selectedMicrophone} 
                    onChange={handleMicrophoneChange}
                    className="microphone-select"
                    disabled={isLoadingDevices}
                  >
                    <option value="">
                      {isLoadingDevices ? 'Loading devices...' : 'Select Microphone'}
                    </option>
                    {audioDevices.map((device) => (
                      <option key={device.index} value={device.index}>
                        {device.name}
                      </option>
                    ))}
                  </select>
                  {audioDevices.length === 0 && !isLoadingDevices && (
                    <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                      No audio devices found. Please check your microphone connection.
                    </small>
                    )}
                </div>
              </div>
            )}
            
            {availableMetrics.includes('respiratory') && (
              <div className="metric-control-group">
                <h5>Respiratory (Vernier Belt)</h5>
                <button 
                  onClick={toggleVernier}
                  className={vernierRunning ? 'stop-btn' : 'start-btn'}
                >
                  {vernierRunning ? '⏹️ Stop Vernier Stream' : '▶️ Start Vernier Stream'}
                </button>
              </div>
            )}

            <div className="metric-control-group">
              <h5>Emotibit Ground Truth Data</h5>
              <p className="emotibit-description">
                To import the ground truth data from the EmotiBit, first transfer the csv file from the EmotiBit SD card.
                Once imported, the csv file will be renamed to indicate the subject ID and copied into the subject data folder.
              </p>
              
              <button
                onClick={openEmotibitFilePicker}
                className="import-emotibit-btn"
              >
                Import EmotiBit Data
              </button>
              
              {uploadEmotibitStatus && (
                <div className="emotibit-upload-status">
                  {uploadEmotibitStatus}
                </div>
              )}
              
              {emotibitFilePath && (
                <div className="emotibit-file-path">
                  {emotibitFilePath}
                </div>
              )}
            </div>

            <div className="metric-control-group">
              <h5>Audio File Processing</h5>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 10px 0' }}>
                Process all audio files in the subject's folder for transcription and Speech Emotion Recognition (SER). 
                This will create a CSV file with transcriptions and emotion predictions for all recorded audio.
              </p>
              
              <button
                onClick={processAudioFiles}
                className="process-audio-btn"
              >
                Process Audio Files
              </button>
              
              {audioProcessingStatus && (
                <div className="audio-processing-status">
                  {audioProcessingStatus}
                </div>
              )}
              
              {audioProcessingPath && (
                <div className="audio-processing-path">
                  {audioProcessingPath}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolPanel({ isOpen, onToggle, currentProcedure, experimentData, currentProcedureIndex, sessionId, onTaskComplete }) {
  const isPRSProcedure = currentProcedure && currentProcedure.id === 'prs';
  const isMainTaskProcedure = currentProcedure && currentProcedure.id === 'main-task';
  
  const getPRSSequenceNumber = (currentProcedureIndex, experimentData) => {
    if (!experimentData?.procedures) return 1;
    
    const prsCount = experimentData.procedures
      .slice(0, currentProcedureIndex + 1)
      .filter(proc => proc.id === 'prs').length;
    
    return prsCount;
  };

  const getQuestionSet = () => {
    if (currentProcedure?.id === 'prs') {
      return currentProcedure.configuration?.['question-set']?.questionSet || 'prs_1';
    } else if (currentProcedure?.id === 'main-task') {
      return currentProcedure.configuration?.['question-set']?.questionSet || 'main_task_1';
    }
    return undefined;
  };

  return (
    <div className={`tool-panel ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="tool-panel-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Close tool panel' : 'Open tool panel'}
      >
        <span className={`toggle-icon ${isOpen ? 'open' : 'closed'}`}>
          {isOpen ? '×' : '+'}
        </span>
      </button>
      
      {isOpen && (
        <div className="tool-panel-content">
          <h3>Tools</h3>
          
          {isPRSProcedure && (
            <div className="prs-panel-section">
              <h4>PRS Task Control</h4>
              <PRSComponent
                questionSet={getQuestionSet()}
                procedure={currentProcedure}
                prsSequenceNumber={getPRSSequenceNumber(currentProcedureIndex, experimentData)}
                sessionId={sessionId}
                onTaskComplete={onTaskComplete}
                isExperimenterMode={true}
              />
            </div>
          )}

          {isMainTaskProcedure && (
            <div className="main-task-panel-section">
              <h4>Main Task Control</h4>
              <MainTaskComponent
                questionSet={getQuestionSet()}
                procedure={currentProcedure}
                sessionId={sessionId}
                onTaskComplete={onTaskComplete}
                isExperimenterMode={true}
              />
            </div>
          )}
          
          <div className="tool-section">
            {/* Other tool content can go here */}
          </div>
        </div>
      )}
    </div>
  );
}

function ExperimenterInterface() {
  const [currentSession, setCurrentSession] = useState(null);
  const [currentProcedure, setCurrentProcedure] = useState(0);
  const [sessionStatus, setSessionStatus] = useState('waiting');
  const [experimentData, setExperimentData] = useState(null);
  const [completedProcedures, setCompletedProcedures] = useState([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showPreTestInstructions, setShowPreTestInstructions] = useState(false);
  const [showProcedureInstructions, setShowProcedureInstructions] = useState(false);
  const [selectedProcedureForInstructions, setSelectedProcedureForInstructions] = useState(null);
  const [preTestCompleted, setPreTestCompleted] = useState(false);
  const [participantRegistered, setParticipantRegistered] = useState(false);
  const [showSetupForm, setShowSetupForm] = useState(true);
  const [isToolPanelOpen, setIsToolPanelOpen] = useState(false);
  const [setupData, setSetupData] = useState({
    experimentName: '',
    trialName: ''
  });
  const [setupErrors, setSetupErrors] = useState({});
  const [sessionInfo, setSessionInfo] = useState(null);

  // Shared device/system state
  const [emotiBitRunning, setEmotiBitRunning] = useState(false);
  const [vernierRunning, setVernierRunning] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [audioTestStarted, setAudioTestStarted] = useState(false);
  const [audioTestCompleted, setAudioTestCompleted] = useState(false);

  const [uploadEmotibitStatus, setUploadEmotibitStatus] = useState('');
  const [emotibitFilePath, setEmotibitFilePath] = useState('');

  const selectEmotibitFile = async (event) => {
    console.log('selectEmotibitFile called', event);
    
    if (!event || !event.target) {
      console.error('Event or event.target is null');
      setUploadEmotibitStatus("Error: Invalid event");
      return;
    }

    const files = event.target.files;
    if (!files) {
      console.error('event.target.files is null');
      setUploadEmotibitStatus("Error: Cannot access files");
      return;
    }

    if (files.length === 0) {
      setUploadEmotibitStatus("No files selected");
      return;
    }

    setUploadEmotibitStatus(`Uploading ${files.length} file(s)...`);
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('emotibit_file', file);

      try {
        setUploadEmotibitStatus(`Uploading file ${i + 1} of ${files.length}: ${file.name}`);
        
        const response = await fetch('/import_emotibit_csv', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (data && data.message) {
          results.push({
            filename: file.name,
            success: true,
            message: data.message,
            filePath: data.file_path
          });
          successCount++;
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          message: `Error uploading ${file.name}: ${error.message}`
        });
        errorCount++;
      }
    }

    const summaryMessage = `Upload complete: ${successCount} successful, ${errorCount} failed`;
    setUploadEmotibitStatus(summaryMessage);
    
    if (results.some(r => r.success && r.filePath)) {
      const successfulPaths = results
        .filter(r => r.success && r.filePath)
        .map(r => `${r.filename}: ${r.filePath}`)
        .join('\n');
      setEmotibitFilePath(`EmotiBit CSV Locations:\n${successfulPaths}`);
    }

    console.log('Upload results:', results);
  };

  const openEmotibitFilePicker = () => {
    document.getElementById('main-emotibit-file-input').click();
  };

  useEffect(() => {
    console.log('First useEffect called');
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    console.log('URL search params:', window.location.search);
    console.log('Extracted sessionId:', sessionId);
    
    if (sessionId) {
      console.log('Setting currentSession to:', sessionId);
      setCurrentSession(sessionId);
      setSessionStatus('ready');
      loadExperimentData(sessionId);
      loadSessionInfo(sessionId);
    } else {
      console.log('No sessionId found in URL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load audio devices when session is set and audio is needed
useEffect(() => {
  console.log('=== AUDIO DETECTION DEBUG ===');
  console.log('currentSession:', currentSession);
  console.log('experimentData:', experimentData);
  console.log('experimentData.procedures:', experimentData?.procedures);
  
  if (!currentSession || !experimentData || !experimentData.procedures) {
    console.log('Early return - missing data');
    console.log('  currentSession exists:', !!currentSession);
    console.log('  experimentData exists:', !!experimentData);
    console.log('  procedures exist:', !!experimentData?.procedures);
    return;
  }
  
  // Check if audio is needed by examining all procedures
  const needsAudio = experimentData.procedures.some(proc => {
    console.log('Checking procedure:', proc.name, 'id:', proc.id);
    console.log('  configuration:', proc.configuration);
    console.log('  wizardData:', proc.wizardData);
    
    if (proc.id === 'prs' || proc.name.toLowerCase().includes('perceived restorativeness')) {
      console.log('  AUDIO NEEDED: PRS procedure');
      return true;
    }

    if (proc.id === 'main-task' || proc.name.toLowerCase().includes('main experimental task')) {
      console.log('  AUDIO NEEDED: Main Task procedure');
      return true;
    }

    // Check for audio in task descriptions
    if (proc.configuration?.["task-description"]?.selectedTasks) {
      const tasks = proc.configuration["task-description"].selectedTasks;
      console.log('  task-description tasks:', tasks);
      if (tasks.some(task => task.includes('Audio'))) {
        console.log('  AUDIO NEEDED: task-description contains Audio');
        return true;
      }
    }
    
    // Check for baseline recording or other audio procedures
    if (proc.wizardData?.recordingDuration || proc.id === 'baseline-recording') {
      console.log('  AUDIO NEEDED: wizardData.recordingDuration or baseline-recording');
      return true;
    }
    
    // Check for stressor types that need audio
    if (proc.configuration?.["stressor-type"]?.stressorType === "Mental Arithmetic Task") {
      console.log('  AUDIO NEEDED: Mental Arithmetic Task');
      return true;
    }
    if (proc.id === 'stressor' || proc.name.toLowerCase().includes('stress')) {
      console.log('  AUDIO NEEDED: stressor procedure');
      return true;
    }
    
    // Check for SER procedures
    if (proc.id === 'ser-baseline' || proc.name.toLowerCase().includes('ser baseline')) {
      console.log('  AUDIO NEEDED: SER baseline procedure');
      return true;
    }
    
    console.log('  No audio needed for this procedure');
    return false;
  });
  
    console.log('Final needsAudio result:', needsAudio);
    
    if (needsAudio) {
      console.log('Calling loadAudioDevices...');
      loadAudioDevices();
    } else {
      console.log('Audio not needed - not loading devices');
    }
    console.log('=== END AUDIO DETECTION DEBUG ===');
  }, [currentSession, experimentData]);

  useEffect(() => {
    if (!currentSession) return;

    console.log('Creating SSE connection for:', currentSession);
    
    const eventSource = new EventSource(`http://localhost:5001/api/sessions/${currentSession}/stream`);
    
    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      console.log("Update received:", data);
      
      if (data.event_type === 'task_completed' && data.session_id === currentSession) {
        console.log("Task completed:", data);
        setCompletedProcedures([...data.completed_procedures]);
        if (data.current_procedure !== undefined) {
          setCurrentProcedure(data.current_procedure);
        }
        
        if (data.task_type === 'audio_test') {
          console.log("Audio test completed:", data);
          setAudioTestCompleted(true);
        }
      }

      if (data.event_type === 'participant_registered' && data.session_id === currentSession) {
        setParticipantRegistered(true);
      }
    };

    eventSource.onerror = function(event) {
      console.error("SSE Error:", event);
    };

    return () => eventSource.close();
  }, [currentSession]);

  useEffect(() => {
      if (!currentSession || showSetupForm) return;

      const handleBeforeUnload = (event) => {
        const message = 'Are you sure you want to leave? Closing this window will abandon the experiment session and disconnect from participants.';
        event.preventDefault();
        event.returnValue = message; // For Chrome/Safari
        return message; // For other browsers
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [currentSession, showSetupForm]);

  useEffect(() => {
    // Auto-open tool panel for procedures that need experimenter control
    if (experimentData && experimentData.procedures && experimentData.procedures[currentProcedure]) {
      const procedure = experimentData.procedures[currentProcedure];
      
      if (procedure.id === 'prs' || procedure.id === 'main-task') {
        setIsToolPanelOpen(true);
        console.log(`Auto-opening tool panel for ${procedure.id} procedure`);
      }
    }
  }, [currentProcedure, experimentData]);

  // Shared functions
  const loadAudioDevices = async () => {
    setIsLoadingDevices(true);
    const result = await fetchAudioDevices();
    
    if (result.success) {
      setAudioDevices(result.devices);
      if (result.devices.length === 1) {
        const deviceIndex = result.devices[0].index.toString();
        setSelectedMicrophone(deviceIndex);
        await setDevice(deviceIndex);
      }
    } else {
      setAudioDevices([]);
    }
    setIsLoadingDevices(false);
  };

  const handleMicrophoneChange = async (e) => {
    const deviceIndex = e.target.value;
    setSelectedMicrophone(deviceIndex);
    if (deviceIndex) {
      const result = await setDevice(deviceIndex);
      if (!result.success) {
        console.error('Failed to set device: ', result.message);
      }
    }
  };

  const resetAudio = async () => {
    try {
      const response = await fetch('/reset_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      
      const data = await response.json();
      await loadAudioDevices();
      setSelectedMicrophone('');
      alert(data.message || 'Audio system reset successfully. Please select a microphone again.');
    } catch (error) {
      console.error('Error resetting audio:', error);
      alert('An error occurred while resetting the audio system.');
    }
  };

  const testAudio = () => {
    let beepCount = 0;
    const interval = setInterval(function() {
      playTestTone();
      beepCount++;
      if (beepCount === 3) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const playTestTone = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
    }, 500);
  };

  const toggleEmotiBit = async () => {
    const newState = !emotiBitRunning;
    const endpoint = newState ? 'start_event_manager' : 'stop_event_manager';
    
    try {
      const response = await fetch(`/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      setEmotiBitRunning(newState);
      console.log(`EmotiBit ${newState ? 'started' : 'stopped'}`);
      console.log('Server response:', data.message || data);
      
    } catch (error) {
      console.error(`Error ${newState ? 'starting' : 'stopping'} EmotiBit event manager:`, error);
      alert(`Failed to ${newState ? 'start' : 'stop'} EmotiBit event manager. Please try again.`);
    }
  };

  const toggleVernier = () => {
    setVernierRunning(!vernierRunning);
    console.log(`Vernier stream ${!vernierRunning ? 'started' : 'stopped'}`);
  };

  const startAudioTest = async () => {
    if (!currentSession) {
      alert('No active session found');
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession}/trigger-audio-test`, {
        method: 'POST'
      });

      if (response.ok) {
        setAudioTestStarted(true);
        console.log('Audio test started for subject');
      } else {
        console.error('Failed to start audio test');
        alert('Failed to start audio test. Please try again.');
      }
    } catch (error) {
      console.error('Error starting audio test:', error);
      alert('Error starting audio test. Please try again.');
    }
  };

  const loadSessionInfo = async (sessionId) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/info`);
      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data.session_data);
        setParticipantRegistered(data.session_data.has_participant_info || false);
        
        if (data.session_data.experiment_folder_name && data.session_data.trial_name) {
          setShowSetupForm(false);
          setSetupData({
            experimentName: data.session_data.experiment_folder_name,
            trialName: data.session_data.trial_name
          });
        }
      }
    } catch (error) {
      console.error('Error loading session info:', error);
    }
  };

  const loadExperimentData = async (sessionId) => {
    try {
      const parts = sessionId.split('_');
      const experimentId = parts.slice(0, -2).join('_');
      
      const response = await fetch(`/api/experiments/${experimentId}`);
      if (response.ok) {
        const data = await response.json();
        setExperimentData(data);
        
        if (data.name && !setupData.experimentName) {
          setSetupData(prev => ({
            ...prev,
            experimentName: data.name
          }));
        }
      }
    } catch (error) {
      console.error('Error loading experiment data:', error);
    }
  };

  const handleSetupInputChange = (e) => {
    const { name, value } = e.target;
    setSetupData(prev => ({
      ...prev,
      [name]: value
    }));
    if (setupErrors[name]) {
      setSetupErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateSetupForm = () => {
    const errors = {};
    
    if (!setupData.experimentName.trim()) {
      errors.experimentName = 'Experiment name is required';
    }
    
    if (!setupData.trialName.trim()) {
      errors.trialName = 'Trial name is required';
    }
    
    return errors;
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateSetupForm();
    if (Object.keys(errors).length > 0) {
      setSetupErrors(errors);
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession}/set-experiment-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experiment_name: setupData.experimentName,
          trial_name: setupData.trialName
        })
      });

      if (response.ok) {
        console.log('Experiment and trial names set successfully');
        setShowSetupForm(false);
        loadSessionInfo(currentSession); 
      } else {
        const errorData = await response.json();
        console.error('Error setting experiment/trial:', errorData);
        alert('Error setting experiment and trial names. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting setup form:', error);
      alert('Error submitting setup form. Please try again.');
    }
  };

  const launchSubjectInterface = () => {
    if (currentSession) {
      const subjectUrl = `http://localhost:3000/subject?session=${currentSession}`;
      window.open(
        subjectUrl, 
        'subject', 
        'width=1200,height=800,left=1400,top=0,resizable=yes,scrollbars=no'
      );
    }
  };

  const jumpToProcedure = async (index) => {
    console.log('=== JUMP TO PROCEDURE ===');
    console.log('Trying to jump to index:', index);
    console.log('Current procedure:', currentProcedure);
    console.log('Completed procedures:', completedProcedures);
    
    const filteredProcedures = experimentData.procedures.filter(
      procedure => procedure.id !== 'consent' && !procedure.name?.toLowerCase().includes('consent')
    );
    
    const actualIndex = experimentData.procedures.findIndex(proc => proc === filteredProcedures[index]);
  
    const canJump = actualIndex === currentProcedure || 
                  completedProcedures.includes(actualIndex) ||
                  (actualIndex > 0 && completedProcedures.includes(actualIndex - 1)) || // Can jump if previous procedure completed
                  (currentProcedure > 0 && actualIndex === currentProcedure + 1 && completedProcedures.includes(currentProcedure));
    
    console.log('Can jump to this procedure?', canJump);
    console.log('Actual procedure index:', actualIndex);
    console.log('Previous procedure completed?', actualIndex > 0 ? completedProcedures.includes(actualIndex - 1) : 'N/A');
    console.log('========================');
    
    if (canJump) {
      const procedure = experimentData.procedures[actualIndex];
      setSelectedProcedureForInstructions({...procedure, index: actualIndex});
      setShowProcedureInstructions(true);
    }
  };

  const handleProcedureInstructionsSkip = async () => {
    setShowProcedureInstructions(false);
    
    const index = selectedProcedureForInstructions.index;
    const procedureName = selectedProcedureForInstructions.name;

    setCurrentProcedure(index);
    console.log('Skipping instructions for procedure:', index, procedureName);
    
    if (selectedProcedureForInstructions.id !== 'prs') {
      setEventMarker(procedureName);
      console.log('Setting current event marker to:', index, procedureName);
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession}/set-current-procedure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_procedure: index,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('Procedure change sent to server');
      } else {
        console.error('Failed to notify server of procedure change');
      }
    } catch (error) {
      console.error('Error notifying server of procedure change:', error);
    }
  };

  const handleProcedureInstructionsComplete = async () => {
    setShowProcedureInstructions(false);
    
    const index = selectedProcedureForInstructions.index;
    const procedureName = selectedProcedureForInstructions.name;

    setCurrentProcedure(index);
    if (selectedProcedureForInstructions.id !== 'prs') {
      setEventMarker(procedureName);
      console.log('Setting current event marker to:', index, procedureName);
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession}/set-current-procedure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_procedure: index,
          procedure_name: procedureName,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('Procedure change sent to server');
      } else {
        console.error('Failed to notify server of procedure change');
      }
    } catch (error) {
      console.error('Error notifying server of procedure change:', error);
    }
  };

  const getCurrentProcedureInfo = () => {
    if (!experimentData || !experimentData.procedures || experimentData.procedures.length === 0) {
      return { name: 'No procedures', fullName: '', estimatedDuration: 0, selectedMetrics: [] };
    }
    
    // Filter out consent procedures - same filter you're already using
    const filteredProcedures = experimentData.procedures.filter(
      procedure => procedure.id !== 'consent' && !procedure.name?.toLowerCase().includes('consent')
    );
    
    if (filteredProcedures.length === 0) {
      return { name: 'No procedures', fullName: '', estimatedDuration: 0, selectedMetrics: [] };
    }
    
    // If current procedure is consent, show first non-consent procedure
    const currentProc = experimentData.procedures[currentProcedure];
    if (currentProc && (currentProc.id === 'consent' || currentProc.name?.toLowerCase().includes('consent'))) {
      return filteredProcedures[0];
    }
    
    // Find current procedure in filtered array
    const filteredIndex = filteredProcedures.findIndex(proc => proc === currentProc);
    return filteredIndex >= 0 ? filteredProcedures[filteredIndex] : filteredProcedures[0];
  };

  const isExperimentComplete = () => {
    if (!experimentData || !experimentData.procedures) return false;
    
    // Filter out consent procedures (same logic you're using elsewhere)
    const filteredProcedures = experimentData.procedures.filter(
      procedure => procedure.id !== 'consent' && !procedure.name?.toLowerCase().includes('consent')
    );
    
    // Check if all non-consent procedures are completed
    const allProcedureIndices = filteredProcedures.map(proc => 
      experimentData.procedures.findIndex(p => p === proc)
    );
    
    return allProcedureIndices.every(index => completedProcedures.includes(index));
  };

  const handleCompleteExperiment = async () => {
    if (!window.confirm('Are you sure you want to end this experiment? This will save all data and reset the system for a new experiment.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession}/complete-experiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          total_procedures: experimentData.procedures.length,
          completed_procedures: completedProcedures.length
        })
      });

      if (response.ok) {
        alert('Experiment completed successfully! The system has been reset.');
        
        // Try to navigate the opener window back to home (if it exists)
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.location.href = window.opener.location.origin;
          } catch (e) {
            // Cross-origin security might prevent this
            console.log('Could not navigate opener window');
          }
        }
        
        // Close this experimenter window
        window.close();
        
        // Fallback: if window.close() doesn't work (some browsers block it),
        // redirect to a "close this window" page
        setTimeout(() => {
          document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>Experiment Complete</h2><p>You can now close this window.</p></div>';
        }, 1000);
      } else {
        console.error('Error completing experiment');
        alert('Error completing experiment. Please check the console.');
      }
    } catch (error) {
      console.error('Error completing experiment:', error);
      alert('Error completing experiment. Please try again.');
    }
  };

  const getAllMetrics = () => {
    if (!experimentData || !experimentData.procedures) return [];
    
    const allMetrics = new Set();
    
    experimentData.procedures.forEach(proc => {
      if (proc.configuration?.sensors?.selectedSensors || proc.wizardData?.selectedSensors) {
        const sensors = proc.configuration?.sensors?.selectedSensors || proc.wizardData?.selectedSensors || [];
        
        sensors.forEach(sensor => {
          if (sensor.includes('Heart Rate') || sensor.includes('EEG') || sensor.includes('EDA')) {
            allMetrics.add('biometrics');
          }
          if (sensor.includes('Respiration')) {
            allMetrics.add('respiratory');
          }
        });
      }
      
      if (proc.id === 'prs' || proc.name.toLowerCase().includes('perceived restorativeness')) {
        allMetrics.add('audio_ser');
      }

      if (proc.id === 'main-task' || proc.name.toLowerCase().includes('main experimental task')) {
        allMetrics.add('audio_ser');
      }
      
      if (proc.configuration?.["task-description"]?.selectedTasks) {
        const tasks = proc.configuration["task-description"].selectedTasks;
        tasks.forEach(task => {
          if (task.includes('Audio')) {
            allMetrics.add('audio_ser');
          }
        });
      }
      
      if (proc.wizardData?.recordingDuration || proc.id === 'baseline-recording') {
        allMetrics.add('audio_ser');
      }
      
      if (proc.id === 'sensor-placement' || proc.name.toLowerCase().includes('sensor')) {
        allMetrics.add('biometrics');
      }

      if (proc.configuration?.["stressor-type"]?.stressorType === "Mental Arithmetic Task") {
        allMetrics.add('biometrics'); 
        allMetrics.add('audio_ser')
      }
      
      if (proc.id === 'stressor' || proc.name.toLowerCase().includes('stress')) {
        allMetrics.add('biometrics');
        allMetrics.add('audio_ser')
      }

      if (proc.id === 'ser-baseline' || proc.name.toLowerCase().includes('ser baseline')) {
        allMetrics.add('audio_ser');
      }
    });
    
    return Array.from(allMetrics);
  };

  const handlePreTestInstructionsComplete = () => {
    setPreTestCompleted(true);
  };

  const renderSetupForm = () => {
    return (
      <div className="setup-form-container">
        <div className="setup-header">
          <h2>Experiment Setup</h2>
          <p>Please specify the experiment and trial names for this session.</p>
          {currentSession && <p className="session-id">Session: {currentSession}</p>}
        </div>
        
        <form onSubmit={handleSetupSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="experimentName">Experiment Name *</label>
            <input
              type="text"
              id="experimentName"
              name="experimentName"
              value={setupData.experimentName}
              onChange={handleSetupInputChange}
              className={setupErrors.experimentName ? 'error' : ''}
              placeholder="e.g., meerkat, attention_study"
            />
            {setupErrors.experimentName && <span className="error-text">{setupErrors.experimentName}</span>}
            <small>This will be used as the folder name for organizing data</small>
          </div>

          <div className="form-group">
            <label htmlFor="trialName">Trial Name *</label>
            <input
              type="text"
              id="trialName"
              name="trialName"
              value={setupData.trialName}
              onChange={handleSetupInputChange}
              className={setupErrors.trialName ? 'error' : ''}
              placeholder="e.g., trial_1, baseline, condition_a"
            />
            {setupErrors.trialName && <span className="error-text">{setupErrors.trialName}</span>}
            <small>This will create a trial subfolder within the experiment folder</small>
          </div>

          <div className="form-actions">
            <button type="submit" className="setup-submit-btn">
              Set Experiment & Trial
            </button>
          </div>
        </form>
      </div>
    );
  };

  // const currentProcInfo = getCurrentProcedureInfo();
  const availableMetrics = getAllMetrics();

  if (showSetupForm) {
    return (
      <div className="experimenter-interface">
        {renderSetupForm()}
      </div>
    );
  }

  return (
    <div className="experimenter-interface">
      <input
        type="file"
        accept=".csv"
        multiple
        onChange={selectEmotibitFile}
        className="emotibit-file-input-hidden"
        id="main-emotibit-file-input"
        style={{ display: 'none' }}
      />
      <header className="experimenter-header">
        <div className="header-left">
          <h1>Experimenter Control Panel</h1>
          <div className="session-info">
            {currentSession ? (
             <span>Experiment: {experimentData?.name} | Trial: {sessionInfo?.trial_name || 'Loading...'} | Status: {sessionStatus}</span>
            ) : (
              <span>No active session</span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <button 
            className="hamburger-btn"
            onClick={() => setShowSettingsPanel(true)}
          >
            ☰ Settings
          </button>
        </div>
      </header>

      {experimentData && (
        <div className="experiment-info">
          <span>Estimated Duration: {experimentData.estimated_duration} minutes</span>
          {sessionInfo && (
            <div className="folder-info">
              <small>Folder: {sessionInfo.experiment_folder_name}/{sessionInfo.trial_name}</small>
            </div>
          )}
        </div>
      )}

      <div className={`content-area ${isToolPanelOpen ? 'with-tool-panel' : ''}`}>
        <div className="procedure-status">
          {experimentData ? (
            <div>
              <p><strong>Procedure {currentProcedure} of {experimentData.procedures.length - 1}</strong></p>
              <p><strong>{getCurrentProcedureInfo().name}</strong></p>
              <p>{getCurrentProcedureInfo().fullName}</p>
              <p>Duration: {getCurrentProcedureInfo().estimatedDuration} minutes</p>
              {getCurrentProcedureInfo().selectedMetrics && getCurrentProcedureInfo().selectedMetrics.length > 0 && (
                <p>Active Metrics: {getCurrentProcedureInfo().selectedMetrics.join(', ')}</p>
              )}
            </div>
          ) : (
            <p>Loading experiment data...</p>
          )}
          
          {sessionInfo && sessionInfo.has_participant_info && (
            <div className="participant-status">
              ✅ Participant registered
              {sessionInfo.subject_folder && (
                <small>Subject: {sessionInfo.subject_folder}</small>
              )}
            </div>
          )}
        </div>

        <div className="experiment-procedures">
          <h3>Pre-Test Setup</h3>
          <div className="config-procedures-block">
            <div className="config-header">
              <p>Complete pre-test setup before starting procedures</p>
            </div>
            <div className="config-actions">
              <button
                onClick={() => setShowPreTestInstructions(true)}
                className="config-procedures-btn"
                disabled={!experimentData?.procedures || experimentData.procedures.length === 0}
              >
                Start Pre-Test Setup
              </button>
              {preTestCompleted && (
                <span className="config-complete">✅ Pre-test setup complete</span>
              )}
            </div>
          </div>

          <h3>Experiment Procedures</h3>
          {experimentData && experimentData.procedures ? (
          <div className="procedure-list">
            {experimentData.procedures
              .filter(procedure => procedure.id !== 'consent' && !procedure.name?.toLowerCase().includes('consent'))
              .map((procedure, index) => {
                // Get the actual index for this procedure
                const actualIndex = experimentData.procedures.findIndex(proc => proc === procedure);
                
                // Use the same logic as jumpToProcedure for determining if button should be enabled
                const canAccess = actualIndex === currentProcedure || 
                                completedProcedures.includes(actualIndex) ||
                                (actualIndex > 0 && completedProcedures.includes(actualIndex - 1)) ||
                                (currentProcedure > 0 && actualIndex === currentProcedure + 1 && completedProcedures.includes(currentProcedure));
                
                const isDisabled = !preTestCompleted || !canAccess;
                
                return (
                  <div 
                    key={procedure.uniqueId || index}
                    className={`procedure-item ${
                      actualIndex === currentProcedure ? 'current' : 
                      completedProcedures.includes(actualIndex) ? 'completed' : 'future'
                    } ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => actualIndex !== currentProcedure ? jumpToProcedure(index) : null}
                  >
                    <div className="procedure-number">{index + 1}</div>
                    <div className="procedure-details">
                      <strong>{procedure.name}</strong>
                      <div className="procedure-meta">
                        {procedure.estimatedDuration || procedure.customDuration} min
                        {procedure.selectedMetrics && procedure.selectedMetrics.length > 0 && (
                          <span> • {procedure.selectedMetrics.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="procedure-actions">
                      <div className="procedure-status-icon">
                        {completedProcedures.includes(actualIndex) ? '✅' : 
                        actualIndex === currentProcedure ? '▶️' : '⏳'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p>No procedures loaded</p>
        )}
        {isExperimentComplete() && (
          <div className="experiment-completion-section">
            <div className="complete-message">
              <h4>Experiment Complete!</h4>
              <p>All procedures have been completed successfully.</p>
              
              <p>If it is available, please upload Biometric Ground Truth data before completing the experiment and resetting.</p>
              <ul>
                <li>Copy or move the EmotiBit CSV from the EmotiBit SD card to the desktop or somewhere you can find it</li>
                <li>Click "Import EmotiBit File" below and browse to that location</li>
                <li>More than one file may be selected.</li>
              </ul>
              <button
                onClick={openEmotibitFilePicker}
                className="complete-experiment-btn"
              > 
              Import EmotiBit File 
              </button><br />
              {uploadEmotibitStatus && (
                <div className="emotibit-upload-status" style={{ margin: '10px 0' }}>
                  {uploadEmotibitStatus}
                </div>
              )}

              {emotibitFilePath && (
                <div className="emotibit-file-path" style={{ margin: '10px 0', fontSize: '0.9em' }}>
                  {emotibitFilePath}
                </div>
              )}
              {/* <p>Data has been saved to: {sessionInfo?.experiment_folder_name}/{sessionInfo?.trial_name}</p> */}
              <button 
              onClick={handleCompleteExperiment}
              className="complete-experiment-btn"
              >
                ✅ Complete Experiment & Reset 
              </button>
            </div>
          </div>
        )}
        </div>
        <ToolPanel 
          isOpen={isToolPanelOpen} 
          onToggle={() => setIsToolPanelOpen(!isToolPanelOpen)}
          currentProcedure={experimentData?.procedures?.[currentProcedure]}
          experimentData={experimentData}
          currentProcedureIndex={currentProcedure}
          sessionId={currentSession}
          onTaskComplete={async () => {
            try {
              const response = await fetch(`/api/sessions/${currentSession}/complete-procedure`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  completed: true,
                  timestamp: new Date().toISOString()
                })
              });
              
              if (response.ok) {
                console.log('PRS task completion recorded from experimenter interface');
              } else {
                console.error('Error completing task from experimenter interface');
              }
            } catch (error) {
              console.error('Error recording task completion from experimenter interface:', error);
            }
          }}
        />
      </div>

      <SettingsPanel 
        isOpen={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        availableMetrics={availableMetrics}
        allowEventMarkers={participantRegistered}
        launchSubjectInterface={launchSubjectInterface}
        currentSession={currentSession}
        // Shared state
        emotiBitRunning={emotiBitRunning}
        vernierRunning={vernierRunning}
        selectedMicrophone={selectedMicrophone}
        audioDevices={audioDevices}
        isLoadingDevices={isLoadingDevices}
        // Shared functions
        toggleEmotiBit={toggleEmotiBit}
        toggleVernier={toggleVernier}
        handleMicrophoneChange={handleMicrophoneChange}
        resetAudio={resetAudio}
        testAudio={testAudio}
        // Add these new props
        openEmotibitFilePicker={openEmotibitFilePicker}
        uploadEmotibitStatus={uploadEmotibitStatus}
        emotibitFilePath={emotibitFilePath}
      />

      {showPreTestInstructions && (
        <PreTestInstructionsWizard
          onClose={() => setShowPreTestInstructions(false)}
          onComplete={handlePreTestInstructionsComplete}
          launchSubjectInterface={launchSubjectInterface}
          availableMetrics={availableMetrics}
          allowEventMarkers={participantRegistered}
          currentSession={currentSession}
          experimentData={experimentData}
          // Shared state
          emotiBitRunning={emotiBitRunning}
          vernierRunning={vernierRunning}
          selectedMicrophone={selectedMicrophone}
          audioDevices={audioDevices}
          isLoadingDevices={isLoadingDevices}
          audioTestStarted={audioTestStarted}
          audioTestCompleted={audioTestCompleted}
          // Shared functions
          toggleEmotiBit={toggleEmotiBit}
          toggleVernier={toggleVernier}
          handleMicrophoneChange={handleMicrophoneChange}
          resetAudio={resetAudio}
          testAudio={testAudio}
          startAudioTest={startAudioTest}
        />
      )}

      {showProcedureInstructions && selectedProcedureForInstructions && (
        <ProcedureInstructionWizard
          procedure={selectedProcedureForInstructions}
          onClose={() => setShowProcedureInstructions(false)}
          onSkip={handleProcedureInstructionsSkip}
          onComplete={handleProcedureInstructionsComplete}
        />
      )}
    </div>
  );
}

export default ExperimenterInterface;